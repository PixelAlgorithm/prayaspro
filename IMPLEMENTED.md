# PRAYASPRO — DBMS Level 3 Implementation & Viva Guide

> **Project Title**: PrayasPro — Skill-Based Micro-Task Marketplace for Students  
> **Database**: PostgreSQL 18.6 (Port 5432, Database: `prayaspro`)  
> **Vector Engine**: PostgreSQL `vector` Type + Native `<=>` Cosine Distance Operator (384 Dimensions)  
> **Backend**: Node.js, Express, TypeScript, Connection Pooling (`pg`), JWT Auth, bcrypt  

---

## 1. Quick Project Summary (Elevator Pitch for Viva)

PrayasPro is a micro-task freelancing platform designed exclusively for college students. It connects:
1. **Task Owner (Student A)**: Needs a task done (e.g., event poster, Python scraper, report formatting).
2. **Worker (Student B)**: Has verified skills and wants to complete the task for payment and ratings.

### Complete Lifecycle Flow:
$$\text{Post Task} \longrightarrow \text{Receive Applications} \longrightarrow \text{Accept Applicant (Transaction)} \longrightarrow \text{Assign (1:1)} \longrightarrow \text{In Progress} \longrightarrow \text{Submit} \longrightarrow \text{Complete \& Pay (Transaction)} \longrightarrow \text{Review}$$

---

## 2. Database Architecture & Justification

* **Single Unified Database**: Both relational SQL data and AI vector embeddings live inside **PostgreSQL 18**.
* **Why PostgreSQL + pgvector instead of MongoDB?**
  1. Guaranteed **ACID transactions** for financial payouts and atomic task assignments.
  2. Eliminates distributed transaction issues between relational data and vector data.
  3. Hybrid queries: SQL filters (`category`, `budget`, `status = 'OPEN'`) run alongside vector similarity (`ORDER BY embedding <=> query_vector`).

---

## 3. Relational Schema (The 9 Core Entities from ER Diagram)

Every entity matches [**`PrayasPro_ER_Relational.drawio.svg`**](file:///d:/PESU/DBMS/PrayasPro_ER_Relational.drawio.svg):

| # | Entity | Primary Key | Foreign Keys & Cardinality | Purpose & Constraints |
|---|---|---|---|---|
| 1 | **`users`** | `user_id` (UUID) | None | Students & Admins. `email` is UNIQUE, `password_hash` bcrypt. |
| 2 | **`skills`** | `skill_id` (UUID) | None | Catalog of skills. `skill_name` is UNIQUE. |
| 3 | **`student_skills`** | `student_skill_id` (UUID) | `user_id` $\to$ `users`, `skill_id` $\to$ `skills` | Resolves **M:M** between User and Skill. `UNIQUE(user_id, skill_id)`. |
| 4 | **`categories`** | `category_id` (UUID) | None | Task categories (Web Dev, Design, Data, Writing, etc.). |
| 5 | **`tasks`** | `task_id` (UUID) | `owner_id` $\to$ `users`, `category_id` $\to$ `categories` | Micro-tasks with `budget > 0`, `deadline`, and `status`. |
| 6 | **`applications`** | `application_id` (UUID) | `task_id` $\to$ `tasks`, `student_id` $\to$ `users` | Proposals submitted by students. `UNIQUE(task_id, student_id)`. |
| 7 | **`assignments`** | `assignment_id` (UUID) | `task_id` (UNIQUE) $\to$ `tasks`, `student_id` $\to$ `users` | **1:1** active contract. A task has at most 1 final assignment. |
| 8 | **`payments`** | `payment_id` (UUID) | `task_id` $\to$ `tasks`, `payer_id` $\to$ `users`, `receiver_id` $\to$ `users` | Financial record. **References `users` twice** (Payer & Receiver). |
| 9 | **`reviews`** | `review_id` (UUID) | `task_id` $\to$ `tasks`, `reviewer_id` $\to$ `users`, `reviewed_user_id` $\to$ `users` | Feedback record. **References `users` twice**. `rating CHECK (1..5)`. |
| 10 | **`content_embeddings`** | `embedding_id` (UUID) | `entity_id` (matches user/task UUID) | Vector database storage (`vector(384)`). |

---

## 4. pgvector Semantic Search (How It Works)

* **Model Dimension**: 384 dimensions (matching `all-MiniLM-L6-v2` standard).
* **Storage**: Normalized float unit vectors ($L_2 \text{ norm} = 1.0$) stored in the `content_embeddings` table.
* **Similarity Metric**: Cosine Distance Operator (`<=>`):
  $$\text{Cosine Distance } d = 1.0 - \frac{A \cdot B}{\|A\| \|B\|}$$
  $$\text{Match Score \%} = (1.0 - d) \times 100\%$$
* **Proof in Action**:
  - Student **Ananya Rao** (Canva, Photoshop, Figma, Graphic Design) queries recommended tasks:
    - **College Fest Poster**: **80.0% Match** ($d = 0.2001$)
    - **Teaser Video & Reel**: **41.7% Match** ($d = 0.5831$)
    - **Python Web Scraper**: **3.4% Match** ($d = 0.9662$)

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

### B. Database Triggers
* **`trg_prevent_self_application`**: Blocks a student from applying to a task they own.
* **`trg_validate_task_status`**: Rejects proposals if `tasks.status != 'OPEN'`.
* **`trg_update_task_timestamp`**: Automatically updates `tasks.updated_at` on modification.

### C. Database Views
* **`view_student_performance`**: Computes total skills, applications, completed tasks, earnings, average rating, and review count per student using CTE/subqueries (avoids Cartesian explosion).
* **`view_task_marketplace_stats`**: Aggregates tasks, open tasks, budget volume, and average budget by category.
* **`view_student_earnings_ledger`**: Complete audit ledger of all successful payouts joining payer and receiver students.
* **`view_top_rated_freelancers`**: Ranked leaderboard of students with reviews and completed jobs.

### D. Stored Functions
* **`fn_calculate_student_rating(user_uuid)`**: Returns average rating and total reviews.
* **`fn_calculate_student_earnings(user_uuid)`**: Returns total verified earnings.

### E. Indexing Strategy
* **B-Tree Indexes**: On all Foreign Keys (`owner_id`, `category_id`, `task_id`, `student_id`, `payer_id`, `receiver_id`).
* **Composite Indexes**: `tasks(status, deadline)` for marketplace browsing.
* **GIN Index**: Full-text search on `tasks USING gin(to_tsvector('english', title || ' ' || description))`.

---

## 6. API Route to SQL Query Mapping

| HTTP Route | What It Does | Underlying Database Query / Operation |
|---|---|---|
| `GET /api/health` | System health check | `SELECT version(), current_database(), count(*) FROM tasks...` |
| `POST /api/auth/register` | User signup | `INSERT INTO users (name, email, password_hash, college, department, role)` |
| `POST /api/auth/login` | User login | `SELECT user_id, password_hash FROM users WHERE email = $1` |
| `GET /api/users/profile` | Student dashboard stats | `SELECT * FROM view_student_performance WHERE user_id = $1` |
| `POST /api/users/skills` | Add skill to student | `INSERT INTO student_skills ... ON CONFLICT DO UPDATE` + Sync Vector |
| `GET /api/tasks` | Browse tasks with filters | `SELECT t.*, c.category_name, u.name FROM tasks t JOIN categories c... WHERE t.status = 'OPEN' AND t.budget >= $1` |
| `POST /api/tasks` | Post a new task | `INSERT INTO tasks (...) RETURNING *` + `INSERT INTO content_embeddings` |
| `POST /api/tasks/:id/apply` | Apply to task | `INSERT INTO applications (...)` $\to$ **Triggers fired!** |
| `POST /api/applications/:id/accept` | Accept applicant | Calls stored function `fn_accept_application_transaction(app_id, owner_id)` |
| `PUT /api/assignments/:id/start` | Worker starts work | Transaction updating `assignments.status = 'IN_PROGRESS'` & `tasks` |
| `PUT /api/assignments/:id/submit`| Worker submits deliverable| Transaction updating `assignments.status = 'SUBMITTED'` & `tasks` |
| `POST /api/assignments/:id/complete`| Owner approves & pays | Transaction updating assignment, task, and inserting `payments` |
| `POST /api/reviews` | Review worker | `INSERT INTO reviews (task_id, reviewer_id, reviewed_user_id, rating, comment)` |
| `GET /api/recommendations/tasks`| Vector recommendations | `SELECT t.*, (ce.embedding <=> $1::vector) AS dist FROM tasks t JOIN content_embeddings ce... ORDER BY dist ASC` |
| `GET /api/admin/stats` | Admin platform stats | Queries `view_task_marketplace_stats` & aggregates |
| `GET /api/db-showcase/demonstrations`| Live DBMS Demo | Executes JOINs, GROUP BY, HAVING, subqueries, views, functions, and vector search |

---

## 7. Current Synthetic Dataset in Database

The database contains realistic, consistent academic data:
* **Users**: 14 (1 Admin, 13 Students from PES University, RVCE, BMSCE, MSRIT)
* **Categories**: 6 (Web Dev, Graphic Design, Data & AI, Video, Technical Writing, Tutoring)
* **Skills**: 12 (React, Next.js, PostgreSQL, Python, Pandas, Canva, Figma, etc.)
* **Student Skills**: 30 verified skill-proficiency mappings
* **Tasks**: 15 tasks across all categories (`OPEN`, `IN_PROGRESS`, `COMPLETED`)
* **Applications**: 6 proposals with custom bids
* **Assignments**: 5 contracts tracked through the full lifecycle
* **Payments**: 4 verified `SUCCESS` payouts matching task budgets
* **Reviews**: 4 authentic reviews with 4-5 star ratings
* **Vector Embeddings**: 28 pre-computed 384-dimensional vectors in `content_embeddings`

---

## 8. Commands to Demonstrate to Evaluators

### Backend Tests (in `Prayaspro/backend`):
```bash
# 1. Run the Complete 14-Step Lifecycle Demo Flow (Proves end-to-end functionality & ACID)
npm run test:flow

# 2. Run the Academic SQL Query Suite (JOINs, GROUP BY, HAVING, Subqueries, Window Functions, Vector search)
npm run test:queries

# 3. Test Database Reset & Migration Reproducibility
npm run db:reset

# 4. Start the Backend API Server (Port 5000)
npm run dev
```

### Frontend Web Application (in `Prayaspro/frontend`):
```bash
# Start the Next.js Frontend (Port 3000)
npm run dev
```

---

## 9. Frontend Interactive Viva Routes (`http://localhost:3000`)

| Route | Feature Demonstrated | Evaluator Talking Point |
|---|---|---|
| `/` | Landing page | Live SSR metrics directly queried from PostgreSQL database view. |
| `/tasks` | Task Directory | Multi-filtering by category, status, and budget range. |
| `/tasks/[id]` | Task Details & Proposals | Shows task specifications, applicant proposals, and ACID application acceptance. |
| `/tasks/create` | Post Micro-Task | Automatically computes and registers a 384-dimensional vector embedding. |
| `/assignments/[id]` | Interactive Contract Workspace | 4-step contract lifecycle: Assigned $\to$ In Progress $\to$ Deliverable Submitted $\to$ Approved & Paid $\to$ 5-Star Review. |
| `/dashboard` | Student Profile & Skills | Competency manager with live calculations from `fn_calculate_student_rating` & `fn_calculate_student_earnings`. |
| `/recommendations` | pgvector Cosine Search | Real-time semantic matching explorer displaying `<=>` cosine distance and active SQL queries. |
| `/admin` | Supervisor Console | Platform metrics, user active toggles, and payment audit ledger (`view_student_earnings_ledger`). |
| `/db-showcase` | DBMS Viva Console | Interactive academic benchmark runner with live `EXPLAIN (ANALYZE, BUFFERS)` execution profiler. |

### 1-Click Quick Demo Personas (Top Bar):
* **Aarav Sharma** (`aarav@pesu.edu`): Task Poster (PESU)
* **Ananya Rao** (`ananya@bmsce.edu`): 5-Star Freelancer & Designer (BMSCE)
* **Priya Nair** (`priya@pesu.edu`): AI & ML Student Specialist (PESU)
* **Admin Supervisor** (`admin@prayaspro.edu`): Platform Supervisor (Audit & Views)

