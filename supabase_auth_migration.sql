-- Migration script for enabling Multi-User Auth with Supabase

-- 0. Clean up dummy data to prevent Foreign Key constraint errors
DELETE FROM public.price_history WHERE item_id IN (SELECT id FROM public.tracked_items WHERE user_id = '00000000-0000-0000-0000-000000000000');
DELETE FROM public.tracked_items WHERE user_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM public.categories WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- 1. Ensure user_id is the correct type and has the foreign key constraint
-- If the column exists as text, we might need to cast it or just alter it. 
-- Since we deleted dummy data, it's safe to alter.
ALTER TABLE public.tracked_items DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.tracked_items ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.categories DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.tracked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for tracked_items
DROP POLICY IF EXISTS "Users can view their own tracked items" ON public.tracked_items;
CREATE POLICY "Users can view their own tracked items" 
ON public.tracked_items FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tracked items" ON public.tracked_items;
CREATE POLICY "Users can insert their own tracked items" 
ON public.tracked_items FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tracked items" ON public.tracked_items;
CREATE POLICY "Users can update their own tracked items" 
ON public.tracked_items FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tracked items" ON public.tracked_items;
CREATE POLICY "Users can delete their own tracked items" 
ON public.tracked_items FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Create RLS Policies for categories
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
CREATE POLICY "Users can view their own categories" 
ON public.categories FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
CREATE POLICY "Users can insert their own categories" 
ON public.categories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories" 
ON public.categories FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;
CREATE POLICY "Users can delete their own categories" 
ON public.categories FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Create RLS Policies for price_history
-- Select: Users can see price history if they own the related tracked_item
DROP POLICY IF EXISTS "Users can view price history of their items" ON public.price_history;
CREATE POLICY "Users can view price history of their items" 
ON public.price_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tracked_items 
    WHERE public.tracked_items.id = public.price_history.item_id 
    AND public.tracked_items.user_id = auth.uid()
  )
);

-- Insert/Update/Delete (mostly for scraper or client actions)
DROP POLICY IF EXISTS "Users can insert price history for their items" ON public.price_history;
CREATE POLICY "Users can insert price history for their items" 
ON public.price_history FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tracked_items 
    WHERE public.tracked_items.id = public.price_history.item_id 
    AND public.tracked_items.user_id = auth.uid()
  )
);

-- (For the Scraper using Service Role key, it bypasses RLS naturally)
