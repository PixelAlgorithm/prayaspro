# PrayasPro — Backend (PostgreSQL & pgvector Engine)
**Skill-Based Micro Task Marketplace for Students**  
*DBMS Level 3 Experiential Learning Project*

---

## 1. Overview & Architecture

PrayasPro connects college students who need technical or creative micro-tasks completed with skilled peers.
This backend delivers a robust, secure, and production-grade relational database architecture paired with semantic vector search in PostgreSQL.

* **Relational Database**: PostgreSQL 18
* **Vector Engine**: PostgreSQL `vector` type with `<=>` Cosine Distance Operator
* **Server Framework**: Node.js, Express, TypeScript
* **Security**: JWT Authentication, bcrypt password hashing, input validation, SQL injection protection via parameterized queries
* **ACID Transactions**: Atomic task assignment and completion/payout workflows

```
                      +-----------------------------+
                      |       Client / Frontend     |
                      +--------------+--------------+
                                     |  HTTP / REST
                                     v
                      +-----------------------------+
                      |       Express API Server    |
                      +--------------+--------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
   +--------------------------+             +--------------------------+
   | Relational SQL Tables    |             | pgvector Embeddings      |
   | (USER, TASK, ASSIGNMENT, |             | (384-dim Unit Vectors    |
   |  APPLICATION, PAYMENT,   |             |  Cosine Distance <=>)    |
   |  REVIEW, SKILL, ...)     |             |                          |
   +--------------------------+             +--------------------------+
                |                                         |
                +--------------------+--------------------+
                                     v
                      +-----------------------------+
                      |   PostgreSQL 18 Database    |
                      |   (Database: prayaspro)     |
                      +-----------------------------+
```

---

## 2. Relational Schema Mapping (Source of Truth: ER Diagram)

The 9 core tables faithfully implement `PrayasPro_ER_Relational.drawio.svg`:

1. **`users`**:
   - `user_id` (PK, UUID)
   - `name`, `email` (UNIQUE), `password_hash`, `college`, `department`
   - `role` (`STUDENT`, `ADMIN`), `created_at`, `is_active`
2. **`skills`**:
   - `skill_id` (PK, UUID)
   - `skill_name` (UNIQUE), `category`, `description`
3. **`student_skills`** (Associative M:M):
   - `student_skill_id` (PK, UUID)
   - `user_id` (FK -> `users`), `skill_id` (FK -> `skills`)
   - `proficiency_level` (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`)
   - `years_experience`, `UNIQUE(user_id, skill_id)`
4. **`categories`**:
   - `category_id` (PK, UUID)
   - `category_name` (UNIQUE), `description`
5. **`tasks`**:
   - `task_id` (PK, UUID)
   - `owner_id` (FK -> `users`), `category_id` (FK -> `categories`)
   - `title`, `description`, `required_skills`, `budget` (CHECK > 0)
   - `deadline`, `status` (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `COMPLETED`, `CANCELLED`)
6. **`applications`** (M:M):
   - `application_id` (PK, UUID)
   - `task_id` (FK -> `tasks`), `student_id` (FK -> `users`)
   - `proposal`, `proposed_amount` (CHECK > 0), `applied_at`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`)
   - `UNIQUE(task_id, student_id)`
7. **`assignments`** (1:1 with `tasks`):
   - `assignment_id` (PK, UUID)
   - `task_id` (FK -> `tasks`, UNIQUE enforces 1:1)
   - `student_id` (FK -> `users`)
   - `assigned_at`, `started_at`, `submitted_at`, `completed_at`, `status`
8. **`payments`**:
   - `payment_id` (PK, UUID)
   - `task_id` (FK -> `tasks`)
   - `payer_id` (FK -> `users`), `receiver_id` (FK -> `users`)
   - `amount` (CHECK > 0), `payment_status` (`PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`), `paid_at`
9. **`reviews`**:
   - `review_id` (PK, UUID)
   - `task_id` (FK -> `tasks`)
   - `reviewer_id` (FK -> `users`), `reviewed_user_id` (FK -> `users`)
   - `rating` (CHECK BETWEEN 1 AND 5), `comment`, `created_at`
   - `UNIQUE(task_id, reviewer_id)`
10. **`content_embeddings`** (Vector Storage):
   - `embedding_id` (PK, UUID)
   - `entity_type` (`STUDENT`, `TASK`), `entity_id` (UUID)
   - `content_text`, `embedding` (384-dimensional vector)
   - `UNIQUE(entity_type, entity_id)`

---

## 3. Advanced DBMS Features Demonstrated

### A. ACID Transactions
1. **Application Acceptance Transaction** (`fn_accept_application_transaction`):
   - Atomically locks task row (`FOR UPDATE`)
   - Transitions selected application to `'ACCEPTED'`
   - Bulk-rejects other pending applications for this task
   - Inserts 1:1 `assignments` record with status `'ASSIGNED'`
   - Updates `tasks.status` to `'ASSIGNED'`
2. **Task Completion & Payout Transaction** (`completeTaskAndReleasePayment`):
   - Atomically verifies task owner authority
   - Updates `assignments.status` to `'COMPLETED'`
   - Updates `tasks.status` to `'COMPLETED'`
   - Inserts verified `payments` record (`amount = budget`, `status = 'SUCCESS'`)

### B. Database Triggers
* **`trg_prevent_self_application`**: Before insert on `applications`, prevents a student from applying to a task they own.
* **`trg_validate_task_status`**: Before insert on `applications`, rejects proposals for tasks that are not `'OPEN'`.
* **`trg_update_task_timestamp`**: Before update on `tasks`, automatically keeps `updated_at` synchronized.

### C. Analytical Database Views
* **`view_student_performance`**: Computes aggregated student metrics (total skills, applications, completed tasks, total earnings, average rating, review count).
* **`view_task_marketplace_stats`**: Aggregates category-level metrics (total tasks, open tasks, budget volume, average budget, applications received).
* **`view_student_earnings_ledger`**: Full financial ledger joining `payments` with payer and receiver `users`.
* **`view_top_rated_freelancers`**: Ranked list of top student talent filtered by reviews.

### D. Stored Functions
* **`fn_calculate_student_rating(user_uuid)`**: Computes weighted average rating and review counts.
* **`fn_calculate_student_earnings(user_uuid)`**: Computes total payouts for verified completed tasks.

### E. Indexing Strategy
* **B-Tree Indexes**: On all foreign keys (`idx_tasks_owner_id`, `idx_applications_task_id`, `idx_payments_receiver_id`, etc.) and composite filtering indexes (`tasks(status, deadline)`).
* **GIN Full-Text Search Index**: `to_tsvector('english', title || ' ' || description)` for instant keyword matching.
* **Vector Cosine Index**: `content_embeddings(entity_type, entity_id)` for sub-millisecond similarity lookups.

### F. pgvector Semantic Skill Matching
* Uses the `<=>` Cosine Distance operator to match student skills with task requirements.
* Cosine Distance $d \in [0, 2]$, where $0$ is identical.
* Match score percentage is calculated as $(1.0 - d) \times 100\%$.

---

## 4. Quick Start & Execution Commands

### Prerequisites
* PostgreSQL 18 running on port `5432`
* Node.js v20+ and npm

### Configuration (`.env`)
```ini
DATABASE_URL=postgresql://postgres:root@localhost:5432/prayaspro
PORT=5000
JWT_SECRET=prayaspro_super_secret_jwt_key_pesu_dbms_level_3_2026
VECTOR_DIMENSION=384
```

### Setup & Testing Scripts
```bash
# 1. Install dependencies
npm install

# 2. Run schema migrations
npm run db:migrate

# 3. Seed realistic academic test dataset
npm run db:seed

# 4. Run the 14-Step End-to-End Demo Workflow
npm run test:flow

# 5. Run the Academic SQL Query Suite (JOIN, GROUP BY, Subqueries, Views, Vectors)
npm run test:queries

# 6. Start the Backend API Server
npm run dev
```

---

## 5. Main API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Live PostgreSQL connection & version check |
| `POST` | `/api/auth/register` | Register new student or admin |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & stats |
| `GET` | `/api/tasks` | Browse & filter tasks (category, budget, status) |
| `POST` | `/api/tasks` | Create task & auto-generate pgvector embedding |
| `POST` | `/api/tasks/:id/apply` | Submit application proposal |
| `GET` | `/api/tasks/:id/applications`| Owner inspects applicant bids |
| `POST` | `/api/applications/:id/accept`| Accept applicant & assign task (Transaction) |
| `PUT` | `/api/assignments/:id/start` | Worker begins task execution |
| `PUT` | `/api/assignments/:id/submit`| Worker submits deliverables |
| `POST` | `/api/assignments/:id/complete`| Owner approves & releases payment (Transaction) |
| `POST` | `/api/reviews` | Submit 1-5 star review and rating |
| `GET` | `/api/recommendations/tasks` | pgvector recommended tasks for student |
| `GET` | `/api/recommendations/students/:id` | pgvector recommended students for task |
| `GET` | `/api/admin/stats` | Platform metrics & volume analytics |
| `GET` | `/api/db-showcase/demonstrations`| Live academic demonstration queries |
