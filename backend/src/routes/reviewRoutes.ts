import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { createReview, getReviewsForUser, getStudentRatingSummary } from '../services/reviewService';

const router = Router();

router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId, reviewedUserId, rating, comment } = req.body;
    if (!taskId || !reviewedUserId || !rating) {
      return res.status(400).json({ error: 'taskId, reviewedUserId, and rating are required.' });
    }

    const review = await createReview({
      taskId,
      reviewerId: req.user!.userId,
      reviewedUserId,
      rating: Number(rating),
      comment
    });

    res.status(201).json(review);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await getReviewsForUser(req.params.userId);
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary/:userId', async (req, res) => {
  try {
    const summary = await getStudentRatingSummary(req.params.userId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
