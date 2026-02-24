-- MIGRATION: 20260224_master_rls_fix.sql
-- Este script es seguro de ejecutar múltiples veces. Arregla cualquier desalineación de permisos al iniciar de cero.

-- 1. AUTOSANACIÓN: Asegurar que todos los dueños actuales tengan su propio id como owner_id
UPDATE public.profiles
SET owner_id = id
WHERE role = 'owner' AND (owner_id IS NULL OR owner_id != id);

-- 2. Limpiar CUALQUIER política antigua de gastos para evitar conflictos
DROP POLICY IF EXISTS "Tenant isolation for expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users create own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Expenses viewable by owners and members" ON public.expenses;
DROP POLICY IF EXISTS "Expenses insertable by owners and members" ON public.expenses;
DROP POLICY IF EXISTS "Expenses access for owners and members" ON public.expenses;

-- 3. Crear UNA ÚNICA POLÍTICA MAESTRA para Gastos (Aplica a SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Expenses master access" ON public.expenses
FOR ALL TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (
      SELECT 1 FROM public.initiative_members im 
      WHERE im.initiative_id = initiative_id 
      AND im.user_id = auth.uid()
  )
)
WITH CHECK (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (
      SELECT 1 FROM public.initiative_members im 
      WHERE im.initiative_id = initiative_id 
      AND im.user_id = auth.uid()
  )
);

-- 4. Limpiar y recrear política para Iniciativas
DROP POLICY IF EXISTS "Tenant isolation for initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Owners manage initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Members view assigned initiatives" ON public.initiatives;

CREATE POLICY "Initiatives master access" ON public.initiatives
FOR ALL TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (
      SELECT 1 FROM public.initiative_members im 
      WHERE im.initiative_id = id 
      AND im.user_id = auth.uid()
  )
)
WITH CHECK (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. Limpiar y recrear política para Balances Históricos
DROP POLICY IF EXISTS "Tenant isolation for balances" ON public.balances;

CREATE POLICY "Balances master access" ON public.balances
FOR ALL TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
);
