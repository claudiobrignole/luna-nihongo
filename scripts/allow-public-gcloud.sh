#!/usr/bin/env bash
# Grant public Cloud Run invoker on Luna callable + Stripe webhook services.
# Requires: gcloud auth login (or application-default login) + Cloud Run Admin / Owner role.
set -euo pipefail

PROJECT="${GCLOUD_PROJECT:-luna-nihongo}"
REGION="${GCLOUD_REGION:-europe-west1}"

SERVICES=(
  createlivesession
  endlivesession
  deletelivesession
  createstripecheckout
  createextralessoncheckout
  creategiftlessoncheckout
  createstripeportal
  stripewebhook
  startfreetrial
  bookavailabilityslot
  cancelbooking
  reschedulebooking
  redeemcoupon
  checkgracenoslotscoupon
  admincancelbooking
  admindeactivateslot
  subscribenewsletter
  syncmarketingconsent
)

echo "Project: $PROJECT  Region: $REGION"
echo ""

for service in "${SERVICES[@]}"; do
  echo "→ $service"
  gcloud run services add-iam-policy-binding "$service" \
    --project="$PROJECT" \
    --region="$REGION" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet
  echo "✓ $service"
  echo ""
done

echo "Done. Callable functions and stripeWebhook are publicly invokable."
echo "Auth is still enforced in app code (Firebase ID token / Stripe signature)."
