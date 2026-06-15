#!/usr/bin/env bash
# Grant Firestore + Secret Manager access to the default Cloud Run service account
# used by Firebase Functions v2 (Gen2). Without this, callables return HTTP 500
# with "PERMISSION_DENIED: Missing or insufficient permissions" on Firestore.
#
# Run from repo root: npm run fix:functions-iam

set -euo pipefail

PROJECT="${GCLOUD_PROJECT:-luna-nihongo}"
PROJECT_NUMBER="${GCLOUD_PROJECT_NUMBER:-617461430146}"
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "→ Project: ${PROJECT}"
echo "→ Service account: ${SA}"
echo ""

bind_role() {
  local role="$1"
  echo "→ Granting ${role}…"
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA}" \
    --role="${role}" \
    --condition=None \
    --quiet
}

bind_role "roles/datastore.user"
bind_role "roles/secretmanager.secretAccessor"

echo ""
echo "✅ IAM updated. IAM can take 1–2 minutes to propagate."
echo "   npm run check:booking"
echo "   npm run check:email"
