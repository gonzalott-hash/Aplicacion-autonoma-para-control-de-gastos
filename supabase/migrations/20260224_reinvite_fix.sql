-- ==============================================================================
-- 1. ACTUALIZA LA FUNCIÓN DE INVITACIÓN PARA AÑADIR A USUARIOS EXISTENTES
-- ==============================================================================
-- Cuando un Propietario invita a alguien, si ese alguien YA EXISTE en el sistema
-- (en public.profiles), en lugar de solo dejar la invitación pendiente esperando
-- al trigger "handle_new_user", lo añadiremos inmediatamente a "initiative_members"
-- para que al entrar con el link mágico vea los fondos correctos.

CREATE OR REPLACE FUNCTION public.create_invitation(p_email TEXT, p_initiative_id UUID)
RETURNS VOID AS $$
DECLARE
    v_existing_user_id UUID;
BEGIN
    -- Verificar que quien invita es dueño legítimo de SEGURO de la iniciativa
    IF NOT EXISTS (
        SELECT 1 FROM public.initiatives 
        WHERE id = p_initiative_id AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to invite to this initiative';
    END IF;

    -- Registrar o actualizar la invitación (Para el historial y por si es usuario nuevo)
    INSERT INTO public.invitations (email, initiative_id, invited_by, status)
    VALUES (p_email, p_initiative_id, auth.uid(), 'pending')
    ON CONFLICT (email, initiative_id) DO UPDATE 
    SET status = 'pending', invited_by = auth.uid(), created_at = NOW();

    -- Buscar si el correo invitado ya pertenece a un perfil de usuario existente
    SELECT id INTO v_existing_user_id 
    FROM public.profiles 
    WHERE email = p_email 
    LIMIT 1;

    -- Si YA EXISTÍA el usuario, lo añadimos como colaborador inmediatamente
    IF v_existing_user_id IS NOT NULL THEN
        -- Actualizar su 'owner_id' principal al dueño de la iniciativa
        UPDATE public.profiles
        SET owner_id = auth.uid()
        WHERE id = v_existing_user_id;

        -- Meterlo de lleno en la iniciativa
        INSERT INTO public.initiative_members (initiative_id, user_id)
        VALUES (p_initiative_id, v_existing_user_id)
        ON CONFLICT (initiative_id, user_id) DO UPDATE
        SET added_at = NOW(); -- Renovar la fecha para que sea el primero al buscar

        -- Ya que fue añadido, marcar la invitación como aceptada de una vez
        UPDATE public.invitations
        SET status = 'accepted'
        WHERE email = p_email AND initiative_id = p_initiative_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
