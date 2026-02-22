-- =============================================================================
-- Migration: 002_enable_rls_and_policies.sql
-- Description: Enable Row Level Security (RLS) on all tables and define
--              per-user access policies.
--
-- HOW IT WORKS:
--   - Supabase uses PostgreSQL's RLS. Every query uses auth.uid() to identify
--     the current user (works for both email/password and anonymous sessions).
--   - Anonymous users (signInAnonymously) get a real auth.uid(), so they are
--     fully isolated — they can only see their own rows.
--   - The scraper uses the Service Role key, which BYPASSES RLS entirely,
--     so it can insert price_history for any item without needing ownership.
--
-- IMPORTANT: Run this migration in the Supabase SQL Editor (Dashboard > SQL Editor).
--            Re-running is safe because all DROP IF EXISTS guards are in place.
-- =============================================================================

-- ┌─────────────────────────────────────────────────────┐
-- │ 1. Enable RLS on all tables                         │
-- └─────────────────────────────────────────────────────┘
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;


-- ┌─────────────────────────────────────────────────────┐
-- │ 2. categories — CRUD policies                       │
-- │    Rule: users can only touch rows where            │
-- │    user_id = their own auth.uid()                   │
-- └─────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS "categories: owner can select" ON public.categories;
CREATE POLICY "categories: owner can select"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories: owner can insert" ON public.categories;
CREATE POLICY "categories: owner can insert"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories: owner can update" ON public.categories;
CREATE POLICY "categories: owner can update"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories: owner can delete" ON public.categories;
CREATE POLICY "categories: owner can delete"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);


-- ┌─────────────────────────────────────────────────────┐
-- │ 3. tracked_items — CRUD policies                    │
-- │    Rule: users can only touch rows where            │
-- │    user_id = their own auth.uid()                   │
-- └─────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS "tracked_items: owner can select" ON public.tracked_items;
CREATE POLICY "tracked_items: owner can select"
    ON public.tracked_items FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tracked_items: owner can insert" ON public.tracked_items;
CREATE POLICY "tracked_items: owner can insert"
    ON public.tracked_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tracked_items: owner can update" ON public.tracked_items;
CREATE POLICY "tracked_items: owner can update"
    ON public.tracked_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tracked_items: owner can delete" ON public.tracked_items;
CREATE POLICY "tracked_items: owner can delete"
    ON public.tracked_items FOR DELETE
    USING (auth.uid() = user_id);


-- ┌─────────────────────────────────────────────────────┐
-- │ 4. price_history — policies                         │
-- │    price_history has NO user_id column.             │
-- │    Ownership is derived via the parent tracked_item. │
-- │                                                     │
-- │    SELECT/DELETE: allowed if the related item       │
-- │    belongs to auth.uid().                           │
-- │                                                     │
-- │    INSERT: allowed for the item owner OR for the    │
-- │    scraper (which uses Service Role and bypasses    │
-- │    RLS anyway — this policy only applies to         │
-- │    anon/email users).                               │
-- │                                                     │
-- │    UPDATE: not allowed from the client — price      │
-- │    history is append-only. Scraper bypasses RLS.    │
-- └─────────────────────────────────────────────────────┘

DROP POLICY IF EXISTS "price_history: owner can select" ON public.price_history;
CREATE POLICY "price_history: owner can select"
    ON public.price_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tracked_items ti
            WHERE ti.id = public.price_history.item_id
              AND ti.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "price_history: owner can insert" ON public.price_history;
CREATE POLICY "price_history: owner can insert"
    ON public.price_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tracked_items ti
            WHERE ti.id = public.price_history.item_id
              AND ti.user_id = auth.uid()
        )
    );

-- No UPDATE policy — price history is immutable from the client side.
-- The scraper uses Service Role key which bypasses RLS for updates/inserts.

DROP POLICY IF EXISTS "price_history: owner can delete" ON public.price_history;
CREATE POLICY "price_history: owner can delete"
    ON public.price_history FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tracked_items ti
            WHERE ti.id = public.price_history.item_id
              AND ti.user_id = auth.uid()
        )
    );


-- ┌─────────────────────────────────────────────────────┐
-- │ 5. Verification queries (run after applying)        │
-- │    Paste each block separately in SQL Editor        │
-- └─────────────────────────────────────────────────────┘

-- Check RLS is enabled on all three tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('categories', 'tracked_items', 'price_history');

-- List all active policies:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
