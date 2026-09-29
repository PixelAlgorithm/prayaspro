"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../db/connection");
const router = (0, express_1.Router)();
/**
 * DBMS Level 3 Academic Demonstration Endpoint
 * Returns structured demonstration of all advanced SQL features required by rubric.
 */
router.get('/demonstrations', async (req, res) => {
    try {
        const demos = [
            {
                id: 'join_group_by_having',
                title: 'JOIN + GROUP BY + HAVING (Top Freelancers)',
                description: 'Demonstrates multi-table INNER and LEFT JOINs, aggregated review ratings, and a HAVING filter for active freelancers.',
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
                title: 'Subquery with Correlated Filtering',
                description: 'Finds open tasks whose budget exceeds the average budget within their own category.',
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
                id: 'database_view',
                title: 'Analytical View (view_task_marketplace_stats)',
                description: 'Demonstrates reading pre-compiled analytics from a PostgreSQL database view.',
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
                title: 'Stored Function Execution (fn_calculate_student_rating)',
                description: 'Invokes a PL/pgSQL stored function calculating ratings for a student.',
                sql: `
          SELECT 
            u.name,
            u.college,
            (fn_calculate_student_rating(u.user_id)).average_rating,
            (fn_calculate_student_rating(u.user_id)).total_reviews,
            fn_calculate_student_earnings(u.user_id) AS total_earnings
          FROM users u
          WHERE u.role = 'STUDENT'
          LIMIT 3;
        `
            },
            {
                id: 'vector_similarity',
                title: 'pgvector Cosine Distance Search (<=>)',
                description: 'Intelligent semantic matching ranking tasks relative to Ananya (Designer) using the <=> cosine distance operator.',
                sql: `
          SELECT 
            t.title,
            c.category_name,
            t.budget,
            (ce.embedding <=> stu.embedding) AS cosine_distance,
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
          ORDER BY cosine_distance ASC;
        `
            }
        ];
        // Execute each query and capture real execution time and results
        const results = [];
        for (const demo of demos) {
            const startTime = Date.now();
            const queryRes = await (0, connection_1.query)(demo.sql);
            const executionTimeMs = Date.now() - startTime;
            results.push({
                ...demo,
                executionTimeMs,
                rowCount: queryRes.rowCount,
                data: queryRes.rows
            });
        }
        res.json(results);
    }
    catch (err) {
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
        // Safety: only allow SELECT queries for EXPLAIN
        if (!sql.trim().toUpperCase().startsWith('SELECT')) {
            return res.status(400).json({ error: 'Only SELECT queries can be analyzed.' });
        }
        const explainRes = await (0, connection_1.query)(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
        res.json({
            sql,
            plan: explainRes.rows[0]['QUERY PLAN']
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
