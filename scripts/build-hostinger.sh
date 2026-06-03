#!/usr/bin/env bash
# Build Luna Nihongo for Hostinger upload.
# Output: dist/ (upload entire folder contents to public_html)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Checking Firebase env..."
npm run check:firebase

echo "→ Building production bundle..."
npm run build

echo "→ Verifying deploy artifacts..."
test -f dist/index.html
test -f dist/.htaccess
test -f dist/api/tts.php
test -f dist/api/tutor.php
test -f dist/api/bootstrap.php

echo ""
echo "✅ Build ready in dist/"
echo ""
echo "Upload to Hostinger public_html/:"
echo "  • All files inside dist/  (index.html, assets/, api/, .htaccess, ...)"
echo "  • Then edit public_html/api/bootstrap.php and set your Gemini API key"
echo "  • Add your domain in Firebase Console → Authentication → Authorized domains"
