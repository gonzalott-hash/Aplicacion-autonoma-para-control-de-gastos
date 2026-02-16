CREATE OR REPLACE FUNCTION inject_funds(
  p_initiative_id UUID, 
  p_amount DECIMAL, 
  p_currency TEXT
) RETURNS VOID AS $$
BEGIN
  -- 1. (Optional) Update Global Balance if tracking totals, but don't block
  -- For now, just treating injection as 'new money' into the system
  
  -- 2. Add to Initiative Budget
  IF p_currency = 'PEN' THEN
    UPDATE initiatives 
    SET budget_pen = COALESCE(budget_pen, 0) + p_amount 
    WHERE id = p_initiative_id;
  ELSIF p_currency = 'USD' THEN
    UPDATE initiatives 
    SET budget_usd = COALESCE(budget_usd, 0) + p_amount 
    WHERE id = p_initiative_id;
  END IF;
  
  -- 3. (Optional) Log in balances table as 'inflow' if we want to track total assets
  -- UPSERT into balances
  IF p_currency = 'PEN' THEN
       INSERT INTO balances (currency, amount, updated_at)
       VALUES ('PEN', p_amount, NOW())
       ON CONFLICT (currency) DO UPDATE 
       SET amount = balances.amount + p_amount, updated_at = NOW();
  ELSIF p_currency = 'USD' THEN
       INSERT INTO balances (currency, amount, updated_at)
       VALUES ('USD', p_amount, NOW())
       ON CONFLICT (currency) DO UPDATE 
       SET amount = balances.amount + p_amount, updated_at = NOW();
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
