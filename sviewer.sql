-- sviewer.sql
-- Schema for SVG Viewer (sviewer) cloud backup feature.
-- Run in Supabase SQL Editor.

-- sviewer_svgs: stores up to 10 SVG records per device.
-- "device_key" is a client-generated UUID stored in localStorage;
-- it acts as a personal namespace. Not cryptographically secure —
-- for production use, integrate with Supabase Auth instead.

CREATE TABLE IF NOT EXISTS public.sviewer_svgs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_key  TEXT        NOT NULL,
  slot        SMALLINT    NOT NULL CHECK (slot BETWEEN 1 AND 10),
  name        TEXT        NOT NULL DEFAULT '',
  svg_content TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  sviewer_svgs_device_slot UNIQUE (device_key, slot)
);

-- Index for fast per-device lookups
CREATE INDEX IF NOT EXISTS idx_sviewer_svgs_device_key
  ON public.sviewer_svgs (device_key);

-- Enable Row Level Security
ALTER TABLE public.sviewer_svgs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads and writes (anon key usage).
-- The device_key UUID is the only access control mechanism.
CREATE POLICY IF NOT EXISTS "anon_all" ON public.sviewer_svgs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
