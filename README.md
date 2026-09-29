# PRAYASPRO — Skill-Based Micro Task Marketplace for Students
**DBMS Level 3 Experiential Learning Project**

---

## Project Structure

This project is divided into distinct, decoupled tiers:

```
Prayaspro/
├── backend/          # Node.js + TypeScript + Express + PostgreSQL + pgvector
│   ├── src/
│   │   ├── db/              # Connection pool, migrations (001-004), seed & reset scripts
│   │   ├── services/        # Business logic, ACID transactions, vector embeddings
│   │   ├── routes/          # REST API endpoints (Auth, Tasks, Applications, Admin, etc.)
│   │   ├── middleware/      # JWT auth and role authorization guards
│   │   └── tests/           # Full end-to-end workflow and query suites
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
└── frontend/         # Next.js Full-Stack Web Application (Phase 2)
```

---

## Backend Status: Fully Implemented & Verified!

* **Database Engine**: PostgreSQL 18.6 on Port `5432` (`prayaspro`)
* **Vector Engine**: PostgreSQL `vector` with native `<=>` Cosine Distance Operator (384-dimensional unit vectors)
* **Tables**: `users`, `skills`, `student_skills`, `categories`, `tasks`, `applications`, `assignments`, `payments`, `reviews`, `content_embeddings`
* **All 14 Demo Flow Steps Verified**: `npm run test:flow`
* **Academic Query Suite Verified**: `npm run test:queries`
* **Live REST Server**: `http://localhost:5000`

See [backend/README.md](file:///d:/PESU/DBMS/Prayaspro/backend/README.md) for full setup, architecture details, and schema descriptions.
