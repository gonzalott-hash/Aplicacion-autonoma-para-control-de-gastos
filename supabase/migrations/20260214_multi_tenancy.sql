-- MIGRATION: 20260214_multi_tenancy.sql
-- Description: Implement Multi-Tenancy via owner_id column and updated RLS

-- 1. ADD owner_id COLUMN TO ALL TABLES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.initiatives ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.balances ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);

-- 2. MIGRATE EXISTING DATA
-- For PROFILES: Owner's owner_id is themselves.
UPDATE public.profiles SET owner_id = id WHERE role = 'owner';

-- For INITIATIVES: Copy created_by to owner_id
UPDATE public.initiatives SET owner_id = created_by WHERE owner_id IS NULL;

-- For EXPENSES: Get owner_id from the user who created it (simplification for existing single-tenant data)
-- Assuming all existing expenses belong to the single existing owner
UPDATE public.expenses 
SET owner_id = (SELECT id FROM public.profiles WHERE role = 'owner' LIMIT 1) 
WHERE owner_id IS NULL;

-- For BALANCES: Assign to the single existing owner
UPDATE public.balances 
SET owner_id = (SELECT id FROM public.profiles WHERE role = 'owner' LIMIT 1) 
WHERE owner_id IS NULL;

-- 3. ENABLE RLS (Ensure it is enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- 4. DROP OLD POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Rules for pofiles" ON public.profiles;

DROP POLICY IF EXISTS "Balances viewable by authenticated" ON public.balances;

DROP POLICY IF EXISTS "Users view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users create own expenses" ON public.expenses;

DROP POLICY IF EXISTS "Owners manage initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Members view assigned initiatives" ON public.initiatives;

-- 5. CREATE NEW MULTI-TENANCY RLS POLICIES

-- PROFILES
-- View: You see yourself OR you see members of your same owner_group
CREATE POLICY "View profiles in same tenant" ON public.profiles
FOR SELECT TO authenticated
USING (
  (auth.uid() = id) OR 
  (owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()))
);

-- Update: Only update self
CREATE POLICY "Update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- INITIATIVES
-- View/Edit: Only if owner_id matches your associated owner_id
CREATE POLICY "Tenant isolation for initiatives" ON public.initiatives
FOR ALL TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.initiative_members im WHERE im.initiative_id = id AND im.user_id = auth.uid())
);

-- EXPENSES
-- View/Edit: Only if owner_id matches your associated owner_id
CREATE POLICY "Tenant isolation for expenses" ON public.expenses
FOR ALL TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
);

-- BALANCES
-- View: Only if owner_id matches your associated owner_id
CREATE POLICY "Tenant isolation for balances" ON public.balances
FOR ALL TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
);
