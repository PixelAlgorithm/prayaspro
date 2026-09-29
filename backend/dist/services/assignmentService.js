"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptApplication = acceptApplication;
exports.getAssignmentById = getAssignmentById;
exports.getAssignmentByTaskId = getAssignmentByTaskId;
exports.startWork = startWork;
exports.submitWork = submitWork;
exports.completeTaskAndReleasePayment = completeTaskAndReleasePayment;
const connection_1 = require("../db/connection");
/**
 * DBMS Concept: Multi-table ACID Transaction via PostgreSQL Stored Function
 * Atomically marks application ACCEPTED, rejects others, creates 1:1 ASSIGNMENT, and updates TASK to ASSIGNED.
 */
async function acceptApplication(applicationId, ownerId) {
    const res = await (0, connection_1.query)(`SELECT fn_accept_application_transaction($1::uuid, $2::uuid) AS assignment_id`, [applicationId, ownerId]);
    const assignmentId = res.rows[0].assignment_id;
    return await getAssignmentById(assignmentId);
}
async function getAssignmentById(assignmentId) {
    const res = await (0, connection_1.query)(`SELECT 
       asg.assignment_id,
       asg.task_id,
       asg.student_id,
       asg.assigned_at,
       asg.started_at,
       asg.submitted_at,
       asg.completed_at,
       asg.status,
       asg.submission_notes,
       t.title AS task_title,
       t.description AS task_description,
       t.budget AS task_budget,
       t.deadline AS task_deadline,
       t.owner_id AS task_owner_id,
       owner.name AS task_owner_name,
       owner.email AS task_owner_email,
       student.name AS student_name,
       student.email AS student_email,
       student.college AS student_college,
       p.payment_id,
       p.payment_status,
       p.amount AS paid_amount,
       r.review_id,
       r.rating AS review_rating,
       r.comment AS review_comment
     FROM assignments asg
     JOIN tasks t ON asg.task_id = t.task_id
     JOIN users owner ON t.owner_id = owner.user_id
     JOIN users student ON asg.student_id = student.user_id
     LEFT JOIN payments p ON t.task_id = p.task_id AND p.payment_status = 'SUCCESS'
     LEFT JOIN reviews r ON t.task_id = r.task_id
     WHERE asg.assignment_id = $1`, [assignmentId]);
    return res.rows[0] || null;
}
async function getAssignmentByTaskId(taskId) {
    const res = await (0, connection_1.query)(`SELECT assignment_id FROM assignments WHERE task_id = $1`, [taskId]);
    if (res.rowCount === 0)
        return null;
    return await getAssignmentById(res.rows[0].assignment_id);
}
/**
 * Worker starts work on assigned task
 */
async function startWork(assignmentId, studentId) {
    const asg = await getAssignmentById(assignmentId);
    if (!asg)
        throw new Error('Assignment not found.');
    if (asg.student_id !== studentId)
        throw new Error('Unauthorized.');
    if (asg.status !== 'ASSIGNED')
        throw new Error(`Cannot start work from status: ${asg.status}`);
    return await (0, connection_1.withTransaction)(async (client) => {
        const res = await client.query(`UPDATE assignments
       SET status = 'IN_PROGRESS', started_at = CURRENT_TIMESTAMP
       WHERE assignment_id = $1
       RETURNING *`, [assignmentId]);
        await client.query(`UPDATE tasks
       SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $1`, [asg.task_id]);
        return res.rows[0];
    });
}
/**
 * Worker submits completed deliverable / work notes
 */
async function submitWork(assignmentId, studentId, notes) {
    const asg = await getAssignmentById(assignmentId);
    if (!asg)
        throw new Error('Assignment not found.');
    if (asg.student_id !== studentId)
        throw new Error('Unauthorized.');
    if (asg.status !== 'IN_PROGRESS' && asg.status !== 'ASSIGNED') {
        throw new Error(`Cannot submit work from status: ${asg.status}`);
    }
    return await (0, connection_1.withTransaction)(async (client) => {
        const res = await client.query(`UPDATE assignments
       SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP, submission_notes = $1
       WHERE assignment_id = $2
       RETURNING *`, [notes || 'Work submitted for review.', assignmentId]);
        await client.query(`UPDATE tasks
       SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $1`, [asg.task_id]);
        return res.rows[0];
    });
}
/**
 * DBMS Concept: Multi-table ACID Completion & Payment Transaction
 * Task Owner reviews submitted work, completes assignment, completes task,
 * and atomically creates a SUCCESS payment record.
 */
async function completeTaskAndReleasePayment(assignmentId, ownerId) {
    const asg = await getAssignmentById(assignmentId);
    if (!asg)
        throw new Error('Assignment not found.');
    if (asg.task_owner_id !== ownerId)
        throw new Error('Unauthorized: Only task owner can complete and release payment.');
    if (asg.status !== 'SUBMITTED' && asg.status !== 'IN_PROGRESS') {
        throw new Error(`Cannot complete task from status: ${asg.status}`);
    }
    return await (0, connection_1.withTransaction)(async (client) => {
        // 1. Update assignment to COMPLETED
        const asgRes = await client.query(`UPDATE assignments
       SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
       WHERE assignment_id = $1
       RETURNING *`, [assignmentId]);
        // 2. Update task to COMPLETED
        await client.query(`UPDATE tasks
       SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $1`, [asg.task_id]);
        // 3. Atomically create verified payment record
        const payRes = await client.query(`INSERT INTO payments (task_id, payer_id, receiver_id, amount, payment_status, paid_at)
       VALUES ($1, $2, $3, $4, 'SUCCESS', CURRENT_TIMESTAMP)
       RETURNING *`, [asg.task_id, ownerId, asg.student_id, asg.task_budget]);
        return {
            assignment: asgRes.rows[0],
            payment: payRes.rows[0]
        };
    });
}
