-- Function to safely reset an initiative's data
-- This function runs with SECURITY DEFINER to bypass RLS restrictions on DELETE/UPDATE if needed,
-- but we should add a check to ensure only the owner can call it (or relies on being called by authenticated user).

CREATE OR REPLACE FUNCTION public.admin_reset_initiative(
    p_initiative_id UUID,
    p_new_pen NUMERIC DEFAULT NULL,
    p_new_usd NUMERIC DEFAULT NULL,
    p_delete_history BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
AS $$
DECLARE
    v_user_role TEXT;
    v_result JSON;
BEGIN
    -- 1. Security Check: Ensure the caller is an OWNER or has rights.
    -- For simplicity in this project context, we check if the user is an owner in profiles.
    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_user_role IS DISTINCT FROM 'owner' THEN
        RAISE EXCEPTION 'Unauthorized: Only owners can reset initiatives.';
    END IF;

    -- 2. Delete History if requested
    IF p_delete_history THEN
        DELETE FROM public.expenses
        WHERE initiative_id = p_initiative_id;
    END IF;

    -- 3. Update Budgets if provided
    -- We only update if the value is not null.
    IF p_new_pen IS NOT NULL THEN
        UPDATE public.initiatives
        SET budget_pen = p_new_pen
        WHERE id = p_initiative_id;
    END IF;

    IF p_new_usd IS NOT NULL THEN
        UPDATE public.initiatives
        SET budget_usd = p_new_usd
        WHERE id = p_initiative_id;
    END IF;

    v_result := json_build_object(
        'success', true,
        'message', 'Initiative reset successfully'
    );

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
