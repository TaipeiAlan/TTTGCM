-- sql_of_stock_html.sql
-- Schema for stock.html cloud sync (類股清單 / watchlist backup).
-- Run this in the Supabase SQL Editor.
--
-- Scope: this table stores ONLY the watchlist — the stock symbol code plus
-- its Chinese and English names. Buy price, quantity and notes are personal
-- trading data and are intentionally NOT synced.
--
-- "device_key" is a client-generated UUID kept in the browser's localStorage;
-- it acts as a personal namespace. It is not cryptographically secure — for
-- real multi-user access control, integrate Supabase Auth instead.

CREATE TABLE IF NOT EXISTS public.stock_symbols (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_key  TEXT        NOT NULL,
  symbol      TEXT        NOT NULL,            -- 編號 / 代碼 (e.g. 2330, AAPL)
  name_zh     TEXT        NOT NULL DEFAULT '', -- 中文名稱
  name_en     TEXT        NOT NULL DEFAULT '', -- 英文名稱
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  stock_symbols_device_symbol UNIQUE (device_key, symbol)
);

-- Index for fast per-device lookups
CREATE INDEX IF NOT EXISTS idx_stock_symbols_device_key
  ON public.stock_symbols (device_key);

-- Enable Row Level Security
ALTER TABLE public.stock_symbols ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads and writes (anon key usage).
-- The device_key UUID is the only access-control mechanism.
-- DROP first so re-running this script stays idempotent across Postgres
-- versions that don't support CREATE POLICY IF NOT EXISTS.
DROP POLICY IF EXISTS "anon_all" ON public.stock_symbols;
CREATE POLICY "anon_all" ON public.stock_symbols
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
