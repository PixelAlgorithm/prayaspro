import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { 
  applyToTask, 
  getTaskApplications, 
  getStudentApplications, 
  withdrawApplication 
} from '../services/applicationService';
import { acceptApplication } from '../services/assignmentService';

const router = Router();

// Apply to a task
router.post('/tasks/:taskId/apply', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { proposal, proposedAmount } = req.body;
    if (!proposal || !proposedAmount) {
      return res.status(400).json({ error: 'Proposal and proposedAmount are required.' });
    }

    const application = await applyToTask({
      taskId: req.params.taskId as string,
      studentId: req.user!.userId,
      proposal,
      proposedAmount: Number(proposedAmount)
    });

    res.status(201).json(application);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// View applications for a specific task (owner only)
router.get('/tasks/:taskId/applications', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const applications = await getTaskApplications(req.params.taskId as string, req.user!.userId, isAdmin);
    res.json(applications);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// View all applications submitted by logged-in student
router.get('/my', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const applications = await getStudentApplications(req.user!.userId);
    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Owner accepts an application (Atomic ACID Transaction)
router.post('/:id/accept', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const assignment = await acceptApplication(req.params.id as string, req.user!.userId);
    res.json({
      message: 'Application accepted and assignment created successfully.',
      assignment
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Student withdraws their application
router.put('/:id/withdraw', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const app = await withdrawApplication(req.params.id as string, req.user!.userId);
    res.json({ message: 'Application withdrawn.', application: app });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
