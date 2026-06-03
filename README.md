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

Configura la Gemini API key in `public/api/bootstrap.php` (sostituisci `YOUR_GEMINI_API_KEY_HERE`).

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

### 3. Configura Gemini API (server)

Su Hostinger, modifica `public_html/api/bootstrap.php`:

```php
$apiKey = 'YOUR_GEMINI_API_KEY_HERE';
```

Oppure imposta la variabile d'ambiente `GEMINI_API_KEY` nel pannello Hostinger se disponibile.

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
```

(Copia i valori dal tuo `.env` locale.)

### Dopo il primo deploy

1. **Firebase** → Authentication → Authorized domains → aggiungi il tuo dominio Hostinger.
2. **Gemini API key** — sul server crea `public_html/api/bootstrap.local.php` (non è nel repo):

```php
<?php
define('LUNA_GEMINI_API_KEY', 'la-tua-chiave-gemini');
```

Oppure imposta `GEMINI_API_KEY` nelle variabili d'ambiente PHP di Hostinger.

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
