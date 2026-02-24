-- MIGRATION: 20260223_fix_expense_rls.sql
-- Description: Asegurar que los colaboradores puedan leer e insertar gastos basados en los miembros de la iniciativa
-- Y reparar posibles bloqueos estrictos en `expenses`.

-- 1. Eliminar la política anterior estricta que podría estar causando problemas
DROP POLICY IF EXISTS "Tenant isolation for expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users create own expenses" ON public.expenses;

-- 2. Crear nueva política permisiva de lectura para dueños y miembros (colaboradores)
CREATE POLICY "Expenses viewable by owners and members" ON public.expenses
FOR SELECT TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (
      SELECT 1 FROM public.initiative_members im 
      WHERE im.initiative_id = expenses.initiative_id 
      AND im.user_id = auth.uid()
  )
);

-- 3. Crear nueva política permisiva de inserción para dueños y miembros (colaboradores)
CREATE POLICY "Expenses insertable by owners and members" ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (
      SELECT 1 FROM public.initiative_members im 
      WHERE im.initiative_id = expenses.initiative_id 
      AND im.user_id = auth.uid()
  )
);

-- 4. Actualizar las políticas para `initiatives` de forma segura por si acaso el SELECT general fallaba
DROP POLICY IF EXISTS "Tenant isolation for initiatives" ON public.initiatives;

CREATE POLICY "Tenant isolation for initiatives" ON public.initiatives
FOR ALL TO authenticated
USING (
  owner_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (
      SELECT 1 FROM public.initiative_members im 
      WHERE im.initiative_id = initiatives.id 
      AND im.user_id = auth.uid()
  )
);
