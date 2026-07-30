-- guest_sessions was created in migration 033 without RLS ever being enabled
-- — an oversight next to every other table in this project, all of which
-- either have RLS + policies or (like meta_capi_sent, kb_chunks,
-- conversations, messages) RLS enabled with no policies, backend-only access.
-- guest_sessions is only ever read/written through the backend's own service
-- connection (createGuestSession() in cart.service.ts) — no Supabase SDK on
-- the frontend, same convention as those tables — so enabling RLS with no
-- policies matches existing access patterns exactly and changes nothing for
-- the backend, while closing off direct anon/authenticated access via the
-- Supabase client.

ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
