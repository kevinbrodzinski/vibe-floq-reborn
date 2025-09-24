/* -----------------  AUTH-CONFIG HARDENING (current API) ---------------- */
BEGIN;

/* upsert (helper) */
CREATE OR REPLACE FUNCTION public._upsert_auth_cfg(k text, v text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auth.config (key, value)
  VALUES (k, v)
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;
END
$$;

/* 1️⃣  Production site URL */
SELECT public._upsert_auth_cfg('SITE_URL', 'https://app.yourdomain.com');

/* 2️⃣  JWT expiry → 3600 s (1 h) */
SELECT public._upsert_auth_cfg('JWT_EXP', '3600');

/* 3️⃣  Minimum password length → 12  */
SELECT public._upsert_auth_cfg('PASSWORD_MIN_LENGTH', '12');

/* 4️⃣  Enforce complexity rules */
SELECT public._upsert_auth_cfg('PASSWORD_COMPLEXITY', 'true');

/* 5️⃣  SMS / Email OTP length → 6  */
SELECT public._upsert_auth_cfg('SMS_OTP_LENGTH', '6');

COMMIT;