-- 1. Add owner_id to users table to link secondaries to owners
alter table public.users 
add column if not exists owner_id uuid references public.users(id);

-- 2. Create allowed_secondaries table for invitations/whitelist
create table if not exists public.allowed_secondaries (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.users(id) not null,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(owner_id, email)
);

-- 3. RLS for allowed_secondaries
alter table public.allowed_secondaries enable row level security;

create policy "Owners can manage their allowed secondaries"
  on public.allowed_secondaries
  for all
  using (auth.uid() = owner_id);

-- 4. Update handle_new_user trigger to assign role and owner_id
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_owner_id uuid;
begin
  -- Check if email is in allowed_secondaries
  select owner_id into v_owner_id
  from public.allowed_secondaries
  where email = new.email
  limit 1;

  if v_owner_id is not null then
    -- It's a secondary user
    insert into public.users (id, email, role, owner_id)
    values (new.id, new.email, 'secondary', v_owner_id);
  else
    -- It's a new owner (or uninvited user becoming owner)
    -- For this app, anyone not invited becomes an owner of their own system.
    insert into public.users (id, email, role, owner_id)
    values (new.id, new.email, 'owner', new.id); -- Owner is their own owner
    
    -- Initialize balance for owner
    insert into public.balances (owner_id)
    values (new.id);

    -- Initialize app config for owner
    insert into public.app_config (owner_id)
    values (new.id);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;
