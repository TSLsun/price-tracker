-- Migration: Add status and error_message fields to tracked_items
-- This supports the Supabase Realtime optimistic UI pattern:
--   1. Frontend inserts a row with status='pending' immediately
--   2. Background scraper updates to status='done' with the price, or status='error'
--   3. Frontend gets notified via Realtime CDC and updates the card automatically

ALTER TABLE tracked_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done'
    CHECK (status IN ('pending', 'done', 'error')),
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Backfill any existing rows that don't have a status yet
UPDATE tracked_items
SET status = 'done'
WHERE status IS NULL OR status = '';

-- Enable Realtime for tracked_items (if not already enabled)
-- Run this in the Supabase dashboard under Database > Replication if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE tracked_items;
