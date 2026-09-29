"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, college, department, role } = req.body;
        if (!name || !email || !password || !college || !department) {
            return res.status(400).json({ error: 'All fields (name, email, password, college, department) are required.' });
        }
        const result = await (0, authService_1.registerUser)({ name, email, password, college, department, role });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await (0, authService_1.loginUser)(email, password);
        res.json(result);
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const profile = await (0, userService_1.getUserProfileWithStats)(req.user.userId);
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
