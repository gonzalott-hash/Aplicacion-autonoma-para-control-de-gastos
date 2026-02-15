-- Add currency_mode column to initiatives table
-- Values: 'PEN' (Soles Only), 'USD' (Dollars Only), 'BOTH' (Both currencies)
-- Default: 'BOTH' to maintain backward compatibility

ALTER TABLE public.initiatives 
ADD COLUMN IF NOT EXISTS currency_mode TEXT DEFAULT 'BOTH' 
CHECK (currency_mode IN ('PEN', 'USD', 'BOTH'));

-- No need to migrate data as default 'BOTH' covers existing rows
