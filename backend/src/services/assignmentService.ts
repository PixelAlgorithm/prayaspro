import { query, withTransaction } from '../db/connection';

/**
 * DBMS Concept: Multi-table ACID Transaction via PostgreSQL Stored Function
 * Atomically marks application ACCEPTED, rejects others, creates 1:1 ASSIGNMENT, and updates TASK to ASSIGNED.
 */
export async function acceptApplication(applicationId: string, ownerId: string) {
  const res = await query(
    `SELECT fn_accept_application_transaction($1::uuid, $2::uuid) AS assignment_id`,
    [applicationId, ownerId]
  );
  
  const assignmentId = res.rows[0].assignment_id;
  return await getAssignmentById(assignmentId);
}

export async function getAssignmentById(assignmentId: string) {
  const res = await query(
    `SELECT 
       asg.assignment_id,
       asg.task_id,
       asg.student_id,
       asg.assigned_at,
       asg.started_at,
       asg.submitted_at,
       asg.completed_at,
       asg.status,
       asg.submission_notes,
       COALESCE(asg.progress_percentage, 0) AS progress_percentage,
       asg.revision_notes,
       t.title AS task_title,
       t.description AS task_description,
       t.budget AS task_budget,
       t.deadline AS task_deadline,
       t.category_id,
       c.category_name,
       t.owner_id,
       t.owner_id AS task_owner_id,
       owner.name AS owner_name,
       owner.name AS task_owner_name,
       owner.email AS owner_email,
       owner.email AS task_owner_email,
       owner.college AS owner_college,
       owner.college AS task_owner_college,
       owner.department AS owner_department,
       student.name AS worker_name,
       student.name AS student_name,
       student.email AS worker_email,
       student.email AS student_email,
       student.college AS worker_college,
       student.college AS student_college,
       student.department AS worker_department,
       p.payment_id,
       p.payment_status,
       p.amount AS paid_amount,
       (
         SELECT json_agg(json_build_object(
           'review_id', rev.review_id,
           'reviewer_id', rev.reviewer_id,
           'reviewed_user_id', rev.reviewed_user_id,
           'rating', rev.rating,
           'comment', rev.comment,
           'created_at', rev.created_at
         ))
         FROM reviews rev
         WHERE rev.task_id = t.task_id
       ) AS reviews
     FROM assignments asg
     JOIN tasks t ON asg.task_id = t.task_id
     LEFT JOIN categories c ON t.category_id = c.category_id
     JOIN users owner ON t.owner_id = owner.user_id
     JOIN users student ON asg.student_id = student.user_id
     LEFT JOIN payments p ON t.task_id = p.task_id AND p.payment_status = 'SUCCESS'
     WHERE asg.assignment_id = $1`,
    [assignmentId]
  );

  return res.rows[0] || null;
}

export async function getAssignmentByTaskId(taskId: string) {
  const res = await query(
    `SELECT assignment_id FROM assignments WHERE task_id = $1`,
    [taskId]
  );
  if (res.rowCount === 0) return null;
  return await getAssignmentById(res.rows[0].assignment_id);
}

export async function getStudentAssignments(studentId: string) {
  const res = await query(
    `SELECT 
       asg.assignment_id,
       asg.task_id,
       asg.student_id,
       asg.assigned_at,
       asg.started_at,
       asg.submitted_at,
       asg.completed_at,
       asg.status,
       asg.submission_notes,
       COALESCE(asg.progress_percentage, 0) AS progress_percentage,
       t.title AS task_title,
       t.description AS task_description,
       t.budget AS task_budget,
       t.deadline AS task_deadline,
       t.status AS task_status,
       c.category_name,
       owner.name AS owner_name,
       owner.college AS owner_college
     FROM assignments asg
     JOIN tasks t ON asg.task_id = t.task_id
     LEFT JOIN categories c ON t.category_id = c.category_id
     JOIN users owner ON t.owner_id = owner.user_id
     WHERE asg.student_id = $1
     ORDER BY asg.assigned_at DESC`,
    [studentId]
  );
  return res.rows;
}

/**
 * Worker starts work on assigned task
 */
export async function startWork(assignmentId: string, studentId: string) {
  const asg = await getAssignmentById(assignmentId);
  if (!asg) throw new Error('Assignment not found.');
  if (asg.student_id !== studentId) throw new Error('Unauthorized.');
  if (asg.status !== 'ASSIGNED') throw new Error(`Cannot start work from status: ${asg.status}`);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE assignments
       SET status = 'IN_PROGRESS', started_at = CURRENT_TIMESTAMP, progress_percentage = 25
       WHERE assignment_id = $1`,
      [assignmentId]
    );

    await client.query(
      `UPDATE tasks
       SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $1`,
      [asg.task_id]
    );
  });

  return await getAssignmentById(assignmentId);
}

/**
 * Worker updates progress percentage and notes
 */
export async function updateProgress(assignmentId: string, studentId: string, progress: number, notes?: string) {
  const asg = await getAssignmentById(assignmentId);
  if (!asg) throw new Error('Assignment not found.');
  if (asg.student_id !== studentId) throw new Error('Unauthorized: Only assigned worker can update progress.');
  if (asg.status === 'COMPLETED' || asg.status === 'CANCELLED') {
    throw new Error(`Cannot update progress on ${asg.status} assignment.`);
  }

  const clamped = Math.max(0, Math.min(100, Number(progress) || 0));

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE assignments
       SET progress_percentage = $1,
           submission_notes = COALESCE($2, submission_notes),
           status = CASE WHEN status = 'ASSIGNED' THEN 'IN_PROGRESS' ELSE status END,
           started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
       WHERE assignment_id = $3`,
      [clamped, notes || null, assignmentId]
    );

    if (asg.status === 'ASSIGNED') {
      await client.query(
        `UPDATE tasks SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1`,
        [asg.task_id]
      );
    }
  });

  return await getAssignmentById(assignmentId);
}

/**
 * Worker submits completed deliverable / work notes
 */
export async function submitWork(assignmentId: string, studentId: string, notes: string) {
  const asg = await getAssignmentById(assignmentId);
  if (!asg) throw new Error('Assignment not found.');
  if (asg.student_id !== studentId) throw new Error('Unauthorized.');

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE assignments
       SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP, submission_notes = $1, progress_percentage = 100
       WHERE assignment_id = $2`,
      [notes || 'Work completed and submitted for review.', assignmentId]
    );

    await client.query(
      `UPDATE tasks
       SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $1`,
      [asg.task_id]
    );
  });

  return await getAssignmentById(assignmentId);
}

/**
 * Task Owner requests revisions / Redo
 */
export async function requestRedo(assignmentId: string, ownerId: string, feedback: string) {
  const asg = await getAssignmentById(assignmentId);
  if (!asg) throw new Error('Assignment not found.');
  if (asg.task_owner_id !== ownerId) throw new Error('Unauthorized: Only task owner can request revisions.');

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE assignments
       SET status = 'IN_PROGRESS',
           revision_notes = $1,
           progress_percentage = 50
       WHERE assignment_id = $2`,
      [feedback || 'Changes requested by client. Please revise and resubmit.', assignmentId]
    );

    await client.query(
      `UPDATE tasks SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1`,
      [asg.task_id]
    );
  });

  return await getAssignmentById(assignmentId);
}

/**
 * DBMS Concept: Multi-table ACID Completion & Payment Transaction
 * Task Owner reviews submitted work, completes assignment, completes task,
 * and atomically creates a SUCCESS payment record.
 */
export async function completeTaskAndReleasePayment(assignmentId: string, ownerId: string) {
  const asg = await getAssignmentById(assignmentId);
  if (!asg) throw new Error('Assignment not found.');
  if (asg.task_owner_id !== ownerId) throw new Error('Unauthorized: Only task owner can complete and release payment.');

  return await withTransaction(async (client) => {
    // 1. Update assignment to COMPLETED & 100% progress
    const asgRes = await client.query(
      `UPDATE assignments
       SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, progress_percentage = 100
       WHERE assignment_id = $1
       RETURNING *`,
      [assignmentId]
    );

    // 2. Update task to COMPLETED
    await client.query(
      `UPDATE tasks
       SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $1`,
      [asg.task_id]
    );

    // 3. Atomically create verified payment record
    const payRes = await client.query(
      `INSERT INTO payments (task_id, payer_id, receiver_id, amount, payment_status, paid_at)
       VALUES ($1, $2, $3, $4, 'SUCCESS', CURRENT_TIMESTAMP)
       RETURNING *`,
      [asg.task_id, ownerId, asg.student_id, asg.task_budget]
    );

    return {
      assignment: asgRes.rows[0],
      payment: payRes.rows[0]
    };
  });
}
