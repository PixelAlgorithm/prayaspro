-- Add progress_percentage and revision_notes to assignments table for milestone tracking
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS revision_notes TEXT;
