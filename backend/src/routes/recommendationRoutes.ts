import { Router } from 'express';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { 
  getRecommendedTasksForStudent, 
  getRecommendedStudentsForTask,
  listEmbeddings,
  getEmbedding,
  updateEmbedding,
  deleteEmbedding
} from '../services/vectorService';

const router = Router();

// ====================================================================
// VECTOR RUD OPERATIONS (Academic Requirement: NoSQL / Vector Feature RUD)
// ====================================================================

// 1. READ: List all stored vector embeddings with metadata
router.get('/embeddings', optionalAuthenticate, async (req, res) => {
  try {
    const { limit, offset, entityType } = req.query;
    const items = await listEmbeddings(
      limit ? Number(limit) : 25,
      offset ? Number(offset) : 0,
      entityType as string
    );
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. READ: Get single vector embedding details
router.get('/embeddings/:entityType/:entityId', optionalAuthenticate, async (req, res) => {
  try {
    const item = await getEmbedding(req.params.entityType, req.params.entityId);
    if (!item) return res.status(404).json({ error: 'Embedding not found.' });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. UPDATE: Update content text and re-project 384-dimensional vector embedding
router.put('/embeddings/:entityType/:entityId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { contentText } = req.body;
    if (!contentText || typeof contentText !== 'string') {
      return res.status(400).json({ error: 'contentText is required.' });
    }
    const updated = await updateEmbedding(
      req.params.entityType as 'STUDENT' | 'TASK',
      req.params.entityId,
      contentText
    );
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE: Remove vector embedding from vector store
router.delete('/embeddings/:entityType/:entityId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await deleteEmbedding(req.params.entityType, req.params.entityId);
    res.json(deleted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

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
