-- Migration 010 defined shorter overloads; migration 013 added longer signatures.
-- CREATE OR REPLACE only replaces an exact signature, so both versions coexisted.
-- Supabase RPC calls that omit optional TEXT args then matched both →
-- "Could not choose the best candidate function".

DROP FUNCTION IF EXISTS public.decrease_stock(uuid, integer, uuid, uuid, uuid, text);

DROP FUNCTION IF EXISTS public.reserve_stock(uuid, integer, uuid, uuid, uuid, text);

DROP FUNCTION IF EXISTS public.unreserve_stock(uuid, integer, uuid, uuid, text);
