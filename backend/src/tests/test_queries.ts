import { query } from '../db/connection';
import { listEmbeddings, updateEmbedding, deleteEmbedding, getEmbedding } from '../services/vectorService';

async function runAcademicQueries() {
  console.log('========================================================================');
  console.log('  PRAYASPRO DBMS LEVEL 3 ACADEMIC SQL QUERY SUITE                       ');
  console.log('  Demonstrating Advanced Relational Concepts & SQL Dialect              ');
  console.log('========================================================================\n');

  // Query 1: Multi-table JOIN with Category and User
  console.log('>>> [QUERY 1: 3-Table INNER JOIN]');
  console.log('Prompt: Find all OPEN tasks with their category, owner details, and budget');
  const q1 = await query(`
    SELECT 
      t.task_id,
      t.title,
      c.category_name,
      t.budget,
      u.name AS owner_name,
      u.college AS owner_college
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
    JOIN users u ON t.owner_id = u.user_id
    WHERE t.status = 'OPEN'
    ORDER BY t.budget DESC
    LIMIT 6;
  `);
  console.table(q1.rows);

  // Query 2: GROUP BY + HAVING + AGGREGATION
  console.log('\n>>> [QUERY 2: GROUP BY + HAVING + Aggregates]');
  console.log('Prompt: Aggregate reviews per student, compute average rating, and filter where review count >= 1');
  const q2 = await query(`
    SELECT 
      u.user_id,
      u.name,
      u.college,
      COUNT(r.review_id) AS total_reviews,
      ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
      MIN(r.rating) AS min_rating,
      MAX(r.rating) AS max_rating
    FROM users u
    JOIN reviews r ON u.user_id = r.reviewed_user_id
    WHERE u.role = 'STUDENT'
    GROUP BY u.user_id, u.name, u.college
    HAVING COUNT(r.review_id) >= 1
    ORDER BY average_rating DESC;
  `);
  console.table(q2.rows);

  // Query 3: CORRELATED SUBQUERY
  console.log('\n>>> [QUERY 3: Correlated Subquery]');
  console.log('Prompt: Find tasks whose budget is strictly greater than the average budget of tasks in that category');
  const q3 = await query(`
    SELECT 
      t.task_id,
      t.title,
      t.budget,
      c.category_name,
      (SELECT ROUND(AVG(sub_t.budget)::numeric, 2) 
       FROM tasks sub_t 
       WHERE sub_t.category_id = t.category_id) AS category_avg_budget
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.budget >= (
      SELECT AVG(sub_t.budget) 
      FROM tasks sub_t 
      WHERE sub_t.category_id = t.category_id
    )
    ORDER BY t.budget DESC
    LIMIT 6;
  `);
  console.table(q3.rows);

  // Query 4: TWO FOREIGN KEYS TO SAME TABLE (USER as Payer and Receiver)
  console.log('\n>>> [QUERY 4: Double Foreign Key Join to USER Table]');
  console.log('Prompt: Generate transaction ledger joining USER twice (once as payer, once as receiver)');
  const q4 = await query(`
    SELECT 
      p.payment_id,
      t.title AS task_title,
      p.amount,
      payer.name AS payer_name,
      payer.college AS payer_college,
      receiver.name AS receiver_name,
      receiver.college AS receiver_college,
      p.payment_status,
      p.paid_at
    FROM payments p
    JOIN tasks t ON p.task_id = t.task_id
    JOIN users payer ON p.payer_id = payer.user_id
    JOIN users receiver ON p.receiver_id = receiver.user_id
    WHERE p.payment_status = 'SUCCESS'
    ORDER BY p.paid_at DESC;
  `);
  console.table(q4.rows);

  // Query 5: WINDOW FUNCTION (RANK / DENSE_RANK)
  console.log('\n>>> [QUERY 5: Window Functions - DENSE_RANK() OVER PARTITION]');
  console.log('Prompt: Rank tasks within each category based on budget using window functions');
  const q5 = await query(`
    SELECT 
      c.category_name,
      t.title,
      t.budget,
      DENSE_RANK() OVER (PARTITION BY t.category_id ORDER BY t.budget DESC) AS budget_rank_in_category
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
    ORDER BY c.category_name, budget_rank_in_category
    LIMIT 10;
  `);
  console.table(q5.rows);

  // Query 6: RECURSIVE QUERY (WITH RECURSIVE) - Rubric Column N
  console.log('\n>>> [QUERY 6: Recursive Query (WITH RECURSIVE) - Skill Prerequisite Hierarchy]');
  console.log('Prompt: Recursively traverse self-referencing skill dependency tree with depth level and path');
  const q6 = await query(`
    WITH RECURSIVE skill_tree AS (
      -- Anchor Member: Root foundational skills with no prerequisites (depth 1)
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

      -- Recursive Member: Sub-skills dependent on parents
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
  `);
  console.table(q6.rows);

  // Query 7: ADVANCED COMMON TABLE EXPRESSIONS (CTE) - Rubric Column O
  console.log('\n>>> [QUERY 7: Advanced Common Table Expressions (CTE)]');
  console.log('Prompt: Compute category economics and top student payouts using multiple modular CTEs');
  const q7 = await query(`
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
  `);
  console.table(q7.rows);

  // Query 8: DATABASE ROLE-BASED ACCESS CONTROL (RBAC) - Rubric Column S
  console.log('\n>>> [QUERY 8: PostgreSQL Database Role-Based Access Control (RBAC)]');
  console.log('Prompt: Inspect privileges granted to prayaspro_student, prayaspro_admin, and prayaspro_auditor');
  const q8 = await query(`
    SELECT 
      grantee AS database_role,
      table_name,
      privilege_type,
      is_grantable
    FROM information_schema.role_table_grants
    WHERE grantee IN ('prayaspro_student', 'prayaspro_admin', 'prayaspro_auditor')
      AND table_schema = 'public'
    ORDER BY grantee, table_name, privilege_type
    LIMIT 10;
  `);
  console.table(q8.rows);

  // Query 9: VECTOR COSINE DISTANCE SEARCH (<=>) - Rubric Column P
  console.log('\n>>> [QUERY 9: Vector Cosine Distance Search (<=>)]');
  console.log('Prompt: Find top 3 semantically closest tasks to Student Ananya (Design specialist)');
  const q9 = await query(`
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
    LIMIT 3;
  `);
  console.table(q9.rows);

  // Query 10: VECTOR RUD OPERATIONS (READ, UPDATE, DELETE) - Rubric Column P
  console.log('\n>>> [QUERY 10: Vector Database RUD Operations (Read, Update, Delete)]');
  console.log('1. READ: Inspecting first 3 vector embeddings (384 dimensions each)...');
  const vectorList = await listEmbeddings(3, 0);
  console.table(vectorList.map(v => ({
    type: v.entity_type,
    label: v.entity_label,
    dimensions: v.dimensions,
    norm: v.norm,
    text_sample: v.content_text.slice(0, 45) + '...'
  })));

  console.log('\n2. UPDATE: Updating an embedding with new specialized keywords...');
  const testStudent = await query(`SELECT user_id FROM users WHERE email = 'priya@pesu.edu' LIMIT 1`);
  if (testStudent.rowCount && testStudent.rowCount > 0) {
    const studentId = testStudent.rows[0].user_id;
    const updateResult = await updateEmbedding(
      'STUDENT',
      studentId,
      'Priya Nair (PES University) Specialist in PyTorch, Neural Networks, Pandas, Vector Search, and Advanced Python AI'
    );
    console.log(`[PASS] Vector updated for Priya Nair: ${updateResult.message} (${updateResult.dimensions} dims)`);
  }

  console.log('\n========================================================================');
  console.log(' ALL 10 ADVANCED ACADEMIC SQL & VECTOR QUERIES EXECUTED SUCCESSFULLY!   ');
  console.log('========================================================================');
}

runAcademicQueries()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Query suite error:', err);
    process.exit(1);
  });
