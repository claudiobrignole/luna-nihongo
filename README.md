# Luna Nihongo

Piattaforma web bilingue **IT/EN** per imparare il giapponese: percorso guidato da zero fino al **JLPT N4** (142 unità), flashcard SRS, tutor AI (Gemini), prenotazione lezioni con Luna e pannello admin.

**Produzione:** [lunanihongo.com](https://lunanihongo.com) · **Repo:** [github.com/claudiobrignole/luna-nihongo](https://github.com/claudiobrignole/luna-nihongo)

Documentazione prodotto: [PRD.md](PRD.md) · Contesto agenti Cursor: [`.cursor/`](.cursor/) e [`.cursor/PROJECT_MEMORY.md`](.cursor/PROJECT_MEMORY.md)

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Database / Auth:** Firebase (Firestore + Email/Password)
- **AI Chat:** Gemini 2.5 Flash via `api/tutor.php`
- **Voce naturale:** audio precalcolati del curriculum in `public/audio/curriculum/` (Studio, dialoghi, flashcard); Gemini TTS via `api/tts.php` solo per il tutor chat
- **Luna Live:** conversazione vocale via `api/live-session.php` + Firebase Functions
- **Premium:** Stripe Checkout + webhook (Firebase Functions)
- **Email:** Resend (transazionali) + SendFox (newsletter) via Cloud Functions
- **Hosting:** Hostinger (statico + PHP)

Panoramica architettura e convenzioni per agenti AI: [`.cursor/PROJECT_MEMORY.md`](.cursor/PROJECT_MEMORY.md)

## Setup locale

```bash
npm install
cp .env.example .env   # credenziali Firebase
npm run check:firebase
```

Due terminali per dev completo (app + API PHP):

```bash
npm run dev       # API (:8080) + Vite (:5173) insieme
npm run dev:vite  # solo frontend (Luna Live richiede anche l'API)
npm run dev:api   # solo API Node su :8080
```

In locale, copia `public/api/bootstrap.local.php.example` → `bootstrap.local.php` e incolla la chiave Gemini.  
Oppure: `export GEMINI_API_KEY=...` prima di `npm run build`.

## Build per produzione

```bash
npm run build:hostinger
```

Genera la cartella `dist/` pronta per l'upload.

## Deploy su Hostinger

> **Flusso attuale:** push su `main` → GitHub → Hostinger auto-deploy.  
> Non serve upload FTP manuale salvo emergenza.

### 1. Push

```bash
git push origin main
```

Hostinger esegue `npm ci && npm run build:hostinger` e pubblica `dist/`.

### 2. Variabili ambiente (hPanel, una tantum)

Aggiungi nelle Environment Variables del deploy Git:

- Tutte le `VITE_FIREBASE_*`
- `GEMINI_API_KEY`
- `FIREBASE_WEB_API_KEY` (stesso valore di `VITE_FIREBASE_API_KEY`, per `live-session.php`)

### 3. Deploy manuale (solo emergenza)

<details>
<summary>Upload FTP / File Manager (deprecato)</summary>

```bash
npm run build:hostinger
```

Carica **tutto il contenuto** di `dist/` in `public_html/`:

```
public_html/
├── index.html
├── .htaccess
├── assets/
├── api/
│   ├── bootstrap.php
│   ├── tutor.php
│   ├── tts.php
│   └── live-session.php
├── manifest.json
├── sw.js
└── favicon.svg
```

</details>

### 4. Gemini API key (automatica al build)

**Non serve creare file manuali nel File Manager.**

Aggiungi `GEMINI_API_KEY` nelle **Environment Variables** del deploy Git in hPanel (stessa schermata delle `VITE_FIREBASE_*`).  
Aggiungi anche `FIREBASE_WEB_API_KEY` (stesso valore di `VITE_FIREBASE_API_KEY`) per verificare i token su `live-session.php`.
A ogni build viene generato `public_html/api/gemini-secret.php` dentro `dist/` — resta in `public_html`, non fuori.

## Cursor (rules, comandi, agenti)

Struttura in [`.cursor/`](.cursor/):

| Cartella | Contenuto |
|----------|-----------|
| `rules/` | `00-foundation` … `03-security`, design-colors, curriculum |
| `commands/` | `/commit-push`, `/verify-deploy`, `/review-code`, … |
| `agents/` | code-simplifier, security-reviewer, verify-app |
| `plans/` | Piani salvati da Plan mode |
| `skills/firebase-luna/` | Firebase, IAM, callable |


L'accesso HTTP diretto a quel file è bloccato da `api/.htaccess`.

### 4. Firebase — dominio autorizzato

Firebase Console → **Authentication** → **Settings** → **Authorized domains**  
Aggiungi il tuo dominio (es. `lunanihongo.com`).

### 5. Firestore rules e indici

```bash
firebase deploy --only firestore
```

### 6. Firebase Cloud Functions (Luna Live, storico Premium, Stripe)

Richiede piano **Blaze** e Node **22** in `functions/`. Esegui i comandi **dalla root del repo** (`luna-nihongo/`).

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:config:set stripe.price_id="price_..."   # oppure param STRIPE_PRICE_ID in console
npm run functions:deploy
npm run functions:allow-public
```

Alternativa dalla cartella `functions/`: `npm run deploy` e `npm run allow-public`.

**STRIPE_PRICE_ID** deve essere un ID **price** (`price_...`), non un product (`prod_...`).  
In Stripe Dashboard → Product → Pricing → copia il Price ID del piano mensile.

**IAM Cloud Run (obbligatorio dopo il primo deploy):** Firebase crea le function ma spesso non riesce a impostare `allUsers` come invoker. Dopo il deploy:

```bash
gcloud auth application-default login   # una tantum
npm run functions:allow-public:gcloud
```

Se fallisce, apri Cloud Run → Security → **Allow public access** per ciascun servizio:
`createlivesession`, `endlivesession`, `deletelivesession`, `createstripecheckout`, `createstripeportal`, `stripewebhook`.

Serve un ruolo con permesso IAM su Cloud Run (es. **Owner** o **Cloud Run Admin** sul progetto).

**Callable (Cloud Run invoker pubblico + auth Firebase nel body):**
- Live: `createLiveSession`, `endLiveSession`, `deleteLiveSession`
- Stripe: `createStripeCheckout`, `createExtraLessonCheckout`, `createStripePortal`
- Booking: `bookAvailabilitySlot`, `cancelBooking`, `rescheduleBooking`, `redeemCoupon`, `checkGraceNoSlotsCoupon`, `adminCancelBooking`, `adminDeactivateSlot`, `startFreeTrial`
- Email: `subscribeNewsletter`, `syncMarketingConsent`
- Admin: `adminDeleteUser`

**Webhook Stripe:** configura in Stripe Dashboard l'URL  
`https://europe-west1-luna-nihongo.cloudfunctions.net/stripeWebhook`

**Scheduled:** `purgeExpiredLiveHistory` (03:00 Europe/Zurich) — elimina storico live 90 giorni dopo fine Premium.

### 7. Verifica

- Login / registrazione
- Lezione + audio TTS (pulsante 🔊)
- Tutor AI (chat testuale)
- **Luna Live** (Voce live → avvia conversazione → storico Premium in sidebar)
- Upgrade Premium (Stripe Checkout)
- Pannello Admin (super admin)

## GitHub

Repository: **https://github.com/claudiobrignole/luna-nihongo**

```bash
git remote add origin https://github.com/claudiobrignole/luna-nihongo.git
git push -u origin main
```

> Non committare mai `.env` né API key in chiaro.

## Hostinger — collegamento GitHub (auto-deploy)

In **hPanel → Website → Git** collega il repo `claudiobrignole/luna-nihongo` e imposta:

| Impostazione | Valore |
|--------------|--------|
| Branch | `main` |
| Build command | `npm ci && npm run build:hostinger` |
| Output / Publish directory | `dist` |
| Node.js | 22 o superiore |

### Variabili d'ambiente (build — obbligatorie)

Aggiungi in hPanel **prima** del deploy (Vite le incorpora al build):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
GEMINI_API_KEY=
FIREBASE_WEB_API_KEY=
```

(Copia i valori dal tuo `.env` locale. `GEMINI_API_KEY` serve al tutor, TTS e Live PHP. `FIREBASE_WEB_API_KEY` = `VITE_FIREBASE_API_KEY` per auth su `live-session.php`.)

### Dopo il primo deploy

1. **Firebase** → Authentication → Authorized domains → aggiungi il tuo dominio Hostinger.
2. Verifica che `GEMINI_API_KEY` sia tra le variabili d'ambiente del deploy e fai **Redeploy** se l'hai aggiunta dopo il primo build.
3. **Firestore** (da locale): `firebase deploy --only firestore`
4. **Functions** (vedi sezione 6) + `npm run functions:allow-public`

### Deploy manuale (alternativa)

```bash
npm run build:hostinger
# upload contenuto di dist/ in public_html/
```

## Ruoli

| Ruolo | Permessi |
|-------|----------|
| `user` | Studente standard |
| `admin` | Vede utenti, gestisce tier studenti |
| `super_admin` | Tutto + promuove admin (`claudio@brignole.ch`) |

## Script utili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev frontend (+ rigenera curriculum) |
| `npm run dev:api` | Dev API PHP locale |
| `npm run curriculum:check` | Valida JSON curriculum (CI) |
| `npm run curriculum:build` | Valida + genera `build/curriculum.json` |
| `npm run audio:sync` | Rigenera solo gli audio curriculum cambiati (delta); usa Batch API se ≥10 file mancanti |
| `npm run audio:batch` | Forza Batch API per tutti i file mancanti (~50% costo, quote separate) |
| `npm run audio:batch:resume` | Scarica risultati di un batch job in corso |
| `npm run audio:sync -- --sync` | Forza generazione sincrona live (max ~100/giorno per modello TTS) |
| `npm run audio:sync -- --all` | Rigenera tutti gli audio (~620 file, richiede `GEMINI_API_KEY`) |
| `npm run audio:sync -- --id hira-a,dlg-self-intro-L0` | Rigenera singole entry |
| `npm run audio:sync -- --id dlg-self-intro-L0 --force` | Sovrascrive audio con stesso testo |
| `npm run audio:verify` | Verifica manifest + file WAV vs curriculum (CI/prebuild) |
| `npm run build` | Build Vite (include curriculum) |
| `npm run build:hostinger` | Build + verifica deploy |
| `npm run functions:deploy` | Build + deploy Cloud Functions |
| `npm run functions:allow-public` | IAM Cloud Run invoker per callable |
| `npm test` | Unit test leggeri |

## Curriculum didattico (N5 + N4)

Sorgente in `content/curriculum/` (schema **1.1.0**, target **N4**):

| Traccia | Livelli | Unità |
|---------|---------|-------|
| JLPT N5 | L0–L6 | 85 |
| JLPT N4 | L7–L12 | 57 |
| **Totale** | **13 livelli (0–12)** | **142 unità** |

Repository atomici (dopo `hydrate.mjs --check`): 211 kana · 116 kanji · 137 vocab · 47 grammatica · 20 dialoghi.

```
content/curriculum/
├── manifest.json       # unitOrder = sequenza canonica (fonte di verità)
├── levels.json         # macro-livelli 0–12
├── repositories/       # kana, kanji, vocab, grammar, dialogues (atomici)
├── units/*.json        # 142 unità (un file per id)
├── hydrate.mjs         # validatore + build bundle
├── insert-units.mjs    # inserisce nuove unità in unitOrder
└── build/              # generato — curriculum.json per React
```

**Aggiungere o modificare lezioni:** edita JSON in `repositories/` o `units/`. Per nuove unità usa `insert-units.mjs` (non modificare `unitOrder` a mano), poi `npm run curriculum:check` e `npm run audio:sync`.

## Audio curriculum (precalcolato)

Studio, dialoghi e flashcard usano file WAV statici in `public/audio/curriculum/` (manifest + dedup per testo). Il tutor chat e Luna Live restano su Gemini.

Dopo ogni modifica al testo giapponese nel curriculum:

```bash
npm run curriculum:build
npm run audio:sync          # solo delta
npm run audio:verify
```

Prima generazione o cambio voce/modello TTS: `npm run audio:sync -- --all` (richiede `GEMINI_API_KEY` in `.env`).

**Nota quota Gemini TTS live:** i modelli `*-tts-preview` hanno cap bassi (~100 req/giorno) anche con billing. Per generare tutti i ~642 file usa la **Batch API** (automatica con `npm run audio:sync` se mancano ≥10 file, oppure `npm run audio:batch`). Completamento tipico: minuti–ore, max 24h.

Solo manifest (senza chiamate API): `npm run audio:sync -- --manifest-only`

Il deploy Hostinger esegue la validazione automaticamente prima del build (`prebuild`).

Guide:
- [`content/curriculum/README.md`](content/curriculum/README.md) — struttura, convenzioni id, schema
- [`content/curriculum/GUIDA-CONTENUTI.md`](content/curriculum/GUIDA-CONTENUTI.md) — guida operativa (IT)
