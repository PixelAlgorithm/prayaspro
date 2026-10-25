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

## 2. Problem Statement & Motivation

### 2.1 The Problem
In modern university environments:
1. Students frequently require rapid turnaround on specialized micro-deliverables (e.g., frontend components for hackathons, IEEE paper proofreading, survey dataset cleaning, club posters).
2. Existing global gig platforms (Upwork, Fiverr) impose steep commercial commission fees (20%), require bank verification inaccessible to students, and lack campus-level context.
3. Informal campus channels (WhatsApp groups, Discord) lack structured contracts, resulting in frequent payment defaults, ghosting, unverified skill claims, and lack of accountability.

### 2.2 Motivation & Objectives
The primary objectives of PrayasPro are:
- **Relational Integrity**: Enforce unambiguous contract lifecycles (`OPEN` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `SUBMITTED` $\to$ `COMPLETED`) via transactional database state machines.
- **ACID Security**: Prevent double assignment of tasks and ensure atomic payment settlements using row-level locking (`FOR UPDATE`).
- **Semantic Skill Discovery**: Utilize high-dimensional vector embeddings to bridge the vocabulary gap between student skill profiles and task descriptions.
- **Fair Campus Ledger**: Maintain an immutable, transparent payment and review ledger reflecting peer ratings calculated dynamically by database functions.

---

## 3. Database Paradigm Selection & Justification

The project satisfies **Option 2: SQL + Vector Database** of the DBMS Level 3 specifications:

| Requirement Criteria | PostgreSQL 18 (Relational Engine) | pgvector (Vector Engine) | Justification for Unified Approach |
| :--- | :--- | :--- | :--- |
| **Data Nature** | Highly structured tabular data: users, contracts, payments, applications, reviews. | Unstructured natural language: task specifications, student competencies. | Single database engine eliminates network latency and distributed two-phase commits. |
| **Consistency Model** | **ACID** (Atomicity, Consistency, Isolation, Durability) | Approximate / Exact nearest neighbor ($L_2$ normalized) | Financial settlements cannot tolerate eventual consistency. |
| **Query Mechanism** | Relational Algebra, B-Tree, Composite, & GIN Full-Text Indexes | Cosine Distance Operator (`<=>`) over 384 dimensions | Hybrid queries: `WHERE status = 'OPEN' AND budget >= 500 ORDER BY embedding <=> query_vec` in a single query plan. |
| **Why not NoSQL / MongoDB?** | MongoDB lacks native multi-table constraints, CHECK constraints, and seamless in-engine vector joins without external services. | A separate vector DB (e.g. Pinecone) introduces synchronization lag when tasks are updated or cancelled. | In PostgreSQL, when a task is updated or deleted, relational and vector rows remain transactionally locked. |

---

## 4. Entity-Relationship (ER) Modeling & Relational Schema

### 4.1 Core Entities from `PrayasPro_ER_Relational.drawio.svg`
1. **`users`**: Represents students and platform supervisors. Includes university affiliations (PESU, RVCE, BMSCE, MSRIT) and authentication hashes.
2. **`skills`**: Standardized competency catalog (React, Next.js, PostgreSQL, PyTorch, Figma, Canva, etc.).
3. **`student_skills`**: Resolves the **M:M relationship** between `users` and `skills`. Stores proficiency level (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`) and verified experience.
4. **`categories`**: Domain classifications (Software Dev, Graphic Design, Data & AI, Video Editing, Technical Writing, Academic Tutoring).
5. **`tasks`**: Micro-tasks published by students with budgets, deadlines, descriptions, and statuses.
6. **`applications`**: Resolves the **M:M relationship** between `users` (applicants) and `tasks`. Stores proposed bid amounts and cover proposals.
7. **`assignments`**: The **1:1 contract** formed when a task owner accepts an applicant. Enforced by `UNIQUE(task_id)`.
8. **`payments`**: Financial ledger entries recording verified payouts. Has **two separate foreign keys to `users`** (`payer_id` and `receiver_id`).
9. **`reviews`**: Peer feedback and rating evaluations (`rating CHECK (1..5)`). Also references `users` twice (`reviewer_id` and `reviewed_user_id`).
10. **`content_embeddings`**: High-dimensional vector table storing 384-dimensional unit vectors (`vector(384)`) for both student profiles and task descriptions.

### 4.2 Relational Schema Definition (DDL)
```sql
-- Core Relational Schema Summary
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    college VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE skills (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL
);

CREATE TABLE student_skills (
    student_skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIATE' 
        CHECK (proficiency_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    years_experience NUMERIC(4, 1) NOT NULL DEFAULT 1.0 CHECK (years_experience >= 0),
    CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

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

CREATE TABLE applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    proposed_amount NUMERIC(10, 2) NOT NULL CHECK (proposed_amount > 0),
    proposal TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_student_application UNIQUE (task_id, student_id)
);

CREATE TABLE assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(task_id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' 
        CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED')),
    submission_notes TEXT
);

CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    payer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' 
        CHECK (payment_status IN ('PENDING', 'SUCCESS', 'REFUNDED', 'DISPUTED')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewed_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_reviewer UNIQUE (task_id, reviewer_id)
);

CREATE TABLE content_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('STUDENT', 'TASK')),
    entity_id UUID NOT NULL,
    embedding vector(384) NOT NULL,
    content_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_entity_embedding UNIQUE (entity_type, entity_id)
);
```

---

## 5. Relational Normalization Analysis (1NF to 3NF / BCNF Proofs)

To guarantee database integrity and eliminate update/delete anomalies, every table was formally normalized:

1. **First Normal Form (1NF)**:
   - All attributes contain atomic, scalar values (UUIDs, VARCHAR, NUMERIC, TIMESTAMPTZ).
   - Repeating groups were eliminated by moving student skills to `student_skills` and applications to `applications`.
   - Every relation possesses a uniquely identifiable Primary Key (`gen_random_uuid()`).
2. **Second Normal Form (2NF)**:
   - For associative composite-key tables (`student_skills` on `(user_id, skill_id)` and `applications` on `(task_id, student_id)`), every non-key attribute (`proficiency_level`, `years_experience`, `proposed_amount`, `proposal`) is **fully functionally dependent** on the entire candidate key, with zero partial dependencies.
3. **Third Normal Form (3NF)**:
   - Every non-prime attribute is non-transitively dependent on the primary key ($X \to Y$ holds where $X$ is a superkey or $Y$ is a prime attribute).
   - In `tasks`, category metadata is not stored redundantly; only `category_id` is maintained, referencing `categories`.
   - In `payments`, the student names and colleges are not duplicated; they reference `payer_id` and `receiver_id` pointing to `users`.
4. **Boyce-Codd Normal Form (BCNF)**:
   - In all relations, for every non-trivial functional dependency $X \to Y$, $X$ is a superkey. There are no overlapping candidate keys with non-trivial dependencies.

---

## 6. Advanced Database Concepts Implemented

The rubric mandates demonstrating at least four advanced database concepts. PrayasPro implements **all seven**:

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
    -- 1. Identify application and lock corresponding task row
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
* **`trg_prevent_self_application`**: Prevents a student from bidding on tasks they posted:
  ```sql
  CREATE OR REPLACE FUNCTION fn_prevent_self_application()
  RETURNS TRIGGER AS $$
  DECLARE
      v_owner_id UUID;
  BEGIN
      SELECT owner_id INTO v_owner_id FROM tasks WHERE task_id = NEW.task_id;
      IF v_owner_id = NEW.student_id THEN
          RAISE EXCEPTION 'Database Integrity Constraint: A student cannot apply to a task they own';
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
* **`trg_validate_task_status`**: Rejects applications submitted after a task has closed.
* **`trg_update_task_timestamp`**: Maintains timestamp integrity on updates.

### 6.3 Analytical Database Views
* **`view_task_marketplace_stats`**: Pre-computed category analytics:
  ```sql
  CREATE OR REPLACE VIEW view_task_marketplace_stats AS
  SELECT 
      c.category_id,
      c.category_name,
      COUNT(t.task_id) AS total_tasks,
      COUNT(t.task_id) FILTER (WHERE t.status = 'OPEN') AS open_tasks,
      COUNT(t.task_id) FILTER (WHERE t.status = 'COMPLETED') AS completed_tasks,
      ROUND(COALESCE(AVG(t.budget), 0), 2) AS average_budget,
      COALESCE(SUM(t.budget), 0) AS total_budget_volume,
      COALESCE(SUM(app_count.cnt), 0) AS total_applications_received
  FROM categories c
  LEFT JOIN tasks t ON c.category_id = t.category_id
  LEFT JOIN (
      SELECT task_id, COUNT(*) AS cnt FROM applications GROUP BY task_id
  ) app_count ON t.task_id = app_count.task_id
  GROUP BY c.category_id, c.category_name;
  ```
* **`view_student_performance`**: Independent subqueries aggregate total skills, applications, completed tasks, and earnings without Cartesian product expansion.
* **`view_student_earnings_ledger`**: Immutable financial ledger joining payer and receiver students.
* **`view_top_rated_freelancers`**: Leaderboard filtered by verified reviews.

### 6.4 Stored Functions
* **`fn_calculate_student_rating(user_uuid)`**: Computes weighted average rating and review volume.
* **`fn_calculate_student_earnings(user_uuid)`**: Aggregates all settled payouts where `payment_status = 'SUCCESS'`.

### 6.5 Indexing Strategy
* **B-Tree Indexes**: On all foreign key columns (`owner_id`, `category_id`, `task_id`, `student_id`, `payer_id`, `receiver_id`).
* **Composite Index**: `idx_tasks_status_deadline ON tasks(status, deadline)` optimizes marketplace filtering.
* **GIN Full-Text Index**: `idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || description))` enables instant multi-keyword searching.

### 6.6 pgvector Semantic Vector Similarity (`<=>`)
* Embeddings: 384-dimensional unit vectors computed over text profiles.
* Metric: Cosine Distance Operator (`<=>`):
  $$d = 1.0 - \frac{A \cdot B}{\|A\| \|B\|}$$
  $$\text{Match \%} = (1.0 - d) \times 100\%$$
* Execution query:
  ```sql
  SELECT t.title, c.category_name, t.budget,
         (task_vec.embedding <=> student_vec.embedding) AS cosine_distance,
         ROUND(((1.0 - (task_vec.embedding <=> student_vec.embedding)) * 100)::numeric, 1) AS match_percentage
  FROM tasks t
  JOIN content_embeddings task_vec ON t.task_id = task_vec.entity_id AND task_vec.entity_type = 'TASK'
  CROSS JOIN (
      SELECT embedding FROM content_embeddings WHERE entity_id = $1 AND entity_type = 'STUDENT'
  ) student_vec
  WHERE t.status = 'OPEN'
  ORDER BY cosine_distance ASC LIMIT 5;
  ```

---

## 7. Complex Academic SQL Queries

The application executes 6 complex SQL query suites reflecting syllabus requirements:

| Query Type | Concept Demonstrated | Purpose |
| :--- | :--- | :--- |
| **3-Table INNER JOIN** | `tasks` $\to$ `categories` $\to$ `users` | Lists open tasks with poster identity and college affiliation. |
| **GROUP BY + HAVING** | Aggregates (`AVG`, `COUNT`, `MIN`, `MAX`) with `HAVING COUNT(r.review_id) >= 1` | Compiles active freelancer reputation metrics. |
| **Correlated Subquery** | `WHERE t.budget >= (SELECT AVG(budget) FROM tasks WHERE category_id = t.category_id)` | Identifies high-value tasks exceeding their category's average budget. |
| **Double FK Join** | `payments` $\to$ `users` (as Payer) and `payments` $\to$ `users` (as Receiver) | Generates audit ledger linking both students. |
| **Window Function** | `DENSE_RANK() OVER (PARTITION BY category_id ORDER BY budget DESC)` | Ranks tasks within each category without collapsing individual task rows. |
| **Vector Similarity** | `ORDER BY (ce.embedding <=> query_vec) ASC` | Ranks tasks semantically relative to student skill vectors. |

---

## 8. Web Application Architecture (Next.js 14)

The frontend is implemented in **Next.js 14 (App Router)** with **TypeScript** and **Vanilla CSS** following a dark-slate campus aesthetic:

* **Authentication & Personas**: Persistent JWT authentication with an instant **1-Click Demo Persona Switcher Strip** (Aarav, Ananya, Priya, Admin).
* **Task Directory (`/tasks`)**: Real-time filtering by category, budget sliders, and keyword search.
* **Proposals & Bids (`/tasks/[id]`)**: Proposal submission, applicant review, and trigger validation.
* **1:1 Contract Workspace (`/assignments/[id]`)**: Dynamic state machine advancing contracts from `ASSIGNED` to `COMPLETED` with deliverable submission and 5-star peer reviews.
* **Skill Portfolio (`/dashboard`)**: Student profile editor with live earnings calculations and competency tagging.
* **pgvector Explorer (`/recommendations`)**: Visual breakdown of cosine distance math and live SQL query syntax.
* **DBMS Viva Showcase (`/db-showcase`)**: Interactive faculty presentation console executing benchmark queries live with execution times (ms) and **`EXPLAIN (ANALYZE, BUFFERS)`** query plan profiling.
* **Admin Center (`/admin`)**: System analytics, user activation toggles, and financial audit logs.

---

## 9. Testing & Verification

1. **Automated 14-Step Lifecycle (`npm run test:flow`)**:
   - Executes student registration, task posting, pgvector embedding generation, trigger enforcement, bid submission, stored transaction acceptance, work delivery, payout settlement, and 5-star review.
   - **Result**: **14 / 14 Steps Passed (100% Success)**.
2. **Academic Query Suite (`npm run test:queries`)**:
   - Executes all 6 complex SQL query suites against live PostgreSQL tables.
   - **Result**: **6 / 6 Suites Passed**.
3. **HTTP Route Verification**:
   - Tested all 16 frontend and API proxy routes (`http://localhost:3000/*`).
   - **Result**: **16 / 16 Routes Responded HTTP 200 OK**.
4. **Next.js Production Build**:
   - `npm run build` compiled 14 static and dynamic routes with zero TypeScript or linting errors.

---

## 10. Conclusion & Future Enhancements

PrayasPro demonstrates a complete, production-grade integration of modern database engineering principles, showcasing how relational ACID constraints, integrity triggers, analytical views, and vector similarity search can coalesce into an intuitive campus application.

### Future Enhancements:
- **Milestone Escrow Contracts**: Multi-stage milestone payouts for semester-long team projects.
- **pg_trgm Hybrid Indexing**: Combining trigram similarity with pgvector cosine distance for hybrid lexical and semantic search.
- **Campus Single Sign-On (SSO)**: Direct OAuth2 integration with university portal credentials (`@pesu.edu`).

---

*Report prepared for DBMS Experiential Learning Level 3 Evaluation.*
