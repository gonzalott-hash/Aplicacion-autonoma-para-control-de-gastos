-- 1. Enable pgcrypto extension for secure hashing functions
create extension if not exists pgcrypto;

-- 2. Create secure function to verify secondary password
-- This function runs on the server (security definer) and only returns true/false
create or replace function public.verify_secondary_password(input_password text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_stored_hash text;
  v_owner_id uuid;
begin
  -- Identify who is the "owner" of the system for the current user
  -- If the user is an owner, they are their own owner.
  -- If the user is secondary, they have an owner_id.
  select owner_id into v_owner_id
  from public.users
  where id = auth.uid()
  limit 1;

  if v_owner_id is null then
    return false;
  end if;

  -- Get the stored password hash from that owner's config
  select secondary_password_hash into v_stored_hash
  from public.app_config
  where owner_id = v_owner_id
  limit 1;

  -- If no password is configured, deny access
  if v_stored_hash is null then
    return false;
  end if;

  -- Compare the input password with the stored secure hash
  return (v_stored_hash = crypt(input_password, v_stored_hash));
end;
$$;
