# PRAYASPRO — Skill-Based Micro-Task Marketplace for Students
## DBMS Experiential Learning – Level 3 Comprehensive Project Report

**Course**: Database Management Systems (DBMS Level 3)  
**Institution**: PES University, Bengaluru  
**Domain**: Academic Crowdsourcing & Campus Micro-Gig Economy  
**Database Stack**: PostgreSQL 18.6 (Relational Engine) + `pgvector` (Vector Engine, 384 Dimensions)  
**Application Stack**: Next.js 14 (React 18, TypeScript, Vanilla CSS) + Node.js / Express Backend  

---

## 1. Executive Summary & Abstract

**PrayasPro** is an experiential student-centric micro-task marketplace designed to address a critical friction point across university campuses: students who require small-scale, urgent academic, technical, or creative assistance (such as lab code debugging, event poster design, LaTeX paper formatting, or data cleaning) struggle to find qualified campus peers, while skilled students lack a secure, localized platform to monetize their skills and establish a verified academic reputation.

Unlike generic freelancing portals, PrayasPro operates on strict academic integrity rules, micro-budget bands (₹200 – ₹3,000), and a hybrid database architecture combining **PostgreSQL 18** for transactional guarantees (ACID contracts, escrow payouts, relational triggers) and **pgvector** for high-dimensional semantic competence matching.

---

## 2. Evaluation Rubric Compliance Matrix (14 / 14 Criteria Satisfied)

| Column | Rubric Criterion | Weightage | PrayasPro Implementation & Artifacts |
| :---: | :--- | :---: | :--- |
| **H** | **ER diagram** | 2 | Complete ER diagram with 10 entities, cardinalities (1:1, 1:M, M:N), primary keys, and foreign keys. Available in `erdiagram.svg` and `PrayasPro_ER_Relational.drawio.svg`. |
| **I** | **Relational schema with keys & constraints** | 3 | Fully normalized 3NF/BCNF relational tables with strict PK, FK (`ON DELETE CASCADE`/`RESTRICT`), `CHECK`, and `UNIQUE` constraints. Available in `relationalschema.svg` and Section 4. |
| **J** | **SQL database implementation (DDL)** | 4 | Complete DDL scripts executed via versioned migrations (`001` through `007`) in `backend/src/db/migrations/` and `schema.sql`. |
| **K** | **NoSQL / Vector database creation** | 4 | Extension `vector` enabled in PostgreSQL; `content_embeddings` table created with 384-dimensional dense vectors on unit sphere ($L_2$ norm = 1.0). |
| **L** | **Technology justification** | 1 | Rigorous justification in Section 3: single unified PostgreSQL engine eliminates 2-phase commit latency and enables hybrid relational-vector SQL queries. |
| **M** | **DML operations** | 4 | Real-time `INSERT`, `UPDATE`, `DELETE`, and `SELECT` operations across users, tasks, applications, assignments, payments, reviews, and embeddings. |
| **N** | **Nested, Correlated, Recursive & Join Queries** | 4 | 3-table joins, double FK joins, correlated subqueries (`budget >= AVG(category)`), and Recursive CTEs (`WITH RECURSIVE skill_tree`) with depth tracking. |
| **O** | **Advanced SQL concepts (Proc/func, trigger, CTE)** | 6 | PL/pgSQL stored transaction (`fn_accept_application_transaction`), stored functions (`fn_calculate_student_rating`), triggers (`trg_prevent_self_application`), multi-table CTEs, and views. |
| **P** | **NoSQL / Vector feature, RUD** | 7 | Real-time semantic task & student recommendation using `<=>` cosine distance, plus complete **RUD** (Read, Update, Delete) vector endpoints and interactive UI console. |
| **Q** | **Next.js interface** | 3 | Next.js 14 App Router, responsive layout, task directory, dynamic contract workspace, 1-click demo personas, and interactive DBMS showcase console. |
| **R** | **Backend/API and database integration** | 2 | Decoupled Express.js REST API with connection pooling (`pg.Pool`), parameterized queries, strict environment variable separation, and error handling. |
| **S** | **Authentication & DB Role-Based Access Control** | 4 | Persistent JWT auth with minimum two roles (`STUDENT`, `ADMIN`), plus **PostgreSQL Engine-Level RBAC** (`prayaspro_student`, `prayaspro_admin`, `prayaspro_auditor`) with table grants. |
| **T** | **Documentation, Git/GitHub** | 2 | Clean git commits, `README.md`, setup instructions, `IMPLEMENTED.md`, `DEMO_GUIDE.md`, and this comprehensive report. |
| **U** | **Originality & Viva Readiness** | 4 | Original student campus micro-task economy domain, live query runner with `EXPLAIN (ANALYZE, BUFFERS)`, automated 14-step test flow, and instant viva demonstration routes. |

---

## 3. Problem Statement & Motivation

### 3.1 The Problem
In modern university environments:
1. Students frequently require rapid turnaround on specialized micro-deliverables (e.g., frontend components for hackathons, IEEE paper proofreading, survey dataset cleaning, club posters).
2. Existing global gig platforms (Upwork, Fiverr) impose steep commercial commission fees (20%), require bank verification inaccessible to students, and lack campus-level context.
3. Informal campus channels (WhatsApp groups, Discord) lack structured contracts, resulting in frequent payment defaults, ghosting, unverified skill claims, and lack of accountability.

### 3.2 Motivation & Objectives
The primary objectives of PrayasPro are:
- **Relational Integrity**: Enforce unambiguous contract lifecycles (`OPEN` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `SUBMITTED` $\to$ `COMPLETED`) via transactional database state machines.
- **ACID Security**: Prevent double assignment of tasks and ensure atomic payment settlements using row-level locking (`FOR UPDATE`).
- **Semantic Skill Discovery**: Utilize high-dimensional vector embeddings to bridge the vocabulary gap between student skill profiles and task descriptions.
- **Fair Campus Ledger**: Maintain an immutable, transparent payment and review ledger reflecting peer ratings calculated dynamically by database functions.

---

## 4. Database Paradigm Selection & Justification

The project satisfies **Option 2: SQL + Vector Database** of the DBMS Level 3 specifications:

| Requirement Criteria | PostgreSQL 18 (Relational Engine) | pgvector (Vector Engine) | Justification for Unified Approach |
| :--- | :--- | :--- | :--- |
| **Data Nature** | Highly structured tabular data: users, contracts, payments, applications, reviews. | Unstructured natural language: task specifications, student competencies. | Single database engine eliminates network latency and distributed two-phase commits. |
| **Consistency Model** | **ACID** (Atomicity, Consistency, Isolation, Durability) | Approximate / Exact nearest neighbor ($L_2$ normalized) | Financial settlements cannot tolerate eventual consistency. |
| **Query Mechanism** | Relational Algebra, B-Tree, Composite, & GIN Full-Text Indexes | Cosine Distance Operator (`<=>`) over 384 dimensions | Hybrid queries: `WHERE status = 'OPEN' AND budget >= 500 ORDER BY embedding <=> query_vec` in a single query plan. |
| **Why not NoSQL / MongoDB?** | MongoDB lacks native multi-table constraints, CHECK constraints, and seamless in-engine vector joins without external services. | A separate vector DB (e.g. Pinecone) introduces synchronization lag when tasks are updated or cancelled. | In PostgreSQL, when a task is updated or deleted, relational and vector rows remain transactionally locked. |

---

## 5. Entity-Relationship (ER) Modeling & Relational Schema

### 5.1 Core Entities from `erdiagram.svg` & `relationalschema.svg`
1. **`users`**: Represents students and platform supervisors. Includes university affiliations (PESU, RVCE, BMSCE, MSRIT) and authentication hashes.
2. **`skills`**: Standardized competency catalog (React, Next.js, PostgreSQL, PyTorch, Figma, Canva, etc.) with self-referencing `parent_skill_id` for prerequisite hierarchies.
3. **`student_skills`**: Resolves the **M:M relationship** between `users` and `skills`. Stores proficiency level (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) and verified experience.
4. **`categories`**: Domain classifications (Software Dev, Graphic Design, Data & AI, Video Editing, Technical Writing, Academic Tutoring).
5. **`tasks`**: Micro-tasks published by students with budgets, deadlines, descriptions, and statuses.
6. **`applications`**: Resolves the **M:M relationship** between `users` (applicants) and `tasks`. Stores proposed bid amounts and cover proposals.
7. **`assignments`**: The **1:1 contract** formed when a task owner accepts an applicant. Enforced by `UNIQUE(task_id)`.
8. **`payments`**: Financial ledger entries recording verified payouts. Has **two separate foreign keys to `users`** (`payer_id` and `receiver_id`).
9. **`reviews`**: Peer feedback and rating evaluations (`rating CHECK (1..5)`). Also references `users` twice (`reviewer_id` and `reviewed_user_id`).
10. **`content_embeddings`**: High-dimensional vector table storing 384-dimensional unit vectors (`vector(384)`) for both student profiles and task descriptions.

### 5.2 Relational Schema Definition (DDL)
```sql
-- 1. Users Table (Role-based access: STUDENT and ADMIN)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    college VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Skills with Hierarchical Self-Reference (Prerequisites)
CREATE TABLE skills (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    parent_skill_id UUID REFERENCES skills(skill_id) ON DELETE SET NULL
);

-- 3. Student Skills (M:M User to Skill)
CREATE TABLE student_skills (
    student_skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIATE' 
        CHECK (proficiency_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    years_experience NUMERIC(4, 1) NOT NULL DEFAULT 1.0 CHECK (years_experience >= 0),
    CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

-- 4. Tasks Table with Status & Check Constraints
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT,
    budget NUMERIC(10, 2) NOT NULL CHECK (budget > 0),
    deadline TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' 
        CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Applications Table (M:M User to Task)
CREATE TABLE applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    proposal TEXT NOT NULL,
    proposed_amount NUMERIC(10, 2) NOT NULL CHECK (proposed_amount > 0),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
    CONSTRAINT uq_task_student_application UNIQUE (task_id, student_id)
);

-- 6. Assignments (1:1 Contract Enforcement)
CREATE TABLE assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID UNIQUE NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' 
        CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED')),
    submission_notes TEXT
);

-- 7. Payments Table (References Users Twice)
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    payer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Reviews Table (References Users Twice)
CREATE TABLE reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewed_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_reviewer UNIQUE (task_id, reviewer_id)
);

-- 9. Content Embeddings Table (Vector Database Storage)
CREATE TABLE content_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('STUDENT', 'TASK')),
    entity_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_entity_embedding UNIQUE (entity_type, entity_id)
);
```

---

## 6. Advanced Database Concepts Implemented

### 6.1 ACID Stored Transactions (`fn_accept_application_transaction`)
Accepting an applicant requires atomic multi-table coordination. If any step fails, changes roll back:
```sql
CREATE OR REPLACE FUNCTION fn_accept_application_transaction(
    p_application_id UUID,
    p_owner_id UUID
) RETURNS UUID AS $$
DECLARE
    v_task_id UUID;
    v_student_id UUID;
    v_task_status VARCHAR(20);
    v_assignment_id UUID;
BEGIN
    SELECT a.task_id, a.student_id INTO v_task_id, v_student_id
    FROM applications a
    WHERE a.application_id = p_application_id AND a.status = 'PENDING';

    IF v_task_id IS NULL THEN
        RAISE EXCEPTION 'Application not found or is no longer pending.';
    END IF;

    -- Row-level exclusive lock preventing race conditions
    SELECT status INTO v_task_status
    FROM tasks
    WHERE task_id = v_task_id AND owner_id = p_owner_id
    FOR UPDATE;

    IF v_task_status IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User does not own this task.';
    END IF;

    IF v_task_status != 'OPEN' THEN
        RAISE EXCEPTION 'Task is no longer OPEN for acceptance.';
    END IF;

    -- 2. Accept selected application
    UPDATE applications
    SET status = 'ACCEPTED'
    WHERE application_id = p_application_id;

    -- 3. Bulk reject other applicants
    UPDATE applications
    SET status = 'REJECTED'
    WHERE task_id = v_task_id AND application_id != p_application_id AND status = 'PENDING';

    -- 4. Create 1:1 assignment
    INSERT INTO assignments (task_id, student_id, status)
    VALUES (v_task_id, v_student_id, 'ASSIGNED')
    RETURNING assignment_id INTO v_assignment_id;

    -- 5. Transition task status
    UPDATE tasks
    SET status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP
    WHERE task_id = v_task_id;

    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 Relational Integrity Triggers
* **`trg_prevent_self_application`**: Blocks a student from bidding on tasks they posted:
  ```sql
  CREATE OR REPLACE FUNCTION trg_fn_prevent_self_application()
  RETURNS TRIGGER AS $$
  DECLARE
      task_owner UUID;
  BEGIN
      SELECT owner_id INTO task_owner FROM tasks WHERE task_id = NEW.task_id;
      IF task_owner = NEW.student_id THEN
          RAISE EXCEPTION 'Database Integrity Constraint: A student cannot apply to a task they own (Task ID: %, User ID: %)',
              NEW.task_id, NEW.student_id;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
* **`trg_validate_task_status`**: Rejects applications submitted after a task has closed.
* **`trg_update_task_timestamp`**: Automatically updates `tasks.updated_at` on modification.

### 6.3 Recursive Queries (`WITH RECURSIVE`) & Prerequisite Hierarchy
Traverses the self-referencing skill dependency tree to construct complete learning roadmaps with recursion depth:
```sql
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
SELECT skill_name, category, depth_level, dependency_path
FROM skill_tree
ORDER BY category, depth_level;
```

### 6.4 Common Table Expressions (CTE) Multi-Stage Aggregations
Enables modular query design computing category metrics and student earnings simultaneously:
```sql
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
```

### 6.5 Database-Level Role-Based Access Control (PostgreSQL RBAC)
Demonstrates database security by creating native PostgreSQL roles with granular table grants:
* **`prayaspro_student`**: Can SELECT from catalog tables, INSERT into `applications`, `reviews`, and `student_skills`, but has **`REVOKE ALL ON payments`** preventing financial tampering.
* **`prayaspro_admin`**: Granted full `ALL PRIVILEGES` across all public tables, sequences, and views.
* **`prayaspro_auditor`**: Granted read-only audit access across all operational tables.

### 6.6 Vector Database RUD Operations (Read, Update, Delete)
Vector embeddings in `content_embeddings` support full lifecycle operations:
* **Create (C)**: Automatic generation of normalized 384-dimensional float vectors when tasks are posted or student skills registered.
* **Read (R)**: Cosine similarity queries (`ORDER BY embedding <=> query_vec ASC`) and vector inspection endpoints (`GET /api/recommendations/embeddings`).
* **Update (U)**: Re-embedding and re-normalizing content vectors when profiles or task scopes change (`PUT /api/recommendations/embeddings/:type/:id`).
* **Delete (D)**: Purging embeddings when tasks or student profiles are removed (`DELETE /api/recommendations/embeddings/:type/:id`).

---

## 7. Complex Academic SQL Queries

The application executes 10 complex SQL query suites reflecting syllabus requirements:

| # | Query Type | Concept Demonstrated | Purpose |
| :-: | :--- | :--- | :--- |
| **1** | **3-Table INNER JOIN** | `tasks` $\to$ `categories` $\to$ `users` | Lists open tasks with poster identity and college affiliation. |
| **2** | **GROUP BY + HAVING** | Aggregates (`AVG`, `COUNT`, `MIN`, `MAX`) with `HAVING COUNT(r.review_id) >= 1` | Compiles active freelancer reputation metrics. |
| **3** | **Correlated Subquery** | `WHERE t.budget >= (SELECT AVG(budget) FROM tasks WHERE category_id = t.category_id)` | Identifies high-value tasks exceeding their category's average budget. |
| **4** | **Double FK Join** | `payments` $\to$ `users` (as Payer) and `payments` $\to$ `users` (as Receiver) | Generates audit ledger linking both students. |
| **5** | **Window Function** | `DENSE_RANK() OVER (PARTITION BY category_id ORDER BY budget DESC)` | Ranks tasks within each category without collapsing individual task rows. |
| **6** | **Recursive Query (WITH RECURSIVE)** | Anchor + Recursive member over self-referencing `parent_skill_id` | Traverses prerequisite skill chains with depth and dependency path. |
| **7** | **Multi-Stage CTE** | Multiple Common Table Expressions (`category_summary`, `top_earners`) | Clean multi-stage aggregation avoiding Cartesian explosion. |
| **8** | **Database RBAC Inspection** | Queries `information_schema.role_table_grants` | Inspects PostgreSQL engine privileges across Student, Admin, and Auditor roles. |
| **9** | **Vector Similarity Search** | Cosine distance operator (`<=>`) over `vector(384)` | Ranks tasks semantically relative to student skill vectors. |
| **10** | **Vector RUD Operations** | Read, Update, Delete operations on vector store | Verifies vector inspection, re-embedding updates, and index deletion. |

---

## 8. Web Application Architecture (Next.js 14)

The frontend is implemented in **Next.js 14 (App Router)** with **TypeScript** and **Vanilla CSS**:

* **Authentication & Personas**: Persistent JWT authentication with an instant **1-Click Demo Persona Switcher Strip** (Aarav, Ananya, Priya, Admin).
* **Task Directory (`/tasks`)**: Real-time filtering by category, budget sliders, and keyword search.
* **Proposals & Bids (`/tasks/[id]`)**: Proposal submission, applicant review, and trigger validation.
* **1:1 Contract Workspace (`/assignments/[id]`)**: Dynamic state machine advancing contracts from `ASSIGNED` to `COMPLETED` with deliverable submission and 5-star peer reviews.
* **Skill Portfolio (`/dashboard`)**: Student profile editor with live earnings calculations and competency tagging.
* **Semantic Vector & RUD Console (`/recommendations`)**: Dual-tab workspace for cosine distance matching and live **Vector RUD** (Read vector coordinates, Update embeddings, Delete vector records).
* **DBMS Viva Showcase (`/db-showcase`)**: Interactive faculty presentation console executing all 10 benchmark queries live with execution latency (ms) and **`EXPLAIN (ANALYZE, BUFFERS)`** query plan profiling.
* **Admin Center (`/admin`)**: System analytics, user activation toggles, and financial audit logs.

---

## 9. Testing & Verification

1. **Automated 14-Step Lifecycle (`npm run test:flow`)**:
   - Executes student registration, task posting, pgvector embedding generation, trigger enforcement, bid submission, stored transaction acceptance, work delivery, payout settlement, and 5-star review.
   - **Result**: **14 / 14 Steps Passed (100% Success)**.
2. **Academic Query Suite (`npm run test:queries`)**:
   - Executes all 10 complex SQL and vector query suites against live PostgreSQL tables.
   - **Result**: **10 / 10 Suites Passed**.
3. **HTTP Route Verification**:
   - Tested all 16 frontend and API proxy routes (`http://localhost:3000/*`).
   - **Result**: **16 / 16 Routes Responded HTTP 200 OK**.
4. **Next.js Production Build**:
   - `npm run build` compiled 14 static and dynamic routes with zero TypeScript or linting errors.

---

## 10. Conclusion & Future Enhancements

PrayasPro demonstrates a complete, production-grade integration of modern database engineering principles, showcasing how relational ACID constraints, integrity triggers, analytical views, recursive dependency trees, and vector similarity search can coalesce into an intuitive campus application.

### Future Enhancements:
- **Milestone Escrow Contracts**: Multi-stage milestone payouts for semester-long team projects.
- **pg_trgm Hybrid Indexing**: Combining trigram similarity with pgvector cosine distance for hybrid lexical and semantic search.
- **Campus Single Sign-On (SSO)**: Direct OAuth2 integration with university portal credentials (`@pesu.edu`).

---

*Report prepared for DBMS Experiential Learning Level 3 Evaluation.*
