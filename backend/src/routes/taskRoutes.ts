import { Router } from 'express';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { createTask, getTaskById, listTasks, cancelTask, deleteTask } from '../services/taskService';
import { applyToTask, getTaskApplications } from '../services/applicationService';

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
    const categoryId = req.body.categoryId || req.body.category_id;
    const title = req.body.title;
    const description = req.body.description;
    const requiredSkills = req.body.requiredSkills || req.body.required_skills || '';
    const budget = req.body.budget;
    const deadline = req.body.deadline;
    
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
      requiredSkills,
      budget: Number(budget),
      deadline
    });

    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get applications for a task (alias)
router.get('/:id/applications', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const applications = await getTaskApplications(req.params.id as string, req.user!.userId, isAdmin);
    res.json(applications);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Apply to a task (alias)
router.post('/:id/apply', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { proposal, proposedAmount, proposed_amount } = req.body;
    const amount = proposedAmount || proposed_amount;
    if (!proposal || !amount) {
      return res.status(400).json({ error: 'Proposal and proposedAmount are required.' });
    }

    const application = await applyToTask({
      taskId: req.params.id as string,
      studentId: req.user!.userId,
      proposal,
      proposedAmount: Number(amount)
    });

    res.status(201).json(application);
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

// Delete task (permanent removal by owner or admin)
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const result = await deleteTask(req.params.id as string, req.user!.userId, isAdmin);
    res.json({ message: 'Task and all associated records deleted successfully.', task: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
