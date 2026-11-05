-- ====================================================================
-- PRAYASPRO MIGRATION 006: SKILL PREREQUISITES & RECURSIVE SQL HIERARCHY
-- Academic Requirement: Demonstrable Recursive Queries (WITH RECURSIVE),
-- Hierarchical Trees, and Stored Recursive Procedural Traversal
-- ====================================================================

-- 1. Add Self-Referencing Foreign Key to Skills Table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS parent_skill_id UUID REFERENCES skills(skill_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_skills_parent_id ON skills(parent_skill_id);

-- 2. Insert Foundational Root Skills if they do not exist
INSERT INTO skills (skill_name, category, description)
VALUES 
    ('JavaScript & Web Core', 'Software & Web Dev', 'Foundational DOM, ES6+ syntax, asynchronous programming, and web standards'),
    ('Graphic Design Fundamentals', 'Graphic Design', 'Color theory, typography, visual hierarchy, and composition basics'),
    ('Video Storyboarding', 'Video & Animation', 'Narrative structure, timing, shot composition, and visual scripting')
ON CONFLICT (skill_name) DO NOTHING;

-- 3. Establish Realistic Multi-Level Parent-Child Skill Relationships
DO $$
DECLARE
    v_js_id UUID;
    v_react_id UUID;
    v_next_id UUID;
    v_py_id UUID;
    v_pandas_id UUID;
    v_ml_id UUID;
    v_gd_id UUID;
    v_figma_id UUID;
    v_cw_id UUID;
    v_tw_id UUID;
    v_vs_id UUID;
    v_ve_id UUID;
BEGIN
    SELECT skill_id INTO v_js_id FROM skills WHERE skill_name = 'JavaScript & Web Core';
    SELECT skill_id INTO v_react_id FROM skills WHERE skill_name = 'React';
    SELECT skill_id INTO v_next_id FROM skills WHERE skill_name = 'Next.js';
    
    SELECT skill_id INTO v_py_id FROM skills WHERE skill_name = 'Python';
    SELECT skill_id INTO v_pandas_id FROM skills WHERE skill_name = 'Pandas';
    SELECT skill_id INTO v_ml_id FROM skills WHERE skill_name = 'Machine Learning';

    SELECT skill_id INTO v_gd_id FROM skills WHERE skill_name = 'Graphic Design Fundamentals';
    SELECT skill_id INTO v_figma_id FROM skills WHERE skill_name = 'Figma';

    SELECT skill_id INTO v_cw_id FROM skills WHERE skill_name = 'Content Writing';
    SELECT skill_id INTO v_tw_id FROM skills WHERE skill_name = 'Technical Writing';

    SELECT skill_id INTO v_vs_id FROM skills WHERE skill_name = 'Video Storyboarding';
    SELECT skill_id INTO v_ve_id FROM skills WHERE skill_name = 'Video Editing';

    -- Chain 1: JavaScript & Web Core -> React -> Next.js (3-level recursion)
    IF v_js_id IS NOT NULL AND v_react_id IS NOT NULL THEN
        UPDATE skills SET parent_skill_id = v_js_id WHERE skill_id = v_react_id;
    END IF;
    IF v_react_id IS NOT NULL AND v_next_id IS NOT NULL THEN
        UPDATE skills SET parent_skill_id = v_react_id WHERE skill_id = v_next_id;
    END IF;

    -- Chain 2: Python -> Pandas -> Machine Learning (3-level recursion)
    IF v_py_id IS NOT NULL AND v_pandas_id IS NOT NULL THEN
        UPDATE skills SET parent_skill_id = v_py_id WHERE skill_id = v_pandas_id;
    END IF;
    IF v_pandas_id IS NOT NULL AND v_ml_id IS NOT NULL THEN
        UPDATE skills SET parent_skill_id = v_pandas_id WHERE skill_id = v_ml_id;
    END IF;

    -- Chain 3: Graphic Design Fundamentals -> Figma (2-level recursion)
    IF v_gd_id IS NOT NULL AND v_figma_id IS NOT NULL THEN
        UPDATE skills SET parent_skill_id = v_gd_id WHERE skill_id = v_figma_id;
    END IF;

    -- Chain 4: Content Writing -> Technical Writing (2-level recursion)
    IF v_cw_id IS NOT NULL AND v_tw_id IS NOT NULL THEN
        UPDATE skills SET parent_skill_id = v_cw_id WHERE skill_id = v_tw_id;
    END IF;

    -- Chain 5: Video Storyboarding -> Video Editing (2-level recursion)
    IF v_vs_id IS NOT NULL AND v_ve_id IS NOT NULL THEN
        UPDATE skills SET parent_skill_id = v_vs_id WHERE skill_id = v_ve_id;
    END IF;
END $$;

-- 4. Create View: Recursive Skill Dependency Tree
CREATE OR REPLACE VIEW view_skill_prerequisite_hierarchy AS
WITH RECURSIVE skill_tree AS (
    -- Anchor Member: Root skills with no prerequisites (depth 1)
    SELECT 
        s.skill_id,
        s.skill_name,
        s.category,
        s.parent_skill_id,
        NULL::VARCHAR(100) AS parent_skill_name,
        1 AS depth_level,
        s.skill_name::TEXT AS learning_path
    FROM skills s
    WHERE s.parent_skill_id IS NULL

    UNION ALL

    -- Recursive Member: Specialized child skills
    SELECT 
        child.skill_id,
        child.skill_name,
        child.category,
        child.parent_skill_id,
        parent.skill_name AS parent_skill_name,
        parent.depth_level + 1 AS depth_level,
        parent.learning_path || ' ➔ ' || child.skill_name AS learning_path
    FROM skills child
    JOIN skill_tree parent ON child.parent_skill_id = parent.skill_id
)
SELECT * FROM skill_tree;

-- 5. Stored Function: Recursive Skill Prerequisite Path Finder
CREATE OR REPLACE FUNCTION fn_get_skill_prerequisites(p_skill_id UUID)
RETURNS TABLE (
    prerequisite_id UUID,
    prerequisite_name VARCHAR(100),
    category VARCHAR(100),
    dependency_order INT,
    path TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE prereqs AS (
        -- Anchor Member: Direct parent of target skill
        SELECT 
            s.skill_id,
            s.skill_name,
            s.category,
            s.parent_skill_id,
            1 AS dependency_order,
            s.skill_name::TEXT AS path
        FROM skills target
        JOIN skills s ON target.parent_skill_id = s.skill_id
        WHERE target.skill_id = p_skill_id

        UNION ALL

        -- Recursive Member: Ascend up the prerequisite chain to roots
        SELECT 
            ancestor.skill_id,
            ancestor.skill_name,
            ancestor.category,
            ancestor.parent_skill_id,
            p.dependency_order + 1,
            ancestor.skill_name || ' ➔ ' || p.path
        FROM skills ancestor
        JOIN prereqs p ON ancestor.skill_id = p.parent_skill_id
    )
    SELECT 
        p.skill_id AS prerequisite_id,
        p.skill_name AS prerequisite_name,
        p.category,
        p.dependency_order,
        p.path
    FROM prereqs p
    ORDER BY p.dependency_order DESC;
END;
$$ LANGUAGE plpgsql STABLE;

