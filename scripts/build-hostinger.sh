#!/usr/bin/env bash
# Build Luna Nihongo for Hostinger upload.
# Output: dist/ (upload entire folder contents to public_html)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Checking Firebase env..."
npm run check:firebase

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "⚠️  GEMINI_API_KEY non impostata — il tutor userà fallback finché non la aggiungi in hPanel."
else
  echo "→ GEMINI_API_KEY trovata — verrà inclusa nel build."
fi

echo "→ Validating curriculum..."
npm run curriculum:check

echo "→ Generating Gemini secret file..."
node scripts/generate-gemini-secret.mjs

echo "→ Building production bundle..."
npm run build

echo "→ Verifying deploy artifacts..."
test -f dist/index.html
test -f dist/.htaccess
test -f dist/api/tts.php
test -f dist/api/tutor.php
test -f dist/api/live-session.php
test -f dist/api/writing-grade.php
test -f dist/api/bootstrap.php
if [ -f dist/api/gemini-secret.php ]; then
  echo "→ gemini-secret.php incluso nel build ✓"
else
  echo "⚠️  gemini-secret.php assente — aggiungi GEMINI_API_KEY in hPanel e redeploy."
fi

echo ""
echo "✅ Build ready in dist/"
echo ""
echo "Su Hostinger non serve creare file manuali in File Manager."
echo "Aggiungi GEMINI_API_KEY nelle Environment Variables del deploy Git."
