import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { 
  getUserProfileWithStats, 
  addStudentSkill, 
  removeStudentSkill 
} from '../services/userService';
import { listCategories, listSkills, createSkill } from '../services/skillCategoryService';

const router = Router();

// Profile endpoints
router.get('/profile', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getUserProfileWithStats(req.user!.userId);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const profile = await getUserProfileWithStats(req.params.id as string);
    if (!profile) return res.status(404).json({ error: 'User not found.' });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Student Skills endpoints
router.post('/skills', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { skillId, proficiencyLevel, yearsExperience } = req.body;
    if (!skillId) {
      return res.status(400).json({ error: 'skillId is required.' });
    }
    const result = await addStudentSkill(
      req.user!.userId,
      skillId,
      proficiencyLevel || 'INTERMEDIATE',
      Number(yearsExperience) || 1.0
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/skills/:skillId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    await removeStudentSkill(req.user!.userId, req.params.skillId as string);
    res.json({ message: 'Skill removed successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Category & Skill catalogs
router.get('/catalog/categories', async (req, res) => {
  try {
    const categories = await listCategories();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalog/skills', async (req, res) => {
  try {
    const skills = await listSkills(req.query.category as string);
    res.json(skills);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/catalog/skills', authenticate, async (req, res) => {
  try {
    const { skillName, category, description } = req.body;
    if (!skillName || !category) {
      return res.status(400).json({ error: 'skillName and category are required.' });
    }
    const skill = await createSkill(skillName, category, description);
    res.status(201).json(skill);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
