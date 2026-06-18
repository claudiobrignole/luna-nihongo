# Firebase Luna Nihongo

Conoscenza dominio per Cloud Functions, Firestore e IAM del progetto `luna-nihongo`.

## Quando usare

- Deploy o debug di callable HTTPS
- Errori 401/403/500 su prenotazioni, Stripe, newsletter
- Indici Firestore mancanti
- Permessi Cloud Run / service account

## Regione

Tutte le Functions v2: **`europe-west1`**.

Client: `getFunctions(app, 'europe-west1')`.

## Service account Cloud Run

Default Gen2: `617461430146-compute@developer.gserviceaccount.com`

Ruoli richiesti:
- `roles/datastore.user`
- `roles/secretmanager.secretAccessor`

Fix: `npm run fix:functions-iam` (propagazione 1–2 min).

## Callable principali

| Area | Nomi (camelCase URL) |
|------|----------------------|
| Booking | `bookAvailabilitySlot`, `startFreeTrial`, `cancelBooking`, `rescheduleBooking` |
| Teachers | `listPublicTeachers`, `listTeacherBookings`, `setBookingMeetLink` |
| Stripe | `createStripeCheckout`, `stripeWebhook`, `createStripePortal` |
| Email | `subscribeNewsletter`, `syncMarketingConsent` |
| Admin | `adminDeleteUser`, `setTeacherPayoutStatus` |

## IAM invoker pubblico

Dopo deploy:
```bash
npm run functions:allow-public:gcloud
# oppure
node scripts/allow-live-callables-public.mjs
```

Se org policy blocca `allUsers`: Console Cloud Run → Security → Allow unauthenticated per il servizio (nome lowercase, es. `bookavailabilityslot`).

## Firestore

- Rules: `firestore.rules` — client non scrive `bookings`
- Indici: `firestore.indexes.json` — deploy: `firebase deploy --only firestore:indexes`
- Collection group `bookings` con `teacherId` per dashboard maestro

## Health-check

```bash
npm run check:booking
npm run check:stripe
npm run check:email
```

## Init Admin SDK (Gen2)

Ogni file function isolato deve chiamare `ensureFirebaseAdmin()` da `functions/src/ensureAdmin.ts` se non passa da `index.ts`.

## Script utili

- `scripts/backfill-teacher-slots.mjs` — slot senza `teacherId`
- `scripts/migrate-admin-role.mjs` — migrazione ruoli legacy
