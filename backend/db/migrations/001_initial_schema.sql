-- ====================================================================
-- PRAYASPRO RELATIONAL SCHEMA MIGRATION 001
-- Skill-Based Micro Task Marketplace for Students
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Attempt pgvector extension
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not found in system libs, setting up compatible vector type';
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        CREATE DOMAIN vector AS real[];
    END IF;
END $$;

-- 2. USER Entity
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    college VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. SKILL Entity
CREATE TABLE IF NOT EXISTS skills (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL
);

-- 4. STUDENT_SKILL Entity (Associative Table: USER M:M SKILL)
CREATE TABLE IF NOT EXISTS student_skills (
    student_skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIATE' 
        CHECK (proficiency_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    years_experience NUMERIC(4, 1) NOT NULL DEFAULT 1.0 CHECK (years_experience >= 0),
    CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

-- 5. CATEGORY Entity
CREATE TABLE IF NOT EXISTS categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- 6. TASK Entity
CREATE TABLE IF NOT EXISTS tasks (
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

-- 7. APPLICATION Entity (USER M:M TASK)
CREATE TABLE IF NOT EXISTS applications (
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

-- 8. ASSIGNMENT Entity (1:1 with TASK)
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID UNIQUE NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' 
        CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED')),
    submission_notes TEXT
);

-- 9. PAYMENT Entity
CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    payer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. REVIEW Entity
CREATE TABLE IF NOT EXISTS reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    reviewed_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_task_reviewer UNIQUE (task_id, reviewer_id)
);

-- 11. CONTENT_EMBEDDING Entity (Vector Database Storage)
CREATE TABLE IF NOT EXISTS content_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('STUDENT', 'TASK')),
    entity_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_entity_embedding UNIQUE (entity_type, entity_id)
);
