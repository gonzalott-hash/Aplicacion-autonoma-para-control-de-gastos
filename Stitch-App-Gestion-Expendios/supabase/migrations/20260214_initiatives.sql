-- INITIATIVES
CREATE TABLE IF NOT EXISTS public.initiatives (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  budget_pen DECIMAL(12, 2) DEFAULT 0.00,
  budget_usd DECIMAL(12, 2) DEFAULT 0.00,
  icon TEXT DEFAULT 'work',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INITIATIVE MEMBERS (Users authorized to spend)
CREATE TABLE IF NOT EXISTS public.initiative_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(initiative_id, user_id)
);

-- EXPENSES (Link to Initiatives)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS initiative_id UUID REFERENCES public.initiatives(id);

-- RLS
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiative_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners manage initiatives" ON public.initiatives 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Members view assigned initiatives" ON public.initiatives 
  FOR SELECT TO authenticated 
  USING (
    active = TRUE AND 
    (EXISTS (SELECT 1 FROM public.initiative_members WHERE initiative_id = id AND user_id = auth.uid()) 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  );

CREATE POLICY "Owners manage members" ON public.initiative_members 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'));

