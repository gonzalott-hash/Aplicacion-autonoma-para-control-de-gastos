-- Since we can't easily install pg_cron on all Supabase tiers (it requires specific setup),
-- We will implement a logical check in the `fetchConfig` or `validate` logic.
-- Ideally, `last_reset_date` in `app_config` should be checked.
-- If `last_reset_date` < current_date, we reset `expenses_enabled_today` to false and update `last_reset_date`.

create or replace function public.check_daily_reset()
returns void as $$
begin
  -- Update rows where last_reset_date is older than today
  update public.app_config
  set expenses_enabled_today = false,
      last_reset_date = current_date
  where last_reset_date < current_date;
end;
$$ language plpgsql security definer;

-- We can call this function periodically or whenever config is fetched.
-- Let's just expose it via RPC and call it on Dashboard load (Owner) or Login?
-- Better: Create a trigger? No, trigger on what? 
-- Simplest: On `Dashboard` load, if I am owner, I call this RPC. 
-- Or let's make the `fetchConfig` in store call this RPC first?
-- Actually, let's just make the `app_config` query a function that checks reset first?
-- "Logic on fetch" is safer for MVP without cron.

create or replace function public.get_my_config()
returns setof public.app_config as $$
begin
  -- Check and reset if needed for the calling user (if owner)
  update public.app_config
  set expenses_enabled_today = false,
      last_reset_date = current_date
  where owner_id = auth.uid() and last_reset_date < current_date;
  
  -- Return the config
  return query select * from public.app_config where owner_id = auth.uid();
end;
$$ language plpgsql security definer;
