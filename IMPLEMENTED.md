# PRAYASPRO — DBMS Level 3 Implementation & Viva Guide

> **Project Title**: PrayasPro — Skill-Based Micro-Task Marketplace for Students  
> **Database**: PostgreSQL 18.6 (Port 5432, Database: `prayaspro`)  
> **Vector Engine**: PostgreSQL `vector` Type + Native `<=>` Cosine Distance Operator (384 Dimensions)  
> **Backend**: Node.js, Express, TypeScript, Connection Pooling (`pg`), JWT Auth, bcrypt  
> **Frontend**: Next.js 14 App Router, TypeScript, Responsive Component UI  

---

## 1. Evaluation Rubric Compliance Checklist (14 / 14 Completed)

| Column | Topic in Evaluation Rubric | Marks | Status in PrayasPro | Where to Verify |
| :---: | :--- | :---: | :---: | :--- |
| **H** | **ER diagram** | 2 | **100% COMPLETE** | `erdiagram.svg`, `PrayasPro_ER_Relational.drawio.svg`, and Section 3 |
| **I** | **Relational schema with keys & constraints** | 3 | **100% COMPLETE** | `relationalschema.svg`, `schema.sql`, 3NF/BCNF normalization proof |
| **J** | **SQL database implementation - DDL** | 4 | **100% COMPLETE** | 7 versioned migrations (`001` to `007`) in `backend/src/db/migrations/` |
| **K** | **NoSQL / Vector database creation** | 4 | **100% COMPLETE** | `content_embeddings` table with `vector(384)` type, cosine distance operator |
| **L** | **Technology justification** | 1 | **100% COMPLETE** | Section 2: PostgreSQL + pgvector eliminates 2-phase commit & enables hybrid queries |
| **M** | **DML operations** | 4 | **100% COMPLETE** | Full INSERT, UPDATE, DELETE, and SELECT operations in application flow |
| **N** | **Nested/correlated/Recursive Queries, Joins** | 4 | **100% COMPLETE** | 3-table joins, double FK joins, correlated subqueries, **Recursive Query (`WITH RECURSIVE`)** |
| **O** | **Advanced SQL (Proc/func, trigger, CTE)** | 6 | **100% COMPLETE** | `fn_accept_application_transaction`, triggers, views, and **Multi-Stage CTEs** |
| **P** | **NoSQL / Vector feature, RUD** | 7 | **100% COMPLETE** | Semantic similarity matching plus **Full RUD** (Read, Update, Delete) endpoints & UI |
| **Q** | **Next.js interface** | 3 | **100% COMPLETE** | Next.js 14 App Router with 14 static and dynamic routes compiling cleanly |
| **R** | **Backend/API & database integration** | 2 | **100% COMPLETE** | Decoupled Express REST API with connection pooling (`pg.Pool`) and parameterization |
| **S** | **Auth & Role-Based Access Control in DB** | 4 | **100% COMPLETE** | JWT auth with 2 roles (`STUDENT`, `ADMIN`) + **PostgreSQL Engine-Level RBAC** with grants |
| **T** | **Documentation, Git/GitHub** | 2 | **100% COMPLETE** | Comprehensive `PROJECT_REPORT.md`, `IMPLEMENTED.md`, `README.md`, `DEMO_GUIDE.md` |
| **U** | **Originality & Viva Readiness** | 4 | **100% COMPLETE** | Original campus gig domain, interactive `/db-showcase` runner, 14-step automated flow |

---

## 2. Quick Project Summary (Elevator Pitch for Viva)

PrayasPro is a micro-task freelancing platform designed exclusively for college students. It connects:
1. **Task Owner (Student A)**: Needs a task done (e.g., event poster, Python scraper, report formatting).
2. **Worker (Student B)**: Has verified skills and wants to complete the task for payment and ratings.

### Complete Lifecycle Flow:
$$\text{Post Task} \longrightarrow \text{Receive Applications} \longrightarrow \text{Accept Applicant (Transaction)} \longrightarrow \text{Assign (1:1)} \longrightarrow \text{In Progress} \longrightarrow \text{Submit} \longrightarrow \text{Complete \& Pay (Transaction)} \longrightarrow \text{Review}$$

---

## 3. Database Architecture & Justification

* **Single Unified Database**: Both relational SQL data and AI vector embeddings live inside **PostgreSQL 18**.
* **Why PostgreSQL + pgvector instead of MongoDB?**
  1. Guaranteed **ACID transactions** for financial payouts and atomic task assignments.
  2. Eliminates distributed transaction issues between relational data and vector data.
  3. Hybrid queries: SQL filters (`category`, `budget`, `status = 'OPEN'`) run alongside vector similarity (`ORDER BY embedding <=> query_vector`).

---

## 4. Relational Schema (10 Core Entities)

Every entity matches `erdiagram.svg` and `PrayasPro_ER_Relational.drawio.svg`:

| # | Entity | Primary Key | Foreign Keys & Cardinality | Purpose & Constraints |
|---|---|---|---|---|
| 1 | **`users`** | `user_id` (UUID) | None | Students & Admins. `email` is UNIQUE, `password_hash` bcrypt. |
| 2 | **`skills`** | `skill_id` (UUID) | `parent_skill_id` $\to$ `skills` | Catalog of skills with prerequisite dependency tree. |
| 3 | **`student_skills`** | `student_skill_id` (UUID) | `user_id` $\to$ `users`, `skill_id` $\to$ `skills` | Resolves **M:M** between User and Skill. `UNIQUE(user_id, skill_id)`. |
| 4 | **`categories`** | `category_id` (UUID) | None | Task categories (Web Dev, Design, Data, Writing, etc.). |
| 5 | **`tasks`** | `task_id` (UUID) | `owner_id` $\to$ `users`, `category_id` $\to$ `categories` | Micro-tasks with `budget > 0`, `deadline`, and `status`. |
| 6 | **`applications`** | `application_id` (UUID) | `task_id` $\to$ `tasks`, `student_id` $\to$ `users` | Proposals submitted by students. `UNIQUE(task_id, student_id)`. |
| 7 | **`assignments`** | `assignment_id` (UUID) | `task_id` (UNIQUE) $\to$ `tasks`, `student_id` $\to$ `users` | **1:1** active contract. A task has at most 1 final assignment. |
| 8 | **`payments`** | `payment_id` (UUID) | `task_id` $\to$ `tasks`, `payer_id` $\to$ `users`, `receiver_id` $\to$ `users` | Financial record. **References `users` twice** (Payer & Receiver). |
| 9 | **`reviews`** | `review_id` (UUID) | `task_id` $\to$ `tasks`, `reviewer_id` $\to$ `users`, `reviewed_user_id` $\to$ `users` | Feedback record. **References `users` twice**. `rating CHECK (1..5)`. |
| 10 | **`content_embeddings`** | `embedding_id` (UUID) | `entity_id` (matches user/task UUID) | Vector database storage (`vector(384)`). |

---

## 5. Advanced DBMS Concepts Implemented (Viva Highlights)

### A. ACID Transactions
1. **Application Selection Transaction** (`fn_accept_application_transaction`):
   - Row-locks task (`FOR UPDATE`).
   - Updates selected application to `'ACCEPTED'`.
   - Bulk-updates other pending applications to `'REJECTED'`.
   - Inserts row into `assignments` (`status = 'ASSIGNED'`).
   - Updates `tasks.status = 'ASSIGNED'`.
2. **Completion & Payment Transaction** (`completeTaskAndReleasePayment`):
   - Atomically updates `assignments.status = 'COMPLETED'`.
   - Updates `tasks.status = 'COMPLETED'`.
   - Inserts verified `payments` record (`amount = budget`, `status = 'SUCCESS'`).

### B. Recursive Queries (`WITH RECURSIVE`) — Rubric Column N
Recursively traverses self-referencing prerequisite skill trees:
```sql
WITH RECURSIVE skill_tree AS (
    SELECT skill_id, skill_name, category, parent_skill_id, 1 AS depth_level, skill_name::TEXT AS dependency_path
    FROM skills WHERE parent_skill_id IS NULL
    UNION ALL
    SELECT child.skill_id, child.skill_name, child.category, child.parent_skill_id,
           parent.depth_level + 1, parent.dependency_path || ' ➔ ' || child.skill_name
    FROM skills child
    JOIN skill_tree parent ON child.parent_skill_id = parent.skill_id
)
SELECT * FROM skill_tree ORDER BY category, depth_level;
```

### C. Common Table Expressions (CTE) — Rubric Column O
Modular query architecture aggregating category metrics and top student earnings simultaneously:
```sql
WITH category_summary AS (
    SELECT category_id, COUNT(*) AS total_tasks, ROUND(AVG(budget), 2) AS avg_budget FROM tasks GROUP BY category_id
),
top_earners AS (
    SELECT receiver_id, SUM(amount) AS total_paid_out FROM payments WHERE payment_status = 'SUCCESS' GROUP BY receiver_id
)
SELECT ...
```

### D. Database Role-Based Access Control (PostgreSQL RBAC) — Rubric Column S
PostgreSQL engine-level roles created via Migration 007:
* **`prayaspro_student`**: Table SELECT grants, INSERT/UPDATE on applications, reviews, and student_skills; strict **`REVOKE ALL ON payments`** for financial escrow protection.
* **`prayaspro_admin`**: Full maintenance privileges across all tables and analytical views.
* **`prayaspro_auditor`**: Read-only access to all operational & financial tables.

### E. Vector Database RUD Operations — Rubric Column P (7 Marks)
* **Read**: Retrieve vector embeddings with dimension count and L2 norm (`GET /api/recommendations/embeddings`).
* **Update**: Re-embed and re-project content into 384-d normalized unit vector space (`PUT /api/recommendations/embeddings/:type/:id`).
* **Delete**: Remove vectors from `content_embeddings` (`DELETE /api/recommendations/embeddings/:type/:id`).
* **Interactive UI**: Dedicated Vector RUD Console available at `/recommendations`.

### F. Database Triggers
* **`trg_prevent_self_application`**: Blocks a student from applying to a task they own.
* **`trg_validate_task_status`**: Rejects proposals if `tasks.status != 'OPEN'`.
* **`trg_update_task_timestamp`**: Automatically updates `tasks.updated_at` on modification.

### G. Database Views
* **`view_student_performance`**: Computes total skills, applications, completed tasks, earnings, average rating, and review count per student using CTE/subqueries (avoids Cartesian explosion).
* **`view_task_marketplace_stats`**: Aggregates tasks, open tasks, budget volume, and average budget by category.
* **`view_student_earnings_ledger`**: Complete audit ledger of all successful payouts joining payer and receiver students.
* **`view_top_rated_freelancers`**: Ranked leaderboard of students with reviews and completed jobs.
* **`view_skill_prerequisite_hierarchy`**: Recursive view displaying skill learning dependency chains.
* **`view_database_rbac_privileges`**: Real-time inspection of database role permissions.

---

## 6. Commands to Demonstrate to Evaluators

### Backend Tests (in `Prayaspro/backend`):
```bash
# 1. Run the Complete 14-Step Lifecycle Demo Flow (Proves end-to-end functionality & ACID)
npm run test:flow

# 2. Run the Academic SQL Query Suite (JOINs, GROUP BY, HAVING, Subqueries, Recursive CTE, RBAC, Vector RUD)
npm run test:queries

# 3. Test Database Reset & Migration Reproducibility
npm run db:reset

# 4. Start the Backend API Server (Port 5001)
npm run dev
```

### Frontend Web Application (in `Prayaspro/frontend`):
```bash
# Start the Next.js Frontend (Port 3000)
npm run dev
```

---

## 7. Frontend Interactive Viva Routes (`http://localhost:3000`)

| Route | Feature Demonstrated | Evaluator Talking Point |
|---|---|---|
| `/` | Landing page | Live SSR metrics directly queried from PostgreSQL database view. |
| `/tasks` | Task Directory | Multi-filtering by category, status, and budget range. |
| `/tasks/[id]` | Task Details & Proposals | Shows task specifications, applicant proposals, and ACID application acceptance. |
| `/tasks/create` | Post Micro-Task | Automatically computes and registers a 384-dimensional vector embedding. |
| `/assignments/[id]` | Interactive Contract Workspace | 4-step contract lifecycle: Assigned $\to$ In Progress $\to$ Deliverable Submitted $\to$ Approved & Paid $\to$ 5-Star Review. |
| `/dashboard` | Student Profile & Skills | Competency manager with live calculations from `fn_calculate_student_rating` & `fn_calculate_student_earnings`. |
| `/recommendations` | pgvector Cosine Search & **Vector RUD Console** | Real-time semantic matching explorer displaying `<=>` cosine distance, plus full **Read, Update, Delete** vector operations. |
| `/admin` | Supervisor Console | Platform metrics, user active toggles, and payment audit ledger (`view_student_earnings_ledger`). |
| `/db-showcase` | DBMS Viva Console | Interactive academic benchmark runner executing 10 queries live with execution times (ms) and **`EXPLAIN (ANALYZE, BUFFERS)`** query plan profiler. |

### 1-Click Quick Demo Personas (Top Bar):
* **Aarav Sharma** (`aarav@pesu.edu`): Task Poster (PESU)
* **Ananya Rao** (`ananya@bmsce.edu`): 5-Star Freelancer & Designer (BMSCE)
* **Priya Nair** (`priya@pesu.edu`): AI & ML Student Specialist (PESU)
* **Admin Supervisor** (`admin@prayaspro.edu`): Platform Supervisor (Audit & Views)
