-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('owner', 'user')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BALANCES (Funds available)
CREATE TABLE IF NOT EXISTS public.balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  currency TEXT CHECK (currency IN ('PEN', 'USD')),
  amount DECIMAL(12, 2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSES (Expendios)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT CHECK (currency IN ('PEN', 'USD')),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own, Owners can view all
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Balances: Viewable by everyone (for now), Updating only by Owner
CREATE POLICY "Balances viewable by authenticated" ON public.balances FOR SELECT TO authenticated USING (true);
-- TODO: Restrict update to owner only

-- Expenses: Users can view/create their own. Owners view all.
CREATE POLICY "Users view own expenses" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Users create own expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- SEED DATA
-- Insert Owner Profile (simulated for the existing user)
INSERT INTO public.profiles (id, email, role, full_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@stitch.com', 'owner', 'Admin User')
ON CONFLICT (id) DO NOTHING;

-- Initial Balances
INSERT INTO public.balances (currency, amount) VALUES ('PEN', 4250.00), ('USD', 1120.50);
