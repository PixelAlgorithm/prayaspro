import { query } from '../db/connection';
import { upsertEmbedding } from './vectorService';

export interface CreateTaskDTO {
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  requiredSkills: string;
  budget: number;
  deadline: string;
}

export interface TaskFilterDTO {
  categoryId?: string;
  minBudget?: number;
  maxBudget?: number;
  status?: string;
  search?: string;
  ownerId?: string;
  limit?: number;
  offset?: number;
}

export async function createTask(dto: CreateTaskDTO) {
  const { ownerId, categoryId, title, description, requiredSkills, budget, deadline } = dto;

  if (budget <= 0) {
    throw new Error('Budget must be greater than zero.');
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
    throw new Error('Deadline must be a valid future date.');
  }

  // 1. Insert Task in PostgreSQL
  const res = await query(
    `INSERT INTO tasks (owner_id, category_id, title, description, required_skills, budget, deadline, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')
     RETURNING *`,
    [ownerId, categoryId, title, description, requiredSkills, budget, deadlineDate]
  );

  const task = res.rows[0];

  // 2. Fetch category name for embedding enrichment
  const catRes = await query(`SELECT category_name FROM categories WHERE category_id = $1`, [categoryId]);
  const categoryName = catRes.rows[0]?.category_name || '';

  // 3. Generate & Store pgvector embedding for this task
  const contentText = `Task: ${title}. Category: ${categoryName}. Required Skills: ${requiredSkills}. Description: ${description}. Budget: ₹${budget}.`;
  await upsertEmbedding('TASK', task.task_id, contentText);

  return task;
}

export async function getTaskById(taskId: string) {
  const res = await query(
    `SELECT 
       t.task_id,
       t.owner_id,
       t.category_id,
       t.title,
       t.description,
       t.required_skills,
       t.budget,
       t.deadline,
       t.status,
       t.created_at,
       t.updated_at,
       c.category_name,
       c.description AS category_description,
       u.name AS owner_name,
       u.email AS owner_email,
       u.college AS owner_college,
       u.department AS owner_department,
       (SELECT COUNT(*) FROM applications WHERE task_id = t.task_id)::int AS total_applications,
       asg.assignment_id,
       asg.student_id AS assigned_student_id,
       asg.status AS assignment_status,
       asg.started_at,
       asg.submitted_at,
       asg.completed_at,
       asg_user.name AS assigned_student_name,
       asg_user.college AS assigned_student_college
     FROM tasks t
     JOIN categories c ON t.category_id = c.category_id
     JOIN users u ON t.owner_id = u.user_id
     LEFT JOIN assignments asg ON t.task_id = asg.task_id
     LEFT JOIN users asg_user ON asg.student_id = asg_user.user_id
     WHERE t.task_id = $1`,
    [taskId]
  );

  return res.rows[0] || null;
}

export async function listTasks(filters: TaskFilterDTO) {
  let sql = `
    SELECT 
      t.task_id,
      t.owner_id,
      t.category_id,
      t.title,
      t.description,
      t.required_skills,
      t.budget,
      t.deadline,
      t.status,
      t.created_at,
      c.category_name,
      u.name AS owner_name,
      u.college AS owner_college,
      (SELECT COUNT(*) FROM applications WHERE task_id = t.task_id)::int AS application_count
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
    JOIN users u ON t.owner_id = u.user_id
    WHERE 1=1
  `;

  const params: any[] = [];
  let pIdx = 1;

  if (filters.status) {
    sql += ` AND t.status = $${pIdx}`;
    params.push(filters.status);
    pIdx++;
  }

  if (filters.categoryId) {
    sql += ` AND t.category_id = $${pIdx}`;
    params.push(filters.categoryId);
    pIdx++;
  }

  if (filters.minBudget !== undefined) {
    sql += ` AND t.budget >= $${pIdx}`;
    params.push(filters.minBudget);
    pIdx++;
  }

  if (filters.maxBudget !== undefined) {
    sql += ` AND t.budget <= $${pIdx}`;
    params.push(filters.maxBudget);
    pIdx++;
  }

  if (filters.ownerId) {
    sql += ` AND t.owner_id = $${pIdx}`;
    params.push(filters.ownerId);
    pIdx++;
  }

  if (filters.search) {
    sql += ` AND (t.title ILIKE $${pIdx} OR t.description ILIKE $${pIdx} OR t.required_skills ILIKE $${pIdx})`;
    params.push(`%${filters.search}%`);
    pIdx++;
  }

  sql += ` ORDER BY t.created_at DESC`;

  if (filters.limit) {
    sql += ` LIMIT $${pIdx}`;
    params.push(filters.limit);
    pIdx++;
  }

  if (filters.offset) {
    sql += ` OFFSET $${pIdx}`;
    params.push(filters.offset);
    pIdx++;
  }

  const res = await query(sql, params);
  return res.rows;
}

export async function cancelTask(taskId: string, userId: string, isAdmin = false) {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error('Task not found.');
  }

  if (!isAdmin && task.owner_id !== userId) {
    throw new Error('Unauthorized to cancel this task.');
  }

  if (task.status === 'COMPLETED') {
    throw new Error('Cannot cancel a completed task.');
  }

  const res = await query(
    `UPDATE tasks SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1 RETURNING *`,
    [taskId]
  );
  return res.rows[0];
}
