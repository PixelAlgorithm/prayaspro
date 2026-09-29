-- ====================================================================
-- PRAYASPRO INDEXES & PERFORMANCE OPTIMIZATION MIGRATION 002
-- Academic Requirement: Practical Demonstrable Indexing Strategy
-- ====================================================================

-- 1. B-Tree Indexes on Foreign Keys (Accelerates JOIN operations)
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_user_id ON student_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_skill_id ON student_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_applications_task_id ON applications(task_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_task_id ON payments(task_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_receiver_id ON payments(receiver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_task_id ON reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- 2. Filtering & Sorting Composite Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status_deadline ON tasks(status, deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_category_status ON tasks(category_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_task_status ON applications(task_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_receiver_status ON payments(receiver_id, payment_status);

-- 3. Content Embedding Lookup Index
CREATE INDEX IF NOT EXISTS idx_content_embeddings_lookup 
ON content_embeddings(entity_type, entity_id);

-- 4. Full-Text Search Index (GIN) on Task Title and Description
-- Used for fast keyword matching and hybrid search
CREATE INDEX IF NOT EXISTS idx_tasks_fts 
ON tasks USING gin(to_tsvector('english', title || ' ' || description));
