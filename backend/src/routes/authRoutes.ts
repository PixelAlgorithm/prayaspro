import { Router } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { getUserProfileWithStats } from '../services/userService';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, college, department, role } = req.body;
    if (!name || !email || !password || !college || !department) {
      return res.status(400).json({ error: 'All fields (name, email, password, college, department) are required.' });
    }
    const result = await registerUser({ name, email, password, college, department, role });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getUserProfileWithStats(req.user!.userId);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
