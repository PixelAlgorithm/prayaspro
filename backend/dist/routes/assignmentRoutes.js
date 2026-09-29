"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const assignmentService_1 = require("../services/assignmentService");
const router = (0, express_1.Router)();
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const asg = await (0, assignmentService_1.getAssignmentById)(req.params.id);
        if (!asg)
            return res.status(404).json({ error: 'Assignment not found.' });
        res.json(asg);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Worker begins work
router.put('/:id/start', auth_1.authenticate, async (req, res) => {
    try {
        const asg = await (0, assignmentService_1.startWork)(req.params.id, req.user.userId);
        res.json({ message: 'Work marked as in-progress.', assignment: asg });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Worker submits deliverable
router.put('/:id/submit', auth_1.authenticate, async (req, res) => {
    try {
        const { notes } = req.body;
        const asg = await (0, assignmentService_1.submitWork)(req.params.id, req.user.userId, notes);
        res.json({ message: 'Deliverable submitted for owner approval.', assignment: asg });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Task owner approves completion & releases payment (Atomic ACID Transaction)
router.post('/:id/complete', auth_1.authenticate, async (req, res) => {
    try {
        const result = await (0, assignmentService_1.completeTaskAndReleasePayment)(req.params.id, req.user.userId);
        res.json({
            message: 'Task completed successfully and payment record released.',
            ...result
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
