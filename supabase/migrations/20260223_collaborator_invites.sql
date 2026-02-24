-- 1. Create Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    initiative_id UUID NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, initiative_id)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their invitations" ON public.invitations
FOR SELECT TO authenticated
USING (invited_by = auth.uid());

CREATE POLICY "Owners can insert invitations" ON public.invitations
FOR INSERT TO authenticated
WITH CHECK (invited_by = auth.uid());

-- 2. Create RPC for frontend to invite users securely
CREATE OR REPLACE FUNCTION public.create_invitation(p_email TEXT, p_initiative_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.initiatives 
        WHERE id = p_initiative_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to invite to this initiative';
    END IF;

    INSERT INTO public.invitations (email, initiative_id, invited_by, status)
    VALUES (p_email, p_initiative_id, auth.uid(), 'pending')
    ON CONFLICT (email, initiative_id) DO UPDATE 
    SET status = 'pending', invited_by = auth.uid(), created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE email = NEW.email AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- It's a collaborator!
        INSERT INTO public.profiles (id, email, role, owner_id)
        VALUES (NEW.id, NEW.email, 'user', v_invitation.invited_by);
        
        INSERT INTO public.initiative_members (initiative_id, user_id)
        VALUES (v_invitation.initiative_id, NEW.id);
        
        UPDATE public.invitations
        SET status = 'accepted'
        WHERE id = v_invitation.id;
    ELSE
        -- Default: It's a completely new owner signing up on their own
        INSERT INTO public.profiles (id, email, role, owner_id)
        VALUES (NEW.id, NEW.email, 'owner', NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger for inheriting owner_id automatically on expenses
CREATE OR REPLACE FUNCTION public.set_expense_owner()
RETURNS trigger AS $$
BEGIN
    IF NEW.owner_id IS NULL THEN
        -- Heredar el owner_id del perfil del usuario que crea el gasto
        NEW.owner_id = (SELECT owner_id FROM public.profiles WHERE id = NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos el trigger si ya existiera para evitar errores al re-ejecutar
DROP TRIGGER IF EXISTS ensure_expense_owner ON public.expenses;

CREATE TRIGGER ensure_expense_owner
BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_expense_owner();
