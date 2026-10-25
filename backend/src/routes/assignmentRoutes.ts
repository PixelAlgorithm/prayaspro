import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { 
  getAssignmentById, 
  getAssignmentByTaskId,
  getStudentAssignments,
  startWork, 
  submitWork, 
  completeTaskAndReleasePayment,
  updateProgress,
  requestRedo
} from '../services/assignmentService';

const router = Router();

// Current student's assigned contracts
router.get('/my/assigned', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const list = await getStudentAssignments(req.user!.userId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get assignment by task ID
router.get('/task/:taskId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const asg = await getAssignmentByTaskId(req.params.taskId as string);
    if (!asg) return res.status(404).json({ error: 'No assignment found for this task.' });
    res.json(asg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
const handleStart = async (req: AuthenticatedRequest, res: any) => {
  try {
    const asg = await startWork(req.params.id as string, req.user!.userId);
    res.json({ message: 'Work marked as in-progress.', assignment: asg });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
router.put('/:id/start', authenticate, handleStart);
router.post('/:id/start', authenticate, handleStart);

// Worker updates progress percentage and notes
const handleProgress = async (req: AuthenticatedRequest, res: any) => {
  try {
    const progress = req.body.progress ?? req.body.progress_percentage;
    const { notes } = req.body;
    const asg = await updateProgress(req.params.id as string, req.user!.userId, progress, notes);
    res.json({ message: 'Progress updated successfully.', assignment: asg });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
router.put('/:id/progress', authenticate, handleProgress);
router.post('/:id/progress', authenticate, handleProgress);

// Worker submits deliverable
const handleSubmit = async (req: AuthenticatedRequest, res: any) => {
  try {
    const { notes } = req.body;
    const asg = await submitWork(req.params.id as string, req.user!.userId, notes);
    res.json({ message: 'Deliverable submitted for owner approval.', assignment: asg });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
router.put('/:id/submit', authenticate, handleSubmit);
router.post('/:id/submit', authenticate, handleSubmit);

// Task owner requests changes / Redo
router.post('/:id/redo', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { feedback } = req.body;
    const asg = await requestRedo(req.params.id as string, req.user!.userId, feedback);
    res.json({ message: 'Revision requested from worker.', assignment: asg });
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
