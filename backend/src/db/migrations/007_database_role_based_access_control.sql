-- ====================================================================
-- PRAYASPRO MIGRATION 007: DATABASE ROLE-BASED ACCESS CONTROL (RBAC)
-- Academic Requirement: Role-Based Access Control in Database (PostgreSQL Engine Level)
-- Minimum Two Roles (STUDENT, ADMIN) + Auditor Role with Granular Table Privileges
-- ====================================================================

DO $$
BEGIN
    -- 1. Create Database Role: prayaspro_student (Micro-Task Worker & Poster)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prayaspro_student') THEN
        CREATE ROLE prayaspro_student WITH LOGIN PASSWORD 'student_secure_pass_2026' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;

    -- 2. Create Database Role: prayaspro_admin (Campus Platform Supervisor)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prayaspro_admin') THEN
        CREATE ROLE prayaspro_admin WITH LOGIN PASSWORD 'admin_secure_pass_2026' NOSUPERUSER CREATEDB NOCREATEROLE;
    END IF;

    -- 3. Create Database Role: prayaspro_auditor (Read-Only Financial & Academic Audit)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prayaspro_auditor') THEN
        CREATE ROLE prayaspro_auditor WITH LOGIN PASSWORD 'auditor_secure_pass_2026' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END $$;

-- Grant Schema Access
GRANT USAGE ON SCHEMA public TO prayaspro_student, prayaspro_admin, prayaspro_auditor;

-- ====================================================================
-- GRANULAR PRIVILEGES: prayaspro_student
-- ====================================================================
-- Students can browse the campus marketplace
GRANT SELECT ON categories, skills, tasks, users, student_skills, reviews, content_embeddings TO prayaspro_student;
-- Students can submit applications, post tasks, register skills, and review peers
GRANT INSERT, UPDATE ON applications, tasks, student_skills, reviews, content_embeddings TO prayaspro_student;
-- Students CANNOT tamper with payment ledgers directly (Enforced at DB level for financial escrow security)
REVOKE ALL ON payments FROM prayaspro_student;
REVOKE ALL ON view_student_earnings_ledger FROM prayaspro_student;

-- ====================================================================
-- GRANULAR PRIVILEGES: prayaspro_admin
-- ====================================================================
-- Admins have full maintenance privileges across all tables and analytical views
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prayaspro_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prayaspro_admin;

-- ====================================================================
-- GRANULAR PRIVILEGES: prayaspro_auditor
-- ====================================================================
-- Auditors have read-only audit access across all operational & financial tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO prayaspro_auditor;

-- ====================================================================
-- Database RBAC Inspection View for Academic Evaluation
-- ====================================================================
CREATE OR REPLACE VIEW view_database_rbac_privileges AS
SELECT 
    grantee AS database_role,
    table_name,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS granted_privileges,
    is_grantable
FROM information_schema.role_table_grants
WHERE grantee IN ('prayaspro_student', 'prayaspro_admin', 'prayaspro_auditor')
  AND table_schema = 'public'
GROUP BY grantee, table_name, is_grantable
ORDER BY grantee, table_name;

