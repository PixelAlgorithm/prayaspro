"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const skillCategoryService_1 = require("../services/skillCategoryService");
const router = (0, express_1.Router)();
// Profile endpoints
router.get('/profile', auth_1.authenticate, async (req, res) => {
    try {
        const profile = await (0, userService_1.getUserProfileWithStats)(req.user.userId);
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/profile/:id', async (req, res) => {
    try {
        const profile = await (0, userService_1.getUserProfileWithStats)(req.params.id);
        if (!profile)
            return res.status(404).json({ error: 'User not found.' });
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Student Skills endpoints
router.post('/skills', auth_1.authenticate, async (req, res) => {
    try {
        const { skillId, proficiencyLevel, yearsExperience } = req.body;
        if (!skillId) {
            return res.status(400).json({ error: 'skillId is required.' });
        }
        const result = await (0, userService_1.addStudentSkill)(req.user.userId, skillId, proficiencyLevel || 'INTERMEDIATE', Number(yearsExperience) || 1.0);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.delete('/skills/:skillId', auth_1.authenticate, async (req, res) => {
    try {
        await (0, userService_1.removeStudentSkill)(req.user.userId, req.params.skillId);
        res.json({ message: 'Skill removed successfully.' });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Category & Skill catalogs
router.get('/catalog/categories', async (req, res) => {
    try {
        const categories = await (0, skillCategoryService_1.listCategories)();
        res.json(categories);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/catalog/skills', async (req, res) => {
    try {
        const skills = await (0, skillCategoryService_1.listSkills)(req.query.category);
        res.json(skills);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/catalog/skills', auth_1.authenticate, async (req, res) => {
    try {
        const { skillName, category, description } = req.body;
        if (!skillName || !category) {
            return res.status(400).json({ error: 'skillName and category are required.' });
        }
        const skill = await (0, skillCategoryService_1.createSkill)(skillName, category, description);
        res.status(201).json(skill);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
