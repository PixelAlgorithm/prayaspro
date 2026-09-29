import { query } from '../db/connection';

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
    ORDER BY t.budget DESC;
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
    ORDER BY t.budget DESC;
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
  console.log('\n>>> [QUERY 5: Window Functions - RANK() OVER PARTITION]');
  console.log('Prompt: Rank tasks within each category based on budget using window functions');
  const q5 = await query(`
    SELECT 
      c.category_name,
      t.title,
      t.budget,
      DENSE_RANK() OVER (PARTITION BY t.category_id ORDER BY t.budget DESC) AS budget_rank_in_category
    FROM tasks t
    JOIN categories c ON t.category_id = c.category_id
    ORDER BY c.category_name, budget_rank_in_category;
  `);
  console.table(q5.rows);

  // Query 6: VECTOR SIMILARITY QUERY (<=>)
  console.log('\n>>> [QUERY 6: Vector Cosine Distance Search (<=>)]');
  console.log('Prompt: Find top 3 semantically closest tasks to Student Ananya (Design specialist)');
  const q6 = await query(`
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
    ORDER BY cosine_distance ASC
    LIMIT 3;
  `);
  console.table(q6.rows);

  console.log('========================================================================');
  console.log(' ALL 6 ADVANCED ACADEMIC SQL QUERIES EXECUTED SUCCESSFULLY!            ');
  console.log('========================================================================');
}

runAcademicQueries()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Query suite error:', err);
    process.exit(1);
  });
