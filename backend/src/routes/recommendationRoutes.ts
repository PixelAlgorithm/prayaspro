import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { 
  getRecommendedTasksForStudent, 
  getRecommendedStudentsForTask 
} from '../services/vectorService';

const router = Router();

// Recommended tasks for current authenticated student
router.get('/tasks', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit, categoryId, minBudget } = req.query;
    const recommendations = await getRecommendedTasksForStudent(
      req.user!.userId,
      limit ? Number(limit) : 5,
      categoryId as string,
      minBudget ? Number(minBudget) : undefined
    );

    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Recommended students for a specific task
router.get('/students/:taskId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit } = req.query;
    const candidates = await getRecommendedStudentsForTask(
      req.params.taskId as string,
      limit ? Number(limit) : 5
    );

    res.json(candidates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
