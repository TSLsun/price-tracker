# Supabase Migrations

This directory contains all SQL migrations for the Price Tracker Supabase project.
Run them **in order** in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

---

## Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates `categories`, `tracked_items`, `price_history` tables |
| `002_enable_rls_and_policies.sql` | Enables Row Level Security and creates all access policies |

---

## How to Apply

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Navigate to **SQL Editor** → **New Query**
3. Paste the content of each migration file and click **Run**
4. Run them **in numerical order** (001 → 002)

> **Re-running is safe.** All migrations use `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS` guards.

---

## RLS Policy Design

### Row Level Security (RLS) Overview

All tables have RLS **enabled**. Without an explicit policy allowing access, all queries return empty results (deny-by-default).

### How User Isolation Works

| User Type | `auth.uid()` | Sees own data only? |
|-----------|-------------|----------------------|
| Email/Password | Real UUID | ✅ Yes |
| Google OAuth | Real UUID | ✅ Yes |
| **Anonymous** (`signInAnonymously`) | **Real UUID** | ✅ Yes |
| Not logged in | `NULL` | ✅ Returns nothing (no matching policy) |

> **Anonymous users are fully isolated.** Supabase's `signInAnonymously()` creates a real user row in `auth.users` with `is_anonymous = true`. They get a proper `auth.uid()` and can only see rows with their own `user_id`.

### Policy Summary

#### `categories` table
| Operation | Rule |
|-----------|------|
| SELECT | `user_id = auth.uid()` |
| INSERT | `user_id = auth.uid()` |
| UPDATE | `user_id = auth.uid()` |
| DELETE | `user_id = auth.uid()` |

#### `tracked_items` table
| Operation | Rule |
|-----------|------|
| SELECT | `user_id = auth.uid()` |
| INSERT | `user_id = auth.uid()` |
| UPDATE | `user_id = auth.uid()` |
| DELETE | `user_id = auth.uid()` |

#### `price_history` table
> `price_history` has no `user_id` — ownership is derived from the parent `tracked_items` row.

| Operation | Rule |
|-----------|------|
| SELECT | Parent `tracked_items.user_id = auth.uid()` |
| INSERT | Parent `tracked_items.user_id = auth.uid()` |
| UPDATE | **No policy (client cannot update)** — price history is append-only |
| DELETE | Parent `tracked_items.user_id = auth.uid()` |

> The **scraper** uses the **Service Role key**, which bypasses RLS entirely. It can insert/update `price_history` for any item regardless of ownership.

---

## Verification

After applying migrations, run these queries in SQL Editor to verify:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('categories', 'tracked_items', 'price_history');

-- List all active policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
