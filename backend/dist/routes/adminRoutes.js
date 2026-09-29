"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const connection_1 = require("../db/connection");
const router = (0, express_1.Router)();
// Protect all admin routes
router.use(auth_1.authenticate, (0, auth_1.requireRole)('ADMIN'));
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await (0, connection_1.query)(`SELECT COUNT(*) FROM users`);
        const totalStudents = await (0, connection_1.query)(`SELECT COUNT(*) FROM users WHERE role = 'STUDENT'`);
        const totalTasks = await (0, connection_1.query)(`SELECT COUNT(*) FROM tasks`);
        const totalVolume = await (0, connection_1.query)(`SELECT COALESCE(SUM(amount), 0) AS vol FROM payments WHERE payment_status = 'SUCCESS'`);
        const categoryStats = await (0, connection_1.query)(`SELECT * FROM view_task_marketplace_stats ORDER BY total_tasks DESC`);
        const topFreelancers = await (0, connection_1.query)(`SELECT * FROM view_top_rated_freelancers LIMIT 5`);
        res.json({
            metrics: {
                totalUsers: parseInt(totalUsers.rows[0].count),
                totalStudents: parseInt(totalStudents.rows[0].count),
                totalTasks: parseInt(totalTasks.rows[0].count),
                totalVolume: parseFloat(totalVolume.rows[0].vol)
            },
            categoryStats: categoryStats.rows,
            topFreelancers: topFreelancers.rows
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/users', async (req, res) => {
    try {
        const users = await (0, connection_1.query)(`
      SELECT user_id, name, email, college, department, role, is_active, created_at
      FROM users ORDER BY created_at DESC
    `);
        res.json(users.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.put('/users/:id/toggle-active', async (req, res) => {
    try {
        const updated = await (0, connection_1.query)(`UPDATE users SET is_active = NOT is_active WHERE user_id = $1 RETURNING user_id, name, is_active`, [req.params.id]);
        res.json(updated.rows[0]);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await (0, connection_1.query)(`
      SELECT 
        t.task_id, t.title, t.budget, t.deadline, t.status, t.created_at,
        c.category_name, u.name AS owner_name, u.email AS owner_email
      FROM tasks t
      JOIN categories c ON t.category_id = c.category_id
      JOIN users u ON t.owner_id = u.user_id
      ORDER BY t.created_at DESC
    `);
        res.json(tasks.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/ledger', async (req, res) => {
    try {
        const ledger = await (0, connection_1.query)(`SELECT * FROM view_student_earnings_ledger ORDER BY paid_at DESC`);
        res.json(ledger.rows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
