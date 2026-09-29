"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const reviewService_1 = require("../services/reviewService");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { taskId, reviewedUserId, rating, comment } = req.body;
        if (!taskId || !reviewedUserId || !rating) {
            return res.status(400).json({ error: 'taskId, reviewedUserId, and rating are required.' });
        }
        const review = await (0, reviewService_1.createReview)({
            taskId,
            reviewerId: req.user.userId,
            reviewedUserId,
            rating: Number(rating),
            comment
        });
        res.status(201).json(review);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.get('/user/:userId', async (req, res) => {
    try {
        const reviews = await (0, reviewService_1.getReviewsForUser)(req.params.userId);
        res.json(reviews);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/summary/:userId', async (req, res) => {
    try {
        const summary = await (0, reviewService_1.getStudentRatingSummary)(req.params.userId);
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
