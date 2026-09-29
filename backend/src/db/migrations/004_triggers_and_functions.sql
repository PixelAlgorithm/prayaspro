-- ====================================================================
-- PRAYASPRO TRIGGERS & STORED FUNCTIONS MIGRATION 004
-- Academic Requirement: Practical Demonstrable Procedural SQL & Integrity Triggers
-- ====================================================================

-- 1. Trigger Function: Automatically Update updated_at on Tasks Table
CREATE OR REPLACE FUNCTION trg_fn_update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_task_timestamp ON tasks;
CREATE TRIGGER trg_update_task_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trg_fn_update_task_timestamp();

-- 2. Trigger Function: Prevent Student from Applying to Their Own Task
CREATE OR REPLACE FUNCTION trg_fn_prevent_self_application()
RETURNS TRIGGER AS $$
DECLARE
    task_owner UUID;
BEGIN
    SELECT owner_id INTO task_owner FROM tasks WHERE task_id = NEW.task_id;
    
    IF task_owner = NEW.student_id THEN
        RAISE EXCEPTION 'Database Integrity Constraint: A student cannot apply to a task they own (Task ID: %, User ID: %)',
            NEW.task_id, NEW.student_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_self_application ON applications;
CREATE TRIGGER trg_prevent_self_application
BEFORE INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION trg_fn_prevent_self_application();

-- 3. Trigger Function: Prevent Applications to Non-OPEN Tasks
CREATE OR REPLACE FUNCTION trg_fn_validate_task_status_for_application()
RETURNS TRIGGER AS $$
DECLARE
    current_status VARCHAR(20);
BEGIN
    SELECT status INTO current_status FROM tasks WHERE task_id = NEW.task_id;
    
    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Task does not exist (Task ID: %)', NEW.task_id;
    END IF;
    
    IF current_status != 'OPEN' THEN
        RAISE EXCEPTION 'Application rejected: Task is not open for applications. Current status: %', current_status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_task_status ON applications;
CREATE TRIGGER trg_validate_task_status
BEFORE INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION trg_fn_validate_task_status_for_application();

-- 4. Stored Function: Calculate Average Rating and Review Count for a Student
CREATE OR REPLACE FUNCTION fn_calculate_student_rating(p_user_id UUID)
RETURNS TABLE(average_rating NUMERIC(3,2), total_reviews BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00)::NUMERIC(3,2) AS average_rating,
        COUNT(review_id)::BIGINT AS total_reviews
    FROM reviews
    WHERE reviewed_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Stored Function: Calculate Total Payout Earnings for a Student
CREATE OR REPLACE FUNCTION fn_calculate_student_earnings(p_user_id UUID)
RETURNS NUMERIC(10, 2) AS $$
DECLARE
    total_amount NUMERIC(10, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0.00)
    INTO total_amount
    FROM payments
    WHERE receiver_id = p_user_id AND payment_status = 'SUCCESS';
    
    RETURN total_amount;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Stored Function / Transaction: Accept Application & Assign Task
-- Performs atomic multi-table state transition:
-- Application status -> ACCEPTED
-- Other applications -> REJECTED
-- New assignment created -> ASSIGNED
-- Task status -> ASSIGNED
CREATE OR REPLACE FUNCTION fn_accept_application_transaction(
    p_application_id UUID,
    p_owner_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_task_id UUID;
    v_student_id UUID;
    v_task_owner UUID;
    v_task_status VARCHAR(20);
    v_new_assignment_id UUID;
BEGIN
    -- Check application existence
    SELECT task_id, student_id INTO v_task_id, v_student_id
    FROM applications
    WHERE application_id = p_application_id;

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Application % does not exist', p_application_id;
    END IF;

    -- Validate task owner and task status
    SELECT owner_id, status INTO v_task_owner, v_task_status
    FROM tasks
    WHERE task_id = v_task_id
    FOR UPDATE; -- Lock row for concurrency control

    IF v_task_owner != p_owner_id THEN
        RAISE EXCEPTION 'Unauthorized: User % is not the owner of task %', p_owner_id, v_task_id;
    END IF;

    IF v_task_status != 'OPEN' THEN
        RAISE EXCEPTION 'Cannot accept application: Task is already in status %', v_task_status;
    END IF;

    -- 1. Mark selected application as ACCEPTED
    UPDATE applications
    SET status = 'ACCEPTED'
    WHERE application_id = p_application_id;

    -- 2. Mark all other pending applications for this task as REJECTED
    UPDATE applications
    SET status = 'REJECTED'
    WHERE task_id = v_task_id AND application_id != p_application_id AND status = 'PENDING';

    -- 3. Create the 1:1 Assignment record
    INSERT INTO assignments (task_id, student_id, status, assigned_at)
    VALUES (v_task_id, v_student_id, 'ASSIGNED', CURRENT_TIMESTAMP)
    RETURNING assignment_id INTO v_new_assignment_id;

    -- 4. Update the Task status to ASSIGNED
    UPDATE tasks
    SET status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP
    WHERE task_id = v_task_id;

    RETURN v_new_assignment_id;
END;
$$ LANGUAGE plpgsql;
