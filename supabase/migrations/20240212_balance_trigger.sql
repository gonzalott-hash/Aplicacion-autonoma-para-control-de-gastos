-- Function to update balances on movement insert/update/delete
create or replace function public.update_balance()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    if (NEW.currency = 'PEN') then
      update public.balances 
      set balance_pen = balance_pen + (case when NEW.type = 'income' then NEW.amount else -NEW.amount end),
          updated_at = now()
      where owner_id = NEW.owner_id;
    elsif (NEW.currency = 'USD') then
      update public.balances 
      set balance_usd = balance_usd + (case when NEW.type = 'income' then NEW.amount else -NEW.amount end),
          updated_at = now()
      where owner_id = NEW.owner_id;
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    -- Reverse the effect of the deleted movement
    if (OLD.currency = 'PEN') then
      update public.balances 
      set balance_pen = balance_pen - (case when OLD.type = 'income' then OLD.amount else -OLD.amount end),
          updated_at = now()
      where owner_id = OLD.owner_id;
    elsif (OLD.currency = 'USD') then
      update public.balances 
      set balance_usd = balance_usd - (case when OLD.type = 'income' then OLD.amount else -OLD.amount end),
          updated_at = now()
      where owner_id = OLD.owner_id;
    end if;
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    -- Handle amount/type change. 
    -- Simplest way: Reverse OLD and apply NEW.
    
    -- Reverse OLD
    if (OLD.currency = 'PEN') then
      update public.balances 
      set balance_pen = balance_pen - (case when OLD.type = 'income' then OLD.amount else -OLD.amount end)
      where owner_id = OLD.owner_id;
    elsif (OLD.currency = 'USD') then
      update public.balances 
      set balance_usd = balance_usd - (case when OLD.type = 'income' then OLD.amount else -OLD.amount end)
      where owner_id = OLD.owner_id;
    end if;

    -- Apply NEW
    if (NEW.currency = 'PEN') then
      update public.balances 
      set balance_pen = balance_pen + (case when NEW.type = 'income' then NEW.amount else -NEW.amount end),
          updated_at = now()
      where owner_id = NEW.owner_id;
    elsif (NEW.currency = 'USD') then
      update public.balances 
      set balance_usd = balance_usd + (case when NEW.type = 'income' then NEW.amount else -NEW.amount end),
          updated_at = now()
      where owner_id = NEW.owner_id;
    end if;
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_movement_change on public.movements;
create trigger on_movement_change
  after insert or update or delete on public.movements
  for each row execute procedure public.update_balance();
