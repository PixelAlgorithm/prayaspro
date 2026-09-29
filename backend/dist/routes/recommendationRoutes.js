"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const vectorService_1 = require("../services/vectorService");
const router = (0, express_1.Router)();
// Recommended tasks for current authenticated student
router.get('/tasks', auth_1.authenticate, async (req, res) => {
    try {
        const { limit, categoryId, minBudget } = req.query;
        const recommendations = await (0, vectorService_1.getRecommendedTasksForStudent)(req.user.userId, limit ? Number(limit) : 5, categoryId, minBudget ? Number(minBudget) : undefined);
        res.json(recommendations);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Recommended students for a specific task
router.get('/students/:taskId', auth_1.authenticate, async (req, res) => {
    try {
        const { limit } = req.query;
        const candidates = await (0, vectorService_1.getRecommendedStudentsForTask)(req.params.taskId, limit ? Number(limit) : 5);
        res.json(candidates);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
