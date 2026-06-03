# Luna Nihongo

Piattaforma web per imparare il giapponese: percorso guidato, flashcard SRS, tutor AI (Gemini), prenotazione lezioni e pannello admin.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Database / Auth:** Firebase (Firestore + Email/Password)
- **AI Chat:** Gemini 2.5 Flash via `api/tutor.php`
- **Voce naturale:** Gemini 2.5 Flash TTS via `api/tts.php`
- **Hosting:** Hostinger (statico + PHP)

## Setup locale

```bash
npm install
cp .env.example .env   # credenziali Firebase
npm run check:firebase
```

Due terminali per dev completo (app + API PHP):

```bash
npm run dev:api   # terminale 1 — PHP su :8080
npm run dev       # terminale 2 — Vite su :5173
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
│   └── tts.php
├── manifest.json
├── sw.js
└── favicon.svg
```

### 3. Gemini API key (automatica al build)

**Non serve creare file manuali nel File Manager.**

Aggiungi `GEMINI_API_KEY` nelle **Environment Variables** del deploy Git in hPanel (stessa schermata delle `VITE_FIREBASE_*`).  
A ogni build viene generato `public_html/api/gemini-secret.php` dentro `dist/` — resta in `public_html`, non fuori.

L'accesso HTTP diretto a quel file è bloccato da `api/.htaccess`.

### 4. Firebase — dominio autorizzato

Firebase Console → **Authentication** → **Settings** → **Authorized domains**  
Aggiungi il tuo dominio (es. `lunanihongo.it`).

### 5. Firestore rules

```bash
firebase deploy --only firestore:rules
```

### 6. Verifica

- Login / registrazione
- Lezione + audio TTS (pulsante 🔊)
- Tutor AI
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
| Build command | `npm ci && npm run build` |
| Output / Publish directory | `dist` |
| Node.js | 20 o superiore |

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
```

(Copia i valori dal tuo `.env` locale. `GEMINI_API_KEY` serve al tutor e al TTS PHP — non va nel frontend.)

### Dopo il primo deploy

1. **Firebase** → Authentication → Authorized domains → aggiungi il tuo dominio Hostinger.
2. Verifica che `GEMINI_API_KEY` sia tra le variabili d'ambiente del deploy e fai **Redeploy** se l'hai aggiunta dopo il primo build.
3. **Firestore rules** (da locale): `firebase deploy --only firestore:rules`

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
| `npm run dev` | Dev frontend |
| `npm run dev:api` | Dev API PHP locale |
| `npm run build` | Build Vite |
| `npm run build:hostinger` | Build + verifica deploy |
| `npm run check:firebase` | Valida `.env` |
