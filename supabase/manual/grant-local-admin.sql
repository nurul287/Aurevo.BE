-- Grant admin access to a LOCAL user (run in Studio SQL editor: http://127.0.0.1:54323).
-- 1. Create the user first: Authentication → Users → Add user (enable auto-confirm).
-- 2. Change the email below, then run this entire script.

DO $$
DECLARE
  v_email text := 'admin.aurevo@gmail.com';
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for %. Create the user in Authentication → Users first.', v_email;
  END IF;

  INSERT INTO public.profiles (id, preferences)
  VALUES (v_uid, jsonb_build_object('role', 'super_admin'))
  ON CONFLICT (id) DO UPDATE SET
    preferences = COALESCE(public.profiles.preferences, '{}'::jsonb)
      || jsonb_build_object('role', 'super_admin'),
    updated_at = NOW();

  RAISE NOTICE 'Granted super_admin to % (id: %)', v_email, v_uid;
END $$;
