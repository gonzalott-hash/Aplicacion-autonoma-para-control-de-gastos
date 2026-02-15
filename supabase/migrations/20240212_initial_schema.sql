-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS Table
create table public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  role text check (role in ('owner', 'secondary')) not null default 'secondary',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- APP_CONFIG Table
create table public.app_config (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.users(id) not null,
  currency_mode text check (currency_mode in ('both', 'soles', 'dollars')) default 'both',
  secondary_password_hash text,
  expenses_enabled_today boolean default false,
  last_reset_date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MOVEMENTS Table
create table public.movements (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.users(id) not null,
  created_by uuid references public.users(id) not null,
  type text check (type in ('expense', 'income')) not null,
  amount decimal(12,2) not null,
  currency text check (currency in ('PEN', 'USD')) not null,
  category text not null,
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BALANCES Table
create table public.balances (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.users(id) not null,
  balance_pen decimal(12,2) default 0.00,
  balance_usd decimal(12,2) default 0.00,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Functions to handle new user signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'owner'); -- Default to owner for first user, logic to handle secondaries later
  
  -- Initialize balance for owner
  insert into public.balances (owner_id)
  values (new.id);

  -- Initialize app config for owner
  insert into public.app_config (owner_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS
alter table public.users enable row level security;
alter table public.app_config enable row level security;
alter table public.movements enable row level security;
alter table public.balances enable row level security;

-- Policies (Basic implementation, will refine later)
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);

create policy "Owner can view their config" on public.app_config for select using (auth.uid() = owner_id);
create policy "Owner can update their config" on public.app_config for update using (auth.uid() = owner_id);

create policy "Owner can view all movements" on public.movements for select using (owner_id = auth.uid());
create policy "Owner can insert movements" on public.movements for insert with check (owner_id = auth.uid());

create policy "Owner can view balance" on public.balances for select using (owner_id = auth.uid());
