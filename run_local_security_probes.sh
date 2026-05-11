#!/usr/bin/env bash
# Kamali — Local security probes you must run yourself.
# These tests need the local repo, your network, or Supabase access — things the
# Cowork sandbox could not reach. Run from the repo root:
#   cd "/Users/papa/Documents/Business - EDS Solar/Claude Mali/assistai"
#   bash ./run_local_security_probes.sh
#
# Output is written to ./security_probe_output.txt for review.

set -u
OUT="security_probe_output.txt"
APP="https://assistai-six.vercel.app"

{
  echo "Kamali security probes — $(date)"
  echo "================================="
  echo

  # ── ST-006 HTTPS / HSTS / cert ──────────────────────────────────
  echo "## ST-006 HTTPS + HSTS + cert"
  echo "--- HSTS header ---"
  curl -sI "$APP/" | grep -i "strict-transport-security" || echo "(none)"
  echo "--- HTTP -> HTTPS redirect ---"
  curl -sI "http://assistai-six.vercel.app/" | head -3
  echo "--- TLS cert ---"
  echo | openssl s_client -servername assistai-six.vercel.app \
        -connect assistai-six.vercel.app:443 2>/dev/null \
        | openssl x509 -noout -subject -issuer -dates
  echo

  # ── ST-013 npm audit ───────────────────────────────────────────
  echo "## ST-013 npm audit (production deps)"
  npm audit --omit=dev 2>&1 | tail -40 || true
  echo "--- ALL deps ---"
  npm audit 2>&1 | tail -10 || true
  echo

  # ── ST-017 lockfile + provenance spot-check ─────────────────────
  echo "## ST-017 package-lock integrity"
  if [ -f package-lock.json ]; then
    echo "package-lock.json present ✅"
    grep -c '"integrity":' package-lock.json | xargs -I{} echo "{} integrity hashes recorded"
  else
    echo "package-lock.json MISSING ❌"
  fi
  echo

  # ── ST-024 CSP / security response headers ──────────────────────
  echo "## ST-024 Security response headers"
  curl -sI "$APP/" | grep -iE "content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|strict-transport-security" || echo "(no security headers beyond Vercel defaults)"
  echo

  # ── ST-023 CORS ────────────────────────────────────────────────
  echo "## ST-023 CORS check"
  curl -s -o /dev/null -w "Status: %{http_code}\n" -H "Origin: https://attacker.example" \
       -X OPTIONS "$APP/api/conversations"
  curl -sI -H "Origin: https://attacker.example" "$APP/api/conversations" \
       | grep -i "access-control" || echo "No Access-Control-* headers (default same-origin) ✅"
  echo

  # ── ST-016 brute force on auth ─────────────────────────────────
  echo "## ST-016 Brute force on /api/auth/callback/credentials (10 rapid bad logins)"
  echo "(target: bf-probe@test.invalid — does not exist, so no real account impact)"
  start=$(date +%s%3N)
  for i in $(seq 1 10); do
    curl -s -o /dev/null -w "%{http_code} " \
      -d "email=bf-probe-${i}@test.invalid&password=wrong-${i}&csrfToken=x&json=true" \
      "$APP/api/auth/callback/credentials"
  done
  end=$(date +%s%3N)
  echo
  echo "10 attempts in $((end-start)) ms"
  echo "If all returned 200/302 in <2s -> NO RATE LIMITING ❌"
  echo

} | tee "$OUT"

echo
echo "===== Supabase RLS check (run in Supabase SQL editor) ====="
cat <<'SQL'
-- ST-001: list every public table and its RLS state
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ST-001: list every policy
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ST-004: confirm bcrypt format on a few rows (do NOT export this elsewhere)
SELECT
  email,
  CASE
    WHEN "passwordHash" LIKE '$2a$%' OR "passwordHash" LIKE '$2b$%' OR "passwordHash" LIKE '$2y$%'
      THEN 'bcrypt OK ✅'
    ELSE 'NOT bcrypt ❌  (' || left("passwordHash",10) || '...)'
  END AS hash_check,
  length("passwordHash") AS hash_len
FROM "User"
LIMIT 5;

-- ST-018: any audit_logs table at all?
SELECT to_regclass('public.audit_logs') AS audit_logs_table;
SQL
echo "===== End ====="
