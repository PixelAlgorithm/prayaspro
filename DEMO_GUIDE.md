# 🎓 PRAYASPRO — Full-Stack & DBMS Level 3 Viva Demonstration Guide

**Project**: PrayasPro — Skill-Based Micro-Task Marketplace for Students  
**Architecture**: Next.js 14 Frontend (Port `3000`) + Node/Express/TS Backend (Port `5000`) + PostgreSQL 18.6 (Port `5432`)  
**Workspace**: `d:\PESU\DBMS\Prayaspro`

---

## 📑 Table of Contents
1. [60-Second Elevator Pitch (What to Say)](#1-60-second-elevator-pitch)
2. [Quick Launch & Verification](#2-quick-launch--verification)
3. [Part A: Live Web App Walkthrough (`localhost:3000`)](#3-part-a-live-web-application-walkthrough)
4. [Part B: Backend Terminal Test Suites](#4-part-b-backend-terminal-test-suites)
5. [Part C: Direct PostgreSQL CLI Inspection (`psql`)](#5-part-c-direct-postgresql-inspection)
6. [Top 10 Viva Questions & Bulletproof Answers](#6-top-10-viva-questions--bulletproof-answers)

---

## 1. 60-Second Elevator Pitch

> *"PrayasPro is an experiential skill-based micro-task marketplace designed for college students. It connects student clients needing academic or lab project deliverables with verified student specialists who earn stipends and verifiable peer ratings.*
>
> *The platform is built on PostgreSQL 18 with high-dimensional vector embeddings, Express/TypeScript, and a modern Next.js 14 frontend.*
>
> *Key DBMS Level 3 concepts fully implemented include:*
> 1. *9 Normalized Relational Tables + 1 Vector Embedding Table matching our ER Diagram.*
> 2. *ACID Transactions using PL/pgSQL stored procedures with row-level locks (`FOR UPDATE`) for atomic proposal acceptance and financial payout settlement.*
> 3. *Database Triggers enforcing relational integrity (e.g., blocking self-applications and invalid statuses).*
> 4. *Analytical Database Views avoiding Cartesian products via CTEs for student and marketplace metrics.*
> 5. *Indexing strategy: B-Tree for FKs, Composite for status+deadline, GIN for full-text search.*
> 6. *pgvector Semantic Search using the native `<=>` Cosine Distance operator over 384-dimensional unit vectors to match student skill portfolios with task requirements."*

---

## 2. Quick Launch & Verification

Both servers are configured to run concurrently:
* **Backend API**: `http://localhost:5000/api`
* **Frontend Web**: `http://localhost:3000`
* **PostgreSQL Database**: `localhost:5432` (`prayaspro`)

```bash
# If restarting manually:
# Terminal 1 (Backend):
cd d:\PESU\DBMS\Prayaspro\backend
npm run dev

# Terminal 2 (Frontend):
cd d:\PESU\DBMS\Prayaspro\frontend
npm run dev
```

Open `http://localhost:3000` in any web browser.

---

## 3. Part A: Live Web Application Walkthrough

### Step 1: Landing Page (`http://localhost:3000`)
1. Point out the live campus hero section: **"Campus Micro-Task Network"**.
2. Point out the **Live PostgreSQL 18 Platform Metrics bar**:
   - Verified Students (14)
   - Micro-Tasks Published (15)
   - Completed & Verified (5)
   - Average Peer Rating (4.9 / 5.0)
   > *Talking Point: "These metrics are fetched in real-time from PostgreSQL analytical views during Server-Side Rendering (SSR)."*
3. Scroll down to show the 4 Lifecycle Steps and Featured Active Tasks.

### Step 2: 1-Click Demo Persona Switching
Notice the dark strip at the very top of **every page**:
```
DEMO PERSONAS: 1-Click Switch:
[Aarav (Poster - PESU)] [Ananya (Freelancer - BMSCE)] [Priya (AI & ML)] [Admin (Supervisor)]
```
> *Talking Point: "We built an instant persona switcher so evaluators can experience both sides of the marketplace without typing passwords during the viva."*

### Step 3: Task Directory (`http://localhost:3000/tasks`)
1. Click **'Browse Tasks'** in the navbar.
2. Demonstrate filtering:
   - Click **'Design & UI/UX'** or **'Data & AI'** to filter by category.
   - Adjust the budget filter slider (e.g., Min ₹500).
   - Type in the search box (e.g., `'React'` or `'Poster'`) to show GIN full-text search matching.

### Step 4: Proposals & Database Trigger Enforcement
1. Click on Aarav's task: **"Next.js Real-Time Event Dashboard"** (or any open task).
2. While logged in as Aarav (Task Poster):
   - Notice that Aarav **cannot** apply to his own task because PostgreSQL database triggers enforce relational integrity (`trg_prevent_self_application`).
3. Switch to **Ananya Rao** (`[Ananya (Freelancer - BMSCE)]`) using the top strip.
4. On the task page, Ananya now sees the **"Submit Proposal"** form.
5. Enter a Bid Amount (e.g. `₹1400`) and a cover note, then click **'Submit Application'**.
6. The page updates immediately showing *"Application Submitted - Status: PENDING"*.

### Step 5: ACID Proposal Acceptance
1. Switch back to **Aarav Sharma** (`[Aarav (Poster - PESU)]`).
2. Refresh or open the task page: Aarav sees Ananya's proposal in the **"Applicant Proposals"** section.
3. Click **'Accept Proposal & Assign Task'**:
   > *Talking Point: "This button calls `POST /api/applications/:id/accept`, which executes the stored PL/pgSQL function `fn_accept_application_transaction`. It acquires a row-level lock with `FOR UPDATE`, sets Ananya's status to `ACCEPTED`, bulk-rejects other applicants, updates the task to `ASSIGNED`, and creates the 1:1 assignment contract atomically."*
4. Notice the app automatically redirects to the interactive 1:1 Contract Workspace!

### Step 6: Interactive 1:1 Contract Workspace (`http://localhost:3000/assignments/[id]`)
Showcase the complete 4-step contract lifecycle:
1. **Stage 1 (`ASSIGNED`)**: Switch to Ananya (`[Ananya]`) $\to$ Click **'Confirm & Start Work'** (Status: `IN_PROGRESS`).
2. **Stage 2 (`IN_PROGRESS`)**: Ananya enters deliverable notes (e.g. *"Completed GitHub repository at github.com/ananya/event-ui"*). Click **'Submit Deliverable for Approval'** (Status: `SUBMITTED`).
3. **Stage 3 (`SUBMITTED`)**: Switch to Aarav (`[Aarav]`). Aarav reviews the submission notes and clicks **'Approve Deliverable & Release Payment'**.
   > *Talking Point: "This triggers an atomic transaction: marks assignment `COMPLETED`, marks task `COMPLETED`, and creates a verified financial record in the `payments` table."*
4. **Stage 4 (`COMPLETED` & 5-Star Review)**:
   - Review the Payment Receipt.
   - Aarav rates Ananya 5 Stars with feedback (*"Flawless delivery and clean code!"*).
   - Click **'Submit Evaluation'**.
   > *Talking Point: "This updates Ananya's reputation calculated live via stored function `fn_calculate_student_rating`."*

### Step 7: AI Semantic Recommendations & pgvector (`http://localhost:3000/recommendations`)
1. Click **'AI Match (pgvector)'** in the navbar.
2. Show the active PostgreSQL query box displaying:
   ```sql
   SELECT t.title, (task_vec.embedding <=> student_vec.embedding) AS cosine_distance...
   ```
3. Switch between personas (Ananya vs Priya vs Aarav) to show how recommendations change dynamically:
   - **Ananya (Designer)**: High matches for Graphic Design & UI/UX tasks.
   - **Priya (AI & ML)**: High matches for PyTorch, CNN, and Python scraping tasks.
4. Explain the math:
   $$\text{Cosine Distance } d = 1.0 - \frac{A \cdot B}{\|A\| \|B\|}$$
   $$\text{Match Score \%} = (1.0 - d) \times 100\%$$

### Step 8: DBMS Level 3 Viva Showcase Console (`http://localhost:3000/db-showcase`)
**⭐ Primary Screen for the Faculty Examiner!**
1. Click **'DBMS Showcase (Viva)'** in the navbar.
2. Click across the 5 demonstration tabs:
   - **Tab 1**: JOIN + GROUP BY + HAVING (Top Freelancers)
   - **Tab 2**: Subquery with Correlated Filtering (Category Average Budget)
   - **Tab 3**: Analytical View (`view_task_marketplace_stats`)
   - **Tab 4**: Stored Functions (`fn_calculate_student_rating` & `fn_calculate_student_earnings`)
   - **Tab 5**: pgvector Cosine Distance Search (`<=>`)
3. Point out for each tab:
   - Exact SQL query syntax
   - Real execution time in milliseconds (e.g., 2 ms)
   - Row count and live result table
4. Scroll down to: **"Query Optimization Inspector (EXPLAIN ANALYZE)"**:
   - Click **'Execute EXPLAIN (ANALYZE, BUFFERS)'**.
   - Show the actual PostgreSQL query planner tree, index scans, buffer hits, and execution cost!

### Step 9: Admin Console & Financial Audit Ledger (`http://localhost:3000/admin`)
1. Switch to `[Admin (Supervisor)]` persona using the top strip.
2. Click **'Admin'** in the navbar.
3. **Overview tab**: Total accounts, settled volume, category stats view, top freelancers leaderboard.
4. **Users tab**: Full directory with 1-click **'Suspend / Activate'** toggle (`is_active`).
5. **Ledger tab**: Immutable audit log (`view_student_earnings_ledger`) displaying payer, receiver, amount, and timestamp.

---

## 4. Part B: Backend Terminal Test Suites

Open a terminal in `d:\PESU\DBMS\Prayaspro\backend`:

```bash
# Test 1: Complete 14-Step Lifecycle & ACID Transactions
npm run test:flow
# (Passes all 14 steps: Auth, Task creation, Vectors, Triggers, ACID Accept, Settle, Review)

# Test 2: Academic SQL Query Suite
npm run test:queries
# (Executes JOINs, GROUP BY, HAVING, Correlated Subqueries, Window Functions, and pgvector)

# Test 3: Reproducible Database Reset & Seed
npm run db:reset
# (Rebuilds all migrations and populates 14 users, 15 tasks, and 28 vector embeddings)
```

---

## 5. Part C: Direct PostgreSQL Inspection (`psql`)

If the examiner asks you to open the database directly in the CLI:

```powershell
$env:PGPASSWORD="root"; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -U postgres -d prayaspro
```

Key inspection commands to show:
```sql
\dt              -- List all 10 tables (9 relational + 1 vector table)
\dv              -- List all 4 analytical views
\df fn_*         -- List all PL/pgSQL stored functions
\d tasks         -- Inspect constraints, foreign keys, and indexes on tasks
\d assignments   -- Show UNIQUE constraint on task_id enforcing 1:1 contract
\q               -- Exit psql
```

---

## 6. Top 10 Viva Questions & Bulletproof Answers

#### Q1: Why did you choose PostgreSQL with pgvector instead of MongoDB or Pinecone?
> **Answer**: Three critical DBMS reasons:
> 1. Financial payouts and contract state transitions require **ACID compliance**. PostgreSQL guarantees Atomicity, Consistency, Isolation, and Durability, eliminating double assignments or lost payments.
> 2. **Zero synchronization lag**: Vector embeddings live in the SAME transactional engine as relational records. When a task or skill profile is updated, relational and vector data stay in lockstep without distributed sync errors.
> 3. **Hybrid querying**: We can combine relational filtering (e.g. `status = 'OPEN'`, `budget >= 500`) with vector similarity (`ORDER BY embedding <=> query_vector`) in a single optimized query plan.

#### Q2: How do you enforce a 1:1 relationship between Task and Assignment?
> **Answer**: In the `assignments` table, the column `task_id` has an explicit UNIQUE constraint:
> `CONSTRAINT uq_assignments_task UNIQUE (task_id)`.
> This guarantees at the database level that a task can have at most ONE active or final contract.

#### Q3: How do you prevent race conditions when multiple users apply or when an owner accepts?
> **Answer**: We implement the PL/pgSQL stored procedure `fn_accept_application_transaction` which issues:
> `SELECT status FROM tasks WHERE task_id = v_task_id FOR UPDATE;`
> The `FOR UPDATE` clause places an exclusive row-level lock on the task row, serializing concurrent transactions and preventing two applicants from ever being accepted simultaneously.

#### Q4: What is the `<=>` operator in pgvector?
> **Answer**: `<=>` is the native PostgreSQL Cosine Distance operator:
> $$d = 1.0 - \frac{A \cdot B}{\|A\| \|B\|}$$
> Since our 384-dimensional embeddings are pre-normalized to unit length ($L_2 \text{ norm} = 1.0$), the cosine distance simplifies to `1.0 - dot_product`, enabling sub-millisecond similarity lookups.

#### Q5: Why use Common Table Expressions (CTEs) in `view_student_performance`?
> **Answer**: A student has multiple skills (1:M), multiple applications (1:M), and multiple reviews (1:M). If we directly JOIN all these tables in a single SELECT query, it creates a Cartesian product explosion, multiplying review counts and distorting earnings totals. We isolate aggregations into independent CTE subqueries per dimension before joining to `users`.

#### Q6: How do you prevent students from applying to their own tasks?
> **Answer**: Through a `BEFORE INSERT` database trigger: `trg_prevent_self_application`. When an INSERT on `applications` is executed, the trigger compares `NEW.student_id` with `tasks.owner_id`. If they match, it raises an exception (`RAISE EXCEPTION`) and aborts the insert at the schema level.

#### Q7: What indexes did you build and why?
> **Answer**:
> 1. B-Tree indexes on all foreign key columns to speed up relational joins.
> 2. Composite B-Tree index on `tasks(status, deadline)` to optimize marketplace searches.
> 3. GIN (Generalized Inverted Index) using `to_tsvector('english', title || ' ' || description)` for fast full-text searching across project descriptions.

#### Q8: What stored functions did you write?
> **Answer**:
> 1. `fn_calculate_student_rating(user_uuid)`: Dynamically computes average rating and review counts.
> 2. `fn_calculate_student_earnings(user_uuid)`: Aggregates settled payments where `payment_status = 'SUCCESS'`.
> 3. `fn_accept_application_transaction(...)`: Handles atomic contract formation with row locks.

#### Q9: What is the purpose of the 1:M relationship between Categories and Tasks?
> **Answer**: Each task belongs to exactly one category (`categories.category_id` FK in `tasks`), enabling categorical partitioning, domain indexing, and category-level statistical views (`view_task_marketplace_stats`).

#### Q10: How does your frontend communicate with the database?
> **Answer**: The Next.js frontend uses Next.js server rewrites to proxy API requests to our Node.js/Express backend on port 5000. The backend utilizes a PostgreSQL connection pool (`pg.Pool`) with parameterized queries to prevent SQL injection vulnerabilities and maintain persistent database connections.
