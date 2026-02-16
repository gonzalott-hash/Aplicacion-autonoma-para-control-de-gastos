-- 1. Function to Reset Initiative
CREATE OR REPLACE FUNCTION admin_reset_initiative(
  p_initiative_id UUID,
  p_new_pen DECIMAL,
  p_new_usd DECIMAL,
  p_delete_history BOOLEAN
) RETURNS VOID AS $$
BEGIN
  -- 1. Reset Budget
  UPDATE initiatives 
  SET budget_pen = p_new_pen,
      budget_usd = p_new_usd,
      currency_mode = 'BOTH' -- Reset mode as requested
  WHERE id = p_initiative_id;

  -- 2. Delete History if requested
  IF p_delete_history THEN
    DELETE FROM expenses WHERE initiative_id = p_initiative_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger or Logic for logging initial expenses?
-- Better to handle in frontend or a specific function. 
-- Frontend is already handling 'inject_funds' logging.
-- We just need to make sure 'admin_reset_initiative' is available.
