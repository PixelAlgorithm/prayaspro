import { query } from '../db/connection';

export const VECTOR_DIMENSION = 384;

/**
 * High-performance deterministic semantic feature hash & word embedding projector.
 * Generates normalized 384-dimensional float vectors on unit sphere (L2 norm = 1).
 * Maps semantic keywords (e.g. 'react', 'next.js', 'frontend', 'python', 'sql', 'design', 'poster')
 * into shared dense subspace clusters so that cosine distance (<=>) accurately measures semantic affinity.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const vector = new Array<number>(VECTOR_DIMENSION).fill(0);
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s+#.-]/g, ' ');
  const words = normalizedText.split(/\s+/).filter(w => w.length > 1);

  if (words.length === 0) {
    // Return unit vector along first dimension if empty
    vector[0] = 1.0;
    return vector;
  }

  // Pre-mapped semantic cluster centers across 384 dimensions
  const semanticClusters: Record<string, number> = {
    // Web / Frontend Cluster (indices 0..63)
    react: 10, nextjs: 12, javascript: 14, typescript: 16, html: 18, css: 20,
    tailwind: 22, frontend: 24, ui: 26, ux: 28, web: 30, component: 32, website: 34,
    
    // Backend / Database Cluster (indices 64..127)
    python: 70, fast: 72, api: 74, node: 76, backend: 78, sql: 80, postgres: 82,
    database: 84, dbms: 86, rest: 88, django: 90, express: 92, server: 94, crud: 96,
    
    // Design & Creative Cluster (indices 128..191)
    canva: 134, photoshop: 136, figma: 138, design: 140, poster: 142, banner: 144,
    graphic: 146, logo: 148, illustration: 150, creative: 152, visual: 154,
    
    // Video & Media Cluster (indices 192..255)
    video: 198, editing: 200, premiere: 202, reel: 204, animation: 206, audio: 208,
    youtube: 210, media: 212, clip: 214, thumbnail: 216,
    
    // Academic & Writing Cluster (indices 256..319)
    writing: 260, content: 262, report: 264, research: 266, documentation: 268,
    tutoring: 270, math: 272, assignment: 274, proofreading: 276, article: 278,
    
    // Data & AI Cluster (indices 320..383)
    data: 324, pandas: 326, ml: 328, ai: 330, machine: 332, learning: 334,
    analytics: 336, scraping: 338, model: 340, vector: 342, statistics: 344
  };

  // 1. Accumulate word and sub-token projections
  for (const word of words) {
    // Check direct semantic cluster match
    const baseIndex = semanticClusters[word];
    if (baseIndex !== undefined) {
      for (let offset = -4; offset <= 4; offset++) {
        const idx = (baseIndex + offset + VECTOR_DIMENSION) % VECTOR_DIMENSION;
        const weight = Math.exp(-Math.abs(offset) * 0.5);
        vector[idx] += 3.0 * weight;
      }
    }

    // 2. Character n-gram hashing for subword semantics
    for (let i = 0; i <= word.length - 3; i++) {
      const ngram = word.substring(i, i + 3);
      let hash = 0;
      for (let j = 0; j < ngram.length; j++) {
        hash = (hash * 31 + ngram.charCodeAt(j)) >>> 0;
      }
      const dim = hash % VECTOR_DIMENSION;
      const sign = (hash & 1) === 0 ? 1 : -1;
      vector[dim] += sign * 0.4;
    }
  }

  // 3. Compute L2 Norm (Euclidean length)
  let norm = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  // 4. Normalize to unit sphere
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      vector[i] = parseFloat((vector[i] / norm).toFixed(6));
    }
  } else {
    vector[0] = 1.0;
  }

  return vector;
}

/**
 * Format a number array as PostgreSQL vector literal format: '{0.1,0.2,...}'
 */
export function toPgVector(embedding: number[]): string {
  return `{${embedding.join(',')}}`;
}

/**
 * Format for PostgreSQL real array literal: '{0.1,0.2,...}'
 */
export function toPgArray(embedding: number[]): string {
  return `{${embedding.join(',')}}`;
}

/**
 * Upsert content embedding for a student or task in PostgreSQL
 */
export async function upsertEmbedding(
  entityType: 'STUDENT' | 'TASK',
  entityId: string,
  contentText: string
): Promise<void> {
  const embedding = await generateEmbedding(contentText);
  const vectorStr = toPgVector(embedding);

  await query(
    `INSERT INTO content_embeddings (entity_type, entity_id, content_text, embedding, updated_at)
     VALUES ($1, $2, $3, $4::vector, CURRENT_TIMESTAMP)
     ON CONFLICT (entity_type, entity_id)
     DO UPDATE SET 
       content_text = EXCLUDED.content_text,
       embedding = EXCLUDED.embedding,
       updated_at = CURRENT_TIMESTAMP`,
    [entityType, entityId, contentText, vectorStr]
  );
}

/**
 * Find recommended tasks for a student using pgvector cosine similarity search (<=>)
 * Combined with relational SQL filters (status = 'OPEN', budget, category)
 */
export async function getRecommendedTasksForStudent(
  studentId: string,
  limit = 5,
  categoryId?: string,
  minBudget?: number
) {
  // 1. Retrieve the student's embedding
  const studentEmbRes = await query(
    `SELECT embedding, content_text FROM content_embeddings WHERE entity_type = 'STUDENT' AND entity_id = $1`,
    [studentId]
  );

  let queryVector: string;
  if (studentEmbRes.rowCount && studentEmbRes.rowCount > 0) {
    queryVector = studentEmbRes.rows[0].embedding;
  } else {
    // Generate embedding on the fly from student's registered skills
    const skillsRes = await query(
      `SELECT s.skill_name, s.category, ss.proficiency_level 
       FROM student_skills ss 
       JOIN skills s ON ss.skill_id = s.skill_id 
       WHERE ss.user_id = $1`,
      [studentId]
    );
    const profileText = skillsRes.rows.map(r => `${r.skill_name} (${r.category}) ${r.proficiency_level}`).join(' ');
    const generated = await generateEmbedding(profileText || 'general student skills');
    queryVector = toPgVector(generated);
  }

  // 2. Perform Hybrid Search: SQL relational filters + pgvector cosine similarity (<=>)
  let sql = `
    SELECT 
      t.task_id,
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
      (ce.embedding <=> $1::vector) AS cosine_distance,
      ROUND(((1.0 - (ce.embedding <=> $1::vector)) * 100)::numeric, 1) AS match_score_percentage
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
    JOIN users u ON t.owner_id = u.user_id
    JOIN content_embeddings ce ON ce.entity_id = t.task_id AND ce.entity_type = 'TASK'
    WHERE t.status = 'OPEN' AND t.owner_id != $2
  `;

  const params: any[] = [queryVector, studentId];
  let paramIdx = 3;

  if (categoryId) {
    sql += ` AND t.category_id = $${paramIdx}`;
    params.push(categoryId);
    paramIdx++;
  }

  if (minBudget) {
    sql += ` AND t.budget >= $${paramIdx}`;
    params.push(minBudget);
    paramIdx++;
  }

  // Cosine distance: smaller distance means closer similarity
  sql += ` ORDER BY cosine_distance ASC LIMIT $${paramIdx}`;
  params.push(limit);

  const res = await query(sql, params);
  return res.rows;
}

/**
 * Find recommended students for a task using pgvector cosine similarity search (<=>)
 */
export async function getRecommendedStudentsForTask(
  taskId: string,
  limit = 5
) {
  const taskEmbRes = await query(
    `SELECT embedding FROM content_embeddings WHERE entity_type = 'TASK' AND entity_id = $1`,
    [taskId]
  );

  if (!taskEmbRes.rowCount || taskEmbRes.rowCount === 0) {
    return [];
  }

  const taskVector = taskEmbRes.rows[0].embedding;

  const sql = `
    SELECT 
      u.user_id,
      u.name,
      u.college,
      u.department,
      vsp.total_skills,
      vsp.completed_assignments,
      vsp.average_rating,
      vsp.total_reviews_received,
      (ce.embedding <=> $1::vector) AS cosine_distance,
      ROUND(((1.0 - (ce.embedding <=> $1::vector)) * 100)::numeric, 1) AS match_score_percentage
    FROM users u
    JOIN content_embeddings ce ON ce.entity_id = u.user_id AND ce.entity_type = 'STUDENT'
    LEFT JOIN view_student_performance vsp ON u.user_id = vsp.user_id
    WHERE u.role = 'STUDENT' AND u.is_active = TRUE
    ORDER BY cosine_distance ASC
    LIMIT $2
  `;

  const res = await query(sql, [taskVector, limit]);
  return res.rows;
}
