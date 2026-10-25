import { Router } from 'express';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { query, withTransaction } from '../db/connection';

const router = Router();

// Protect all admin routes
router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const totalUsers = await query(`SELECT COUNT(*) FROM users`);
    const totalStudents = await query(`SELECT COUNT(*) FROM users WHERE role = 'STUDENT'`);
    const totalTasks = await query(`SELECT COUNT(*) FROM tasks`);
    const totalVolume = await query(`SELECT COALESCE(SUM(amount), 0) AS vol FROM payments WHERE payment_status = 'SUCCESS'`);
    const categoryStats = await query(`SELECT * FROM view_task_marketplace_stats ORDER BY total_tasks DESC`);
    const topFreelancers = await query(`SELECT * FROM view_top_rated_freelancers LIMIT 5`);

    res.json({
      metrics: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalStudents: parseInt(totalStudents.rows[0].count),
        totalTasks: parseInt(totalTasks.rows[0].count),
        totalVolume: parseFloat(totalVolume.rows[0].vol)
      },
      categoryStats: categoryStats.rows,
      topFreelancers: topFreelancers.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await query(`
      SELECT user_id, name, email, college, department, role, is_active, created_at
      FROM users ORDER BY created_at DESC
    `);
    res.json(users.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const updated = await query(
      `UPDATE users SET is_active = NOT is_active WHERE user_id = $1 RETURNING user_id, name, is_active`,
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    let updated;
    if (typeof is_active === 'boolean') {
      updated = await query(
        `UPDATE users SET is_active = $1 WHERE user_id = $2 RETURNING user_id, name, is_active`,
        [is_active, req.params.id]
      );
    } else {
      updated = await query(
        `UPDATE users SET is_active = NOT is_active WHERE user_id = $1 RETURNING user_id, name, is_active`,
        [req.params.id]
      );
    }
    res.json(updated.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await query(`
      SELECT 
        t.task_id, t.title, t.budget, t.deadline, t.status, t.created_at,
        c.category_name, u.name AS owner_name, u.email AS owner_email
      FROM tasks t
      JOIN categories c ON t.category_id = c.category_id
      JOIN users u ON t.owner_id = u.user_id
      ORDER BY t.created_at DESC
    `);
    res.json(tasks.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin deletes a task and cleanly cascades child records
router.delete('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    await withTransaction(async (client) => {
      // 1. Delete content embeddings
      await client.query(`DELETE FROM content_embeddings WHERE entity_id = $1::uuid AND entity_type = 'TASK'`, [taskId]);
      // 2. Delete reviews
      await client.query(`DELETE FROM reviews WHERE task_id = $1::uuid`, [taskId]);
      // 3. Delete payments
      await client.query(`DELETE FROM payments WHERE task_id = $1::uuid`, [taskId]);
      // 4. Delete assignments
      await client.query(`DELETE FROM assignments WHERE task_id = $1::uuid`, [taskId]);
      // 5. Delete applications
      await client.query(`DELETE FROM applications WHERE task_id = $1::uuid`, [taskId]);
      // 6. Delete task itself
      const result = await client.query(`DELETE FROM tasks WHERE task_id = $1::uuid RETURNING task_id, title`, [taskId]);
      if (result.rowCount === 0) {
        throw new Error('Task not found');
      }
    });

    res.json({ message: 'Task and all associated records deleted successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/ledger', async (req, res) => {
  try {
    const ledger = await query(`SELECT * FROM view_student_earnings_ledger ORDER BY paid_at DESC`);
    res.json(ledger.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
