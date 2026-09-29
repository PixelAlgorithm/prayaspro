"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const taskService_1 = require("../services/taskService");
const router = (0, express_1.Router)();
// List tasks with filtering
router.get('/', auth_1.optionalAuthenticate, async (req, res) => {
    try {
        const { categoryId, minBudget, maxBudget, status, search, ownerId, limit, offset } = req.query;
        const tasks = await (0, taskService_1.listTasks)({
            categoryId: categoryId,
            minBudget: minBudget ? Number(minBudget) : undefined,
            maxBudget: maxBudget ? Number(maxBudget) : undefined,
            status: status || undefined,
            search: search,
            ownerId: ownerId,
            limit: limit ? Number(limit) : 50,
            offset: offset ? Number(offset) : 0
        });
        res.json(tasks);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Current user's posted tasks
router.get('/my/posted', auth_1.authenticate, async (req, res) => {
    try {
        const tasks = await (0, taskService_1.listTasks)({
            ownerId: req.user.userId
        });
        res.json(tasks);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create new task
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { categoryId, title, description, requiredSkills, budget, deadline } = req.body;
        if (!categoryId || !title || !description || !budget || !deadline) {
            return res.status(400).json({
                error: 'Missing required task fields: categoryId, title, description, budget, deadline.'
            });
        }
        const task = await (0, taskService_1.createTask)({
            ownerId: req.user.userId,
            categoryId,
            title,
            description,
            requiredSkills: requiredSkills || '',
            budget: Number(budget),
            deadline
        });
        res.status(201).json(task);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Get task details by ID
router.get('/:id', auth_1.optionalAuthenticate, async (req, res) => {
    try {
        const task = await (0, taskService_1.getTaskById)(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        res.json(task);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Cancel task
router.put('/:id/cancel', auth_1.authenticate, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';
        const task = await (0, taskService_1.cancelTask)(req.params.id, req.user.userId, isAdmin);
        res.json(task);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
