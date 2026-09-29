import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { 
  getAssignmentById, 
  startWork, 
  submitWork, 
  completeTaskAndReleasePayment 
} from '../services/assignmentService';

const router = Router();

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const asg = await getAssignmentById(req.params.id as string);
    if (!asg) return res.status(404).json({ error: 'Assignment not found.' });
    res.json(asg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Worker begins work
router.put('/:id/start', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const asg = await startWork(req.params.id as string, req.user!.userId);
    res.json({ message: 'Work marked as in-progress.', assignment: asg });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Worker submits deliverable
router.put('/:id/submit', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { notes } = req.body;
    const asg = await submitWork(req.params.id as string, req.user!.userId, notes);
    res.json({ message: 'Deliverable submitted for owner approval.', assignment: asg });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Task owner approves completion & releases payment (Atomic ACID Transaction)
router.post('/:id/complete', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await completeTaskAndReleasePayment(req.params.id as string, req.user!.userId);
    res.json({
      message: 'Task completed successfully and payment record released.',
      ...result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
