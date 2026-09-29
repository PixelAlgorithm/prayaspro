"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReview = createReview;
exports.getReviewsForUser = getReviewsForUser;
exports.getStudentRatingSummary = getStudentRatingSummary;
const connection_1 = require("../db/connection");
async function createReview(params) {
    const { taskId, reviewerId, reviewedUserId, rating, comment } = params;
    if (rating < 1 || rating > 5) {
        throw new Error('Rating must be an integer between 1 and 5.');
    }
    // Verify task completion
    const taskRes = await (0, connection_1.query)('SELECT status, owner_id FROM tasks WHERE task_id = $1', [taskId]);
    if (taskRes.rowCount === 0) {
        throw new Error('Task not found.');
    }
    if (taskRes.rows[0].status !== 'COMPLETED') {
        throw new Error('Reviews can only be submitted for COMPLETED tasks.');
    }
    // Insert review
    const res = await (0, connection_1.query)(`INSERT INTO reviews (task_id, reviewer_id, reviewed_user_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`, [taskId, reviewerId, reviewedUserId, rating, comment || null]);
    return res.rows[0];
}
async function getReviewsForUser(userId) {
    const res = await (0, connection_1.query)(`SELECT 
       r.review_id,
       r.task_id,
       r.rating,
       r.comment,
       r.created_at,
       t.title AS task_title,
       reviewer.name AS reviewer_name,
       reviewer.college AS reviewer_college
     FROM reviews r
     JOIN tasks t ON r.task_id = t.task_id
     JOIN users reviewer ON r.reviewer_id = reviewer.user_id
     WHERE r.reviewed_user_id = $1
     ORDER BY r.created_at DESC`, [userId]);
    return res.rows;
}
async function getStudentRatingSummary(userId) {
    const res = await (0, connection_1.query)(`SELECT * FROM fn_calculate_student_rating($1)`, [userId]);
    return res.rows[0];
}
