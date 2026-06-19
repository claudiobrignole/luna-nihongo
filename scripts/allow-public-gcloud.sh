#!/usr/bin/env bash
# Grant public Cloud Run invoker on Luna callable + Stripe webhook services.
# Requires: gcloud auth login (interactive) + Cloud Run Admin / Owner role.
set -euo pipefail

if ! gcloud auth print-access-token >/dev/null 2>&1; then
  echo "gcloud credentials expired or missing."
  echo "Run in your terminal (opens browser):"
  echo "  gcloud auth login"
  echo ""
  echo "Or use ADC + Node (often easier for blog feeds only):"
  echo "  gcloud auth application-default login"
  echo "  npm run allow:blog-feeds"
  exit 1
fi

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
  admindeleteuser
  setbookingmeetlink
  setteacherpayoutstatus
  listpublicteachers
  listteacherbookings
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

BLOG_FUNCTIONS=(blogRss blogSitemap)
for fn in "${BLOG_FUNCTIONS[@]}"; do
  service_id=$(gcloud functions describe "$fn" \
    --project="$PROJECT" \
    --region="$REGION" \
    --gen2 \
    --format='value(serviceConfig.service)' \
    | awk -F/ '{print $NF}')
  echo "→ $fn → Cloud Run service $service_id"
  gcloud run services update "$service_id" \
    --project="$PROJECT" \
    --region="$REGION" \
    --no-invoker-iam-check \
    --quiet
  echo "✓ $service_id (public, no allUsers IAM)"
  echo ""
done

echo "Done. Callable functions, stripeWebhook, and blog feeds are publicly invokable."
echo "Auth is still enforced in app code (Firebase ID token / Stripe signature)."
