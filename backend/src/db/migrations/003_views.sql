-- ====================================================================
-- PRAYASPRO DATABASE VIEWS MIGRATION 003
-- Academic Requirement: Practical Demonstrable Analytical Views
-- Cleanly structured using aggregated CTE / Subqueries to prevent Cartesian Product inflation
-- ====================================================================

-- Drop views first to allow clean type adjustments
DROP VIEW IF EXISTS view_top_rated_freelancers CASCADE;
DROP VIEW IF EXISTS view_student_earnings_ledger CASCADE;
DROP VIEW IF EXISTS view_task_marketplace_stats CASCADE;
DROP VIEW IF EXISTS view_student_performance CASCADE;

-- 1. Student Performance Summary View
-- Computes aggregated statistics per student: applications, completed jobs, earnings, reviews, rating
CREATE OR REPLACE VIEW view_student_performance AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.college,
    u.department,
    u.role,
    u.is_active,
    u.created_at AS member_since,
    COALESCE(sk.total_skills, 0)::BIGINT AS total_skills,
    COALESCE(ap.total_applications_submitted, 0)::BIGINT AS total_applications_submitted,
    COALESCE(ap.accepted_applications, 0)::BIGINT AS accepted_applications,
    COALESCE(asg.completed_assignments, 0)::BIGINT AS completed_assignments,
    COALESCE(pay.total_earnings, 0.00)::NUMERIC(10, 2) AS total_earnings,
    COALESCE(rev.average_rating, 0.00)::NUMERIC(3, 2) AS average_rating,
    COALESCE(rev.total_reviews_received, 0)::BIGINT AS total_reviews_received
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(DISTINCT skill_id) AS total_skills
    FROM student_skills
    GROUP BY user_id
) sk ON u.user_id = sk.user_id
LEFT JOIN (
    SELECT student_id,
           COUNT(application_id) AS total_applications_submitted,
           COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END) AS accepted_applications
    FROM applications
    GROUP BY student_id
) ap ON u.user_id = ap.student_id
LEFT JOIN (
    SELECT student_id,
           COUNT(assignment_id) AS completed_assignments
    FROM assignments
    WHERE status = 'COMPLETED'
    GROUP BY student_id
) asg ON u.user_id = asg.student_id
LEFT JOIN (
    SELECT receiver_id,
           SUM(amount) AS total_earnings
    FROM payments
    WHERE payment_status = 'SUCCESS'
    GROUP BY receiver_id
) pay ON u.user_id = pay.receiver_id
LEFT JOIN (
    SELECT reviewed_user_id,
           ROUND(AVG(rating)::numeric, 2) AS average_rating,
           COUNT(review_id) AS total_reviews_received
    FROM reviews
    GROUP BY reviewed_user_id
) rev ON u.user_id = rev.reviewed_user_id
WHERE u.role = 'STUDENT';

-- 2. Task Marketplace Analytics View
-- Computes aggregated statistics per category: task counts, average budgets, application counts
CREATE OR REPLACE VIEW view_task_marketplace_stats AS
SELECT 
    c.category_id,
    c.category_name,
    c.description AS category_description,
    COALESCE(t.total_tasks, 0)::BIGINT AS total_tasks,
    COALESCE(t.open_tasks, 0)::BIGINT AS open_tasks,
    COALESCE(t.in_progress_tasks, 0)::BIGINT AS in_progress_tasks,
    COALESCE(t.completed_tasks, 0)::BIGINT AS completed_tasks,
    COALESCE(t.average_budget, 0.00)::NUMERIC(10, 2) AS average_budget,
    COALESCE(t.total_budget_volume, 0.00)::NUMERIC(10, 2) AS total_budget_volume,
    COALESCE(app.total_applications, 0)::BIGINT AS total_applications_received
FROM categories c
LEFT JOIN (
    SELECT 
        category_id,
        COUNT(task_id) AS total_tasks,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) AS open_tasks,
        COUNT(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 END) AS in_progress_tasks,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_tasks,
        ROUND(AVG(budget)::numeric, 2) AS average_budget,
        SUM(budget) AS total_budget_volume
    FROM tasks
    GROUP BY category_id
) t ON c.category_id = t.category_id
LEFT JOIN (
    SELECT t_sub.category_id, COUNT(a.application_id) AS total_applications
    FROM applications a
    JOIN tasks t_sub ON a.task_id = t_sub.task_id
    GROUP BY t_sub.category_id
) app ON c.category_id = app.category_id;

-- 3. Student Earnings & Payout Ledger View
-- Detailed audit ledger of completed payments with task and user details
CREATE OR REPLACE VIEW view_student_earnings_ledger AS
SELECT 
    p.payment_id,
    p.task_id,
    t.title AS task_title,
    c.category_name,
    p.amount,
    p.payment_status,
    p.paid_at,
    payer.user_id AS payer_id,
    payer.name AS payer_name,
    payer.college AS payer_college,
    receiver.user_id AS receiver_id,
    receiver.name AS receiver_name,
    receiver.college AS receiver_college
FROM payments p
JOIN tasks t ON p.task_id = t.task_id
JOIN categories c ON t.category_id = c.category_id
JOIN users payer ON p.payer_id = payer.user_id
JOIN users receiver ON p.receiver_id = receiver.user_id;

-- 4. Top Rated Student Freelancers View
CREATE OR REPLACE VIEW view_top_rated_freelancers AS
SELECT 
    u.user_id,
    u.name,
    u.college,
    u.department,
    ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
    COUNT(r.review_id) AS review_count,
    COUNT(DISTINCT asg.assignment_id) AS completed_tasks
FROM users u
JOIN reviews r ON u.user_id = r.reviewed_user_id
LEFT JOIN assignments asg ON u.user_id = asg.student_id AND asg.status = 'COMPLETED'
GROUP BY u.user_id, u.name, u.college, u.department
HAVING COUNT(r.review_id) >= 1
ORDER BY avg_rating DESC, review_count DESC;
