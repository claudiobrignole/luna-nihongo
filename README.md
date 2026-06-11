# Luna Nihongo

Piattaforma web per imparare il giapponese: percorso guidato, flashcard SRS, tutor AI (Gemini), prenotazione lezioni e pannello admin.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Database / Auth:** Firebase (Firestore + Email/Password)
- **AI Chat:** Gemini 2.5 Flash via `api/tutor.php`
- **Voce naturale:** Gemini TTS via `api/tts.php`
- **Luna Live:** conversazione vocale via `api/live-session.php` + Firebase Functions
- **Premium:** Stripe Checkout + webhook (Firebase Functions)
- **Hosting:** Hostinger (statico + PHP)

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

### 1. Build

```bash
npm run build:hostinger
```

### 2. Upload FTP / File Manager

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

### 3. Gemini API key (automatica al build)

**Non serve creare file manuali nel File Manager.**

Aggiungi `GEMINI_API_KEY` nelle **Environment Variables** del deploy Git in hPanel (stessa schermata delle `VITE_FIREBASE_*`).  
Aggiungi anche `FIREBASE_WEB_API_KEY` (stesso valore di `VITE_FIREBASE_API_KEY`) per verificare i token su `live-session.php`.
A ogni build viene generato `public_html/api/gemini-secret.php` dentro `dist/` — resta in `public_html`, non fuori.

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
- `createLiveSession`, `endLiveSession`, `deleteLiveSession`
- `createStripeCheckout`, `createStripePortal`

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
| `npm run build` | Build Vite (include curriculum) |
| `npm run build:hostinger` | Build + verifica deploy |
| `npm run functions:deploy` | Build + deploy Cloud Functions |
| `npm run functions:allow-public` | IAM Cloud Run invoker per callable |
| `npm test` | Unit test leggeri |

## Curriculum didattico (N5)

Sorgente in `content/curriculum/`:

```
content/curriculum/
├── manifest.json       # unitOrder = sequenza canonica
├── levels.json         # 7 macro-livelli
├── repositories/       # kana, kanji, vocab, grammar (atomici)
├── units/*.json        # 60 unità (un file per id)
├── hydrate.mjs         # validatore + build bundle
└── build/              # generato — curriculum.json per React
```

**Aggiungere o modificare lezioni:** edita JSON in `repositories/` o `units/`, aggiorna `manifest.unitOrder` se aggiungi unità, poi `npm run curriculum:check`.

Il deploy Hostinger esegue la validazione automaticamente prima del build.

Guida operativa (IT): [`content/curriculum/GUIDA-CONTENUTI.md`](content/curriculum/GUIDA-CONTENUTI.md)
