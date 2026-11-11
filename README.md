# PRAYASPRO — Skill-Based Micro Task Marketplace for Students
**DBMS Level 3 Experiential Learning Project | PES University**

---

## 🌟 Platform Overview

**PrayasPro** is an academic micro-task marketplace connecting university peers:
1. **Task Posters (Students)** who need academic, technical, design, or lab project deliverables completed.
2. **Specialists (Students)** with proven competencies looking to earn campus stipends and build verifiable peer ratings.
3. **Faculty / Supervisors** who oversee campus transaction integrity and audit dispute logs.

---

## 🏛️ System Architecture

The application is architected into decoupled full-stack tiers:

```
Prayaspro/
├── backend/                  # Node.js + TypeScript + Express + PostgreSQL 18
│   ├── src/
│   │   ├── db/               # Pool, migrations (001-004), seed & synthetic generators
│   │   ├── services/         # ACID transactions, vector embeddings, business logic
│   │   ├── routes/           # REST endpoints (auth, tasks, applications, assignments, showcase)
│   │   ├── middleware/       # JWT auth & role authorization guards
│   │   └── tests/            # 14-step end-to-end lifecycle & SQL query test suites
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── frontend/                 # Next.js 14 + React 18 + Vanilla CSS (Campus Design System)
    ├── app/
    │   ├── page.tsx          # High-converting landing page with live PostgreSQL SSR stats
    │   ├── tasks/            # Task directory with multi-filters and budget range
    │   ├── tasks/[id]/       # Task specifications, proposal submission, applicant review
    │   ├── tasks/create/     # Post new task with category & skill tagging
    │   ├── my-tasks/         # Client task management & assignment links
    │   ├── my-applications/  # Proposal tracking & bid withdrawal
    │   ├── assignments/[id]/ # Interactive 1:1 contract workspace (Work, Submit, Approve, Review)
    │   ├── dashboard/        # Student portfolio manager, earnings & competency editor
    │   ├── recommendations/  # pgvector 384-dimensional cosine distance (<=>) matching explorer
    │   ├── admin/            # Administrative supervisor console & financial ledger
    │   └── db-showcase/      # DBMS Level 3 Viva presentation console with live EXPLAIN ANALYZE
    ├── components/           # Navbar with 1-click persona switcher, Footer, TaskCard
    ├── lib/                  # AuthContext, session storage, API fetch client
    └── package.json
```

---

## 🚀 Quick Start (Running Both Servers)

### Prerequisites
- PostgreSQL 18 running on `localhost:5432` with database `prayaspro` (`postgres:root`)
- Node.js v18+

### 1. Backend Server (Port 5001)
```bash
cd backend
npm install
npm run db:reset       # Runs migrations 001-007 and populates synthetic campus data
npm run dev            # Starts REST API daemon on http://localhost:5001
```

### 2. Frontend Application (Port 3000)
```bash
cd frontend
npm install
npm run dev            # Starts Next.js on http://localhost:3000
```

### 3. Automated System Tests
```bash
npm run test:smoke      # Verifies frontend API integration & health endpoints
npm run test:flow       # 14-step automated lifecycle transaction test
npm run test:queries    # Executes & profiles all 10 Level 3 SQL benchmark queries
```

Open `http://localhost:3000` in any web browser!

---

## 🎭 1-Click Quick Demo Personas (For Viva & Presentation)

A top demo strip is available on every page to switch personas instantly without entering passwords:

| Persona | Email | College | Primary Role | Key Features to Demonstrate |
| :--- | :--- | :--- | :--- | :--- |
| **Aarav Sharma** | `aarav@pesu.edu` | PES University | Task Poster & Client | Post tasks, review student applicants, accept proposals with ACID transaction |
| **Ananya Rao** | `ananya@bmsce.edu` | BMSCE | Top Freelancer (5.0 ★) | Submit proposals, advance assignment contract, deliver work, view earnings |
| **Priya Nair** | `priya@pesu.edu` | PES University | AI & ML Student | Test pgvector skill recommendations, manage portfolio competencies |
| **Admin Supervisor** | `admin@prayaspro.edu` | PrayasPro Oversight | Platform Supervisor | Access PostgreSQL analytical views, user suspension toggles, and payment audit ledger |

*Default password for all demo accounts:* `password123`

---

## 📊 DBMS Level 3 Requirements Implementation

| Rubric Requirement | Implementation Location in PrayasPro |
| :--- | :--- |
| **Relational Schema (9 Entities)** | `backend/src/db/migrations/001_initial_schema.sql` strictly mirrors `PrayasPro_ER_Relational.drawio.svg`. |
| **ACID Stored Transactions** | `fn_accept_application_transaction` & `completeTaskAndReleasePayment` atomic contracts with rollback. |
| **Integrity Triggers** | `trg_prevent_self_application`, `trg_validate_task_status`, `trg_update_task_timestamp`. |
| **Stored Functions** | `fn_calculate_student_rating` & `fn_calculate_student_earnings`. |
| **Analytical Database Views** | `view_task_marketplace_stats`, `view_student_performance`, `view_student_earnings_ledger`, `view_top_rated_freelancers`. |
| **Indexing & Query Optimization** | Composite B-Tree indexes, GIN full-text search index, live `EXPLAIN (ANALYZE, BUFFERS)` in `/db-showcase`. |
| **Advanced Vector Similarity** | 384-dimensional unit vector embeddings with `<=>` Cosine Distance operator in PostgreSQL. |

---

## 🧪 Verification Commands

```bash
# In backend/
npm run test:flow      # Executes complete 14-step marketplace lifecycle
npm run test:queries   # Runs 6 academic SQL verification suites (JOINs, HAVING, Views, Functions)
```

See `IMPLEMENTED.md` for the concise viva cheatsheet.
