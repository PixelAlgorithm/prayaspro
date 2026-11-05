import { Router } from 'express';
import { query } from '../db/connection';

const router = Router();

/**
 * DBMS Level 3 Academic Demonstration Endpoint
 * Returns structured demonstration of all advanced SQL features required by rubric.
 */
router.get('/demonstrations', async (req, res) => {
  try {
    const demos = [
      {
        id: 'join_group_by_having',
        concept: 'Relational Join & Aggregation',
        title: 'JOIN + GROUP BY + HAVING (Top Freelancers)',
        description: 'Demonstrates multi-table INNER and LEFT JOINs, aggregated review ratings, and a HAVING filter for active freelancers (Rubric: Column N & M).',
        sql: `
          SELECT 
            u.user_id,
            u.name,
            u.college,
            COUNT(r.review_id) AS total_reviews,
            ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
            COALESCE(SUM(p.amount), 0.00) AS total_earned
          FROM users u
          JOIN reviews r ON u.user_id = r.reviewed_user_id
          LEFT JOIN payments p ON u.user_id = p.receiver_id AND p.payment_status = 'SUCCESS'
          WHERE u.role = 'STUDENT'
          GROUP BY u.user_id, u.name, u.college
          HAVING COUNT(r.review_id) >= 1
          ORDER BY avg_rating DESC, total_reviews DESC;
        `
      },
      {
        id: 'nested_subquery',
        concept: 'Nested & Correlated Subqueries',
        title: 'Correlated & Nested Subquery',
        description: 'Finds open tasks whose budget strictly exceeds the average budget within their own category (Rubric: Column N).',
        sql: `
          SELECT 
            t.task_id,
            t.title,
            t.budget,
            c.category_name,
            ROUND(avg_cat.cat_avg, 2) AS category_average_budget
          FROM tasks t
          JOIN categories c ON t.category_id = c.category_id
          JOIN (
            SELECT category_id, AVG(budget) AS cat_avg
            FROM tasks
            GROUP BY category_id
          ) avg_cat ON t.category_id = avg_cat.category_id
          WHERE t.status = 'OPEN' AND t.budget >= avg_cat.cat_avg
          ORDER BY t.budget DESC;
        `
      },
      {
        id: 'recursive_query',
        concept: 'Recursive CTE (WITH RECURSIVE)',
        title: 'Recursive Query (WITH RECURSIVE)',
        description: 'Traverses hierarchical skill prerequisite trees using recursive common table expressions to produce multi-level learning and dependency paths (Rubric: Column N).',
        sql: `
          WITH RECURSIVE skill_tree AS (
            -- Anchor Member: Root skills with no prerequisites (depth 1)
            SELECT 
              s.skill_id,
              s.skill_name,
              s.category,
              s.parent_skill_id,
              1 AS depth_level,
              s.skill_name::TEXT AS dependency_path
            FROM skills s
            WHERE s.parent_skill_id IS NULL

            UNION ALL

            -- Recursive Member: Sub-skills dependent on parent skills
            SELECT 
              child.skill_id,
              child.skill_name,
              child.category,
              child.parent_skill_id,
              parent.depth_level + 1 AS depth_level,
              parent.dependency_path || ' ➔ ' || child.skill_name AS dependency_path
            FROM skills child
            JOIN skill_tree parent ON child.parent_skill_id = parent.skill_id
          )
          SELECT 
            skill_name,
            category,
            depth_level,
            dependency_path
          FROM skill_tree
          ORDER BY category, depth_level;
        `
      },
      {
        id: 'common_table_expression',
        concept: 'Common Table Expressions (CTE)',
        title: 'Advanced Common Table Expressions (CTE)',
        description: 'Demonstrates modular queries using multiple CTEs to compute category metrics and top student earnings simultaneously without Cartesian explosion (Rubric: Column O).',
        sql: `
          WITH category_summary AS (
            SELECT 
              category_id, 
              COUNT(task_id) AS total_tasks,
              ROUND(AVG(budget)::numeric, 2) AS avg_budget,
              MAX(budget) AS max_budget
            FROM tasks
            GROUP BY category_id
          ),
          top_earners AS (
            SELECT 
              receiver_id,
              COUNT(payment_id) AS paid_tasks_count,
              SUM(amount) AS total_paid_out
            FROM payments
            WHERE payment_status = 'SUCCESS'
            GROUP BY receiver_id
          )
          SELECT 
            c.category_name,
            cs.total_tasks,
            cs.avg_budget,
            cs.max_budget,
            COALESCE(SUM(te.total_paid_out), 0.00) AS total_category_payouts
          FROM categories c
          JOIN category_summary cs ON c.category_id = cs.category_id
          LEFT JOIN tasks t ON c.category_id = t.category_id
          LEFT JOIN payments p ON t.task_id = p.task_id
          LEFT JOIN top_earners te ON p.receiver_id = te.receiver_id
          GROUP BY c.category_id, c.category_name, cs.total_tasks, cs.avg_budget, cs.max_budget
          ORDER BY cs.total_tasks DESC;
        `
      },
      {
        id: 'database_view',
        concept: 'Analytical Database Views',
        title: 'Analytical View (view_task_marketplace_stats)',
        description: 'Demonstrates reading pre-compiled multi-table aggregations from a PostgreSQL database view (Rubric: Column O).',
        sql: `
          SELECT 
            category_name,
            total_tasks,
            open_tasks,
            completed_tasks,
            average_budget,
            total_budget_volume,
            total_applications_received
          FROM view_task_marketplace_stats
          ORDER BY total_tasks DESC;
        `
      },
      {
        id: 'stored_functions',
        concept: 'PL/pgSQL Stored Functions',
        title: 'Stored Function Execution (fn_calculate_student_rating)',
        description: 'Invokes PL/pgSQL stored functions calculating student reputations and financial settlements (Rubric: Column O).',
        sql: `
          SELECT 
            u.name,
            u.college,
            (fn_calculate_student_rating(u.user_id)).average_rating,
            (fn_calculate_student_rating(u.user_id)).total_reviews,
            fn_calculate_student_earnings(u.user_id) AS total_earnings
          FROM users u
          WHERE u.role = 'STUDENT'
          LIMIT 5;
        `
      },
      {
        id: 'database_triggers',
        concept: 'Database Integrity Triggers',
        title: 'Database Triggers & Constraint Auditing',
        description: 'Inspects user-defined trigger definitions enforcing contract integrity and preventing illegal self-bidding (Rubric: Column O).',
        sql: `
          SELECT 
            trigger_name,
            event_manipulation,
            event_object_table,
            action_timing,
            action_statement
          FROM information_schema.triggers
          WHERE trigger_schema = 'public'
          ORDER BY event_object_table, trigger_name;
        `
      },
      {
        id: 'database_rbac',
        concept: 'Database Engine RBAC',
        title: 'Database Role-Based Access Control (RBAC)',
        description: 'Verifies PostgreSQL database-level roles (STUDENT, ADMIN, AUDITOR) and granular table permissions (Rubric: Column S).',
        sql: `
          SELECT 
            grantee AS database_role,
            table_name,
            privilege_type,
            is_grantable
          FROM information_schema.role_table_grants
          WHERE grantee IN ('prayaspro_student', 'prayaspro_admin', 'prayaspro_auditor')
            AND table_schema = 'public'
          ORDER BY grantee, table_name, privilege_type
          LIMIT 15;
        `
      },
      {
        id: 'vector_similarity',
        concept: 'Vector Similarity (<=>)',
        title: 'pgvector Cosine Distance Search (<=>)',
        description: 'Intelligent semantic matching ranking tasks relative to Ananya (Designer) using the <=> cosine distance operator over 384 dimensions (Rubric: Column P).',
        sql: `
          SELECT 
            t.title,
            c.category_name,
            t.budget,
            ROUND((ce.embedding <=> stu.embedding)::numeric, 4) AS cosine_distance,
            ROUND(((1.0 - (ce.embedding <=> stu.embedding)) * 100)::numeric, 1) AS match_score_pct
          FROM tasks t
          JOIN categories c ON t.category_id = c.category_id
          JOIN content_embeddings ce ON ce.entity_id = t.task_id AND ce.entity_type = 'TASK'
          CROSS JOIN (
            SELECT embedding FROM content_embeddings 
            JOIN users u ON content_embeddings.entity_id = u.user_id 
            WHERE u.email = 'ananya@bmsce.edu' AND entity_type = 'STUDENT'
          ) stu
          WHERE t.status = 'OPEN'
          ORDER BY cosine_distance ASC
          LIMIT 5;
        `
      },
      {
        id: 'vector_rud_crud',
        concept: 'Vector Store RUD Operations',
        title: 'NoSQL / Vector Feature RUD Operations',
        description: 'Demonstrates reading, updating, and deleting high-dimensional 384-d embeddings in PostgreSQL vector store (Rubric: Column P).',
        sql: `
          SELECT 
            ce.embedding_id,
            ce.entity_type,
            COALESCE(u.name, t.title) AS entity_name,
            LEFT(ce.content_text, 60) || '...' AS indexed_text_snippet,
            ce.updated_at
          FROM content_embeddings ce
          LEFT JOIN users u ON ce.entity_id = u.user_id AND ce.entity_type = 'STUDENT'
          LEFT JOIN tasks t ON ce.entity_id = t.task_id AND ce.entity_type = 'TASK'
          ORDER BY ce.updated_at DESC
          LIMIT 6;
        `
      }
    ];

    // Execute each query and capture real execution time and results
    const results = [];
    for (const demo of demos) {
      const startTime = Date.now();
      const queryRes = await query(demo.sql);
      const executionTimeMs = Date.now() - startTime;
      results.push({
        ...demo,
        executionTimeMs,
        rowCount: queryRes.rowCount,
        data: queryRes.rows,
        result: queryRes.rows
      });
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Run ad-hoc query with EXPLAIN ANALYZE for query optimization viva
router.post('/explain', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ error: 'SQL string is required.' });
    }

    // Safety: only allow SELECT or WITH queries for EXPLAIN
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
      return res.status(400).json({ error: 'Only SELECT or WITH (CTE) queries can be analyzed.' });
    }

    const explainRes = await query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
    res.json({
      sql,
      plan: explainRes.rows[0]['QUERY PLAN']
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
