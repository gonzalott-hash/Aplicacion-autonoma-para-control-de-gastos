CREATE OR REPLACE FUNCTION inject_funds(
  p_initiative_id UUID, 
  p_amount DECIMAL, 
  p_currency TEXT
) RETURNS VOID AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- 1. Check if sufficient global balance exists
  SELECT amount INTO v_current_balance FROM balances WHERE currency = p_currency;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente en %', p_currency;
  END IF;

  -- 2. Deduct from Global Balance
  UPDATE balances 
  SET amount = amount - p_amount, updated_at = NOW()
  WHERE currency = p_currency;

  -- 3. Add to Initiative Budget
  IF p_currency = 'PEN' THEN
    UPDATE initiatives 
    SET budget_pen = budget_pen + p_amount 
    WHERE id = p_initiative_id;
  ELSIF p_currency = 'USD' THEN
    UPDATE initiatives 
    SET budget_usd = budget_usd + p_amount 
    WHERE id = p_initiative_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
