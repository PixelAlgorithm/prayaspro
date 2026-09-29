import { Router } from 'express';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { createTask, getTaskById, listTasks, cancelTask } from '../services/taskService';

const router = Router();

// List tasks with filtering
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { categoryId, minBudget, maxBudget, status, search, ownerId, limit, offset } = req.query;
    
    const tasks = await listTasks({
      categoryId: categoryId as string,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      status: (status as string) || undefined,
      search: search as string,
      ownerId: ownerId as string,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });

    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Current user's posted tasks
router.get('/my/posted', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const tasks = await listTasks({
      ownerId: req.user!.userId
    });
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new task
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { categoryId, title, description, requiredSkills, budget, deadline } = req.body;
    
    if (!categoryId || !title || !description || !budget || !deadline) {
      return res.status(400).json({ 
        error: 'Missing required task fields: categoryId, title, description, budget, deadline.' 
      });
    }

    const task = await createTask({
      ownerId: req.user!.userId,
      categoryId,
      title,
      description,
      requiredSkills: requiredSkills || '',
      budget: Number(budget),
      deadline
    });

    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get task details by ID
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const task = await getTaskById(req.params.id as string);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel task
router.put('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const task = await cancelTask(req.params.id as string, req.user!.userId, isAdmin);
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
