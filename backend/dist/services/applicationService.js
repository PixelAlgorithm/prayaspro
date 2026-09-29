"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyToTask = applyToTask;
exports.getTaskApplications = getTaskApplications;
exports.getStudentApplications = getStudentApplications;
exports.withdrawApplication = withdrawApplication;
const connection_1 = require("../db/connection");
async function applyToTask(params) {
    const { taskId, studentId, proposal, proposedAmount } = params;
    if (proposedAmount <= 0) {
        throw new Error('Proposed amount must be greater than zero.');
    }
    if (!proposal || proposal.trim().length < 10) {
        throw new Error('Proposal must be at least 10 characters long.');
    }
    // The database triggers will automatically enforce:
    // 1. student cannot apply to own task (trg_prevent_self_application)
    // 2. task must be in OPEN status (trg_validate_task_status)
    // 3. unique (task_id, student_id) constraint
    const res = await (0, connection_1.query)(`INSERT INTO applications (task_id, student_id, proposal, proposed_amount, status)
     VALUES ($1, $2, $3, $4, 'PENDING')
     RETURNING *`, [taskId, studentId, proposal.trim(), proposedAmount]);
    return res.rows[0];
}
async function getTaskApplications(taskId, ownerId, isAdmin = false) {
    // Check authorization
    const taskRes = await (0, connection_1.query)('SELECT owner_id FROM tasks WHERE task_id = $1', [taskId]);
    if (taskRes.rowCount === 0) {
        throw new Error('Task not found.');
    }
    if (!isAdmin && taskRes.rows[0].owner_id !== ownerId) {
        throw new Error('Unauthorized to view applicants for this task.');
    }
    const res = await (0, connection_1.query)(`SELECT 
       a.application_id,
       a.task_id,
       a.student_id,
       a.proposal,
       a.proposed_amount,
       a.applied_at,
       a.status,
       u.name AS student_name,
       u.email AS student_email,
       u.college AS student_college,
       u.department AS student_department,
       vsp.average_rating,
       vsp.total_reviews_received,
       vsp.completed_assignments
     FROM applications a
     JOIN users u ON a.student_id = u.user_id
     LEFT JOIN view_student_performance vsp ON u.user_id = vsp.user_id
     WHERE a.task_id = $1
     ORDER BY a.applied_at ASC`, [taskId]);
    return res.rows;
}
async function getStudentApplications(studentId) {
    const res = await (0, connection_1.query)(`SELECT 
       a.application_id,
       a.task_id,
       a.proposal,
       a.proposed_amount,
       a.applied_at,
       a.status AS application_status,
       t.title AS task_title,
       t.budget AS task_budget,
       t.status AS task_status,
       t.deadline AS task_deadline,
       c.category_name,
       owner.name AS owner_name,
       owner.college AS owner_college,
       asg.assignment_id,
       asg.status AS assignment_status
     FROM applications a
     JOIN tasks t ON a.task_id = t.task_id
     JOIN categories c ON t.category_id = c.category_id
     JOIN users owner ON t.owner_id = owner.user_id
     LEFT JOIN assignments asg ON t.task_id = asg.task_id AND asg.student_id = a.student_id
     WHERE a.student_id = $1
     ORDER BY a.applied_at DESC`, [studentId]);
    return res.rows;
}
async function withdrawApplication(applicationId, studentId) {
    const res = await (0, connection_1.query)(`UPDATE applications
     SET status = 'WITHDRAWN'
     WHERE application_id = $1 AND student_id = $2 AND status = 'PENDING'
     RETURNING *`, [applicationId, studentId]);
    if (res.rowCount === 0) {
        throw new Error('Application could not be withdrawn (it may already be processed or not found).');
    }
    return res.rows[0];
}
