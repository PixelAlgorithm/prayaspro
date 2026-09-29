"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const applicationService_1 = require("../services/applicationService");
const assignmentService_1 = require("../services/assignmentService");
const router = (0, express_1.Router)();
// Apply to a task
router.post('/tasks/:taskId/apply', auth_1.authenticate, async (req, res) => {
    try {
        const { proposal, proposedAmount } = req.body;
        if (!proposal || !proposedAmount) {
            return res.status(400).json({ error: 'Proposal and proposedAmount are required.' });
        }
        const application = await (0, applicationService_1.applyToTask)({
            taskId: req.params.taskId,
            studentId: req.user.userId,
            proposal,
            proposedAmount: Number(proposedAmount)
        });
        res.status(201).json(application);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// View applications for a specific task (owner only)
router.get('/tasks/:taskId/applications', auth_1.authenticate, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';
        const applications = await (0, applicationService_1.getTaskApplications)(req.params.taskId, req.user.userId, isAdmin);
        res.json(applications);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// View all applications submitted by logged-in student
router.get('/my', auth_1.authenticate, async (req, res) => {
    try {
        const applications = await (0, applicationService_1.getStudentApplications)(req.user.userId);
        res.json(applications);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Owner accepts an application (Atomic ACID Transaction)
router.post('/:id/accept', auth_1.authenticate, async (req, res) => {
    try {
        const assignment = await (0, assignmentService_1.acceptApplication)(req.params.id, req.user.userId);
        res.json({
            message: 'Application accepted and assignment created successfully.',
            assignment
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Student withdraws their application
router.put('/:id/withdraw', auth_1.authenticate, async (req, res) => {
    try {
        const app = await (0, applicationService_1.withdrawApplication)(req.params.id, req.user.userId);
        res.json({ message: 'Application withdrawn.', application: app });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
