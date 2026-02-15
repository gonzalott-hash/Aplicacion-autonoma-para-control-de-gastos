CREATE OR REPLACE FUNCTION create_limited_user(
  email TEXT, 
  password TEXT, 
  full_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Create User in Auth
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
    email, crypt(password, gen_salt('bf')), NOW(), 
    '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()
  ) RETURNING id INTO v_user_id;

  -- 2. Create Identity
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id, email)::jsonb, 
    'email', v_user_id, NOW(), NOW(), NOW()
  );

  -- 3. Create Profile
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (v_user_id, email, 'user', full_name);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
