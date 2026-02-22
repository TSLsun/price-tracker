-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Creates core tables for price tracker
-- Run this FIRST before any other migrations.
-- =============================================================================

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracked items table
CREATE TABLE IF NOT EXISTS public.tracked_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    url             TEXT NOT NULL,
    name            TEXT NOT NULL,
    unit_size       TEXT,
    current_price   NUMERIC(10, 2) DEFAULT 0,
    last_checked_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Price history table (no user_id; ownership derives from tracked_items)
CREATE TABLE IF NOT EXISTS public.price_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id     UUID NOT NULL REFERENCES public.tracked_items(id) ON DELETE CASCADE,
    price       NUMERIC(10, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
