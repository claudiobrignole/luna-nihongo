# Luna Nihongo — memoria di progetto

Guida riassuntiva per agenti AI e sviluppatori. Aggiornare quando cambiano architettura, curriculum o deploy.

**Repo:** https://github.com/claudiobrignole/luna-nihongo  
**Produzione:** https://lunanihongo.com (Hostinger + Firebase)

---

## Cos’è

Piattaforma web bilingue **IT/EN** per imparare il giapponese:

- **Studio** — percorso guidato (hiragana → JLPT N5 → JLPT N4), quiz, scrittura, ordine tratti
- **Deck** — flashcard con ripetizione spaziata (SRS)
- **Tutor AI** — chat testuale (Gemini) + **Luna Live** (conversazione vocale)
- **Lezioni** — prenotazione con Luna (trial, abbonamento Premium, lezioni extra)
- **Admin** — gestione utenti e tier

---

## Stack tecnico

| Layer | Tecnologia |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Stile | CSS custom (`src/index.css`), glassmorphism, dark mode `prefers-color-scheme` |
| Auth / DB | Firebase Auth (email/password), Firestore |
| AI chat | Gemini 2.5 Flash → `public/api/tutor.php` |
| TTS curriculum | File statici WAV → `public/audio/curriculum/` (Studio, dialoghi, flashcard) |
| TTS tutor chat | Gemini TTS → `public/api/tts.php` (solo risposte personalizzate AITutor) |
| Luna Live | WebSocket Gemini Live + token da Firebase Callable `createLiveSession` |
| Pagamenti | Stripe Checkout + webhook (`functions/src/stripe.ts`) |
| Email | Resend (transazionali) + SendFox (newsletter) via Cloud Functions |
| Hosting statico | Hostinger (`dist/` da `npm run build:hostinger`) |
| Backend serverless | Firebase Cloud Functions (`functions/`, region `europe-west1`) |

**Dev locale:** `npm run dev` avvia Vite (:5173) + API Node (:8080). Per TTS/tutor in locale serve `GEMINI_API_KEY` (`.env` o `public/api/bootstrap.local.php`).

---

## Struttura repository

```
luna-nihongo/
├── src/                    # App React
│   ├── App.tsx             # Shell: tab, auth, footer, routing implicito
│   ├── components/         # UI (LearningPath, AITutor, Flashcards, booking…)
│   ├── contexts/           # AuthContext
│   ├── data/curriculum.ts # Import da build/curriculum.json
│   ├── services/           # Firebase, TTS, tutor, Stripe, booking…
│   ├── hooks/              # useJapaneseSpeech, useGeminiLive…
│   └── types/
├── content/curriculum/     # Sorgente didattica (JSON + hydrate)
├── public/
│   ├── api/                # PHP: tutor, tts, live-session, bootstrap
│   ├── audio/curriculum/   # WAV precalcolati + manifest.json
│   └── kanjivg/            # SVG ordine tratti (CC-BY-SA, asset esterno)
├── functions/              # Firebase Cloud Functions
├── scripts/                # build, dev-api, deploy helper
├── tests/                  # Node test runner (`npm test`)
├── delta-n4-l7/ … l12/     # Pacchetti integrazione curriculum N4 (storico)
└── delta-stroke/           # NON committare (work in progress stroke)
```

---

## Curriculum didattico

### Numeri attuali (schema 1.1.0, target N4)

| Traccia | Livelli | Unità |
|---------|---------|-------|
| JLPT N5 | L0–L6 | 85 |
| JLPT N4 | L7–L12 | 57 |
| **Totale** | **13 livelli (0–12)** | **142 unità** |

Conteggio per livello: L0=21, L1=12, L2=12, L3=14, L4=11, L5=11, L6=4, L7=10, L8=10, L9=10, L10=11, L11=12, L12=4.

### Sorgente e build

```
content/curriculum/
├── manifest.json       # unitOrder = sequenza canonica (fonte di verità)
├── levels.json         # macro-livelli 0–12
├── repositories/       # atomici: kana, kanji, vocab, grammar, dialogues
├── units/*.json        # un file per unità
├── hydrate.mjs         # valida + genera build/curriculum.json
├── insert-units.mjs    # inserisce nuove unità in unitOrder
└── build/curriculum.json  # bundle per React (gitignored, rigenerato al build)
```

**Principio:** le unità referenziano contenuto per id (`kanaRefs`, `vocabRefs`, …), non lo duplicano. `hydrate.mjs` risolve i ref in oggetti inline.

**Regole critiche:**

- Non rinominare id pubblicati (`completedUnits` in Firestore dipende dagli id unità).
- Non modificare `unitOrder` a mano per nuove unità → usare `insert-units.mjs`.
- Ordine UI: `getUnitsForLevel()` ordina per `manifest.unitOrder`, non per campo `order` dell’unità.
- `npm run curriculum:check` gira in prebuild e CI.

**Tipi unità:** `hiragana`, `katakana`, `kanji`, `vocab`, `grammar`, `situation`, `review`, `mastery`, `mock-exam`, unità `writing-*` (quiz scrittura / stroke-order).

**Dialoghi:** 20 scene in `repositories/dialogues.json`, 20 unità `situation` (~62 battute). UI in `DialogueStudyPanel` + `CanDoPanel` dentro `LearningPath`; audio precalcolato per battuta e “Ascolta tutto” (`speakCurriculumJapanese`).

**Audio curriculum:** `npm run audio:sync` (delta; usa Batch API se ≥10 file mancanti). Bulk: `npm run audio:batch` → modello `gemini-3.1-flash-tts-preview` via Batch API (~50% costo, quote separate dal TTS live). Live TTS resta su `/api/tts.php` solo per tutor.

**KanjiVG:** solo `strokeData.kanjiVgId` nei JSON curriculum; SVG in `public/kanjivg/`. Attribuzione in-app nel pannello stroke-order (non nel footer).

Guida operativa contenuti: `content/curriculum/GUIDA-CONTENUTI.md` e `content/curriculum/README.md`.

### Integrazione delta N4

Cartelle `delta-n4-l7/` … `delta-n4-l12/` contengono patch atomiche + script `apply-atomic.mjs`. Flusso tipico: applicare delta → `insert-units.mjs` → `curriculum:check` → commit. Livelli opzionali in `delta.levels.json` per alcuni pacchetti.

---

## Frontend — componenti chiave

| Componente | Ruolo |
|------------|--------|
| `LearningPath.tsx` | Studio: griglia unità, drawer lezione, quiz, scrittura, stroke-order |
| `Flashcards.tsx` | Deck SRS |
| `AITutor.tsx` | Chat + Luna Live + sidebar storico Premium |
| `BookingCalendar.tsx` | Prenotazioni (trial / included / extra) |
| `StudentDashboard.tsx` | Progressi, booking, impostazioni |
| `AdminPanel.tsx` | Admin / super_admin |
| `PublicLanding.tsx` / `HomeLanding.tsx` | Marketing / home autenticata |
| `Onboarding.tsx` | Livello iniziale + marketing opt-in |

**Layout:** `.app-container` flex column, `min-height: 100dvh`, footer con `margin-top: auto`. Su mobile (`≤768px`) padding-bottom per bottom nav fissa.

**Audio Studio:** `useJapaneseSpeech` → `ttsService.speakCurriculumJapanese` → file statici `/audio/curriculum/`. Tutor: `speakJapaneseText` → POST `/api/tts.php`.

**Lingue UI:** `LanguageType = 'it' | 'en'`; contenuto curriculum bilingue ovunque.

---

## Firebase & dati utente

**Collezione `users/{uid}`** (campi principali): `username`, `role`, `xp`, `completedUnits[]`, `preferredStartLevel`, `tier`, `subscriptionStatus`, `trialEndsAt`, `chatHistory`, `liveMinutesUsed`, `marketingConsent`, `showRomaji`, …

**Ruoli:** `user` | `admin` | `super_admin` (email protetta `claudio@brignole.ch`).

**Firestore rules:** client non può scrivere su `bookings` (solo Functions). Quote live minutes con limiti lato rules.

### Cloud Functions (callable / HTTP / scheduled)

- **Live:** `createLiveSession`, `endLiveSession`, `deleteLiveSession`, `purgeExpiredLiveHistory`
- **Stripe:** `createStripeCheckout`, `createExtraLessonCheckout`, `createStripePortal`, `stripeWebhook`
- **Booking:** `bookAvailabilitySlot`, `cancelBooking`, `rescheduleBooking`, `startFreeTrial`
- **Email:** `subscribeNewsletter`, `syncMarketingConsent` (+ Resend interno per mail transazionali)
- **Admin:** `adminDeleteUser`

Dopo deploy: `npm run functions:allow-public` (IAM Cloud Run invoker).

---

## Deploy

### Hostinger (frontend + PHP)

Git auto-deploy: branch `main`, build `npm ci && npm run build:hostinger`, output `dist`.

**Workflow operativo (Claudio):** push su GitHub → Hostinger deploy automatico. **Nessuna configurazione manuale su hPanel** per i deploy ordinari.

### Firebase (backend — solo da locale, non Hostinger)

```bash
npm run build:hostinger   # → dist/
```

Git auto-deploy: branch `main`, build `npm ci && npm run build:hostinger`, output `dist`.  
Env build: tutte le `VITE_FIREBASE_*`, `GEMINI_API_KEY`, `FIREBASE_WEB_API_KEY`.

### Firebase

```bash
firebase deploy --only firestore
npm run functions:deploy
```

---

## Script npm utili

| Comando | Uso |
|---------|-----|
| `npm run dev` | Dev completo (curriculum build + Vite + API) |
| `npm run curriculum:check` | Valida JSON senza scrivere build |
| `npm run curriculum:build` | Genera `build/curriculum.json` |
| `npm run build:hostinger` | Build produzione Hostinger |
| `npm test` | Test in `tests/` |
| `npm run kanjivg:bundle` | Rigenera bundle SVG KanjiVG |

---

## Convenzioni di sviluppo

- **Scope minimo:** diff focalizzati; non refactor non richiesti.
- **Commit:** solo su richiesta esplicita; non committare `.env`, secret, `delta-stroke/`.
- **Copy/UI:** usare `CURRICULUM_META.unitCount` (142), non “60 unità”.
- **Prebuild:** `curriculum:check` deve passare prima di ogni build.
- **Test:** `npm test` compila functions prima (`pretest`).

---

## Lacune note / prossimi passi

1. **Copy tutor** — alcuni prompt ancora riferiti a “60 unità / 7 livelli”; allineare a 142 / 13 livelli.
2. **Redeploy produzione** necessario dopo cambi curriculum/copy nel bundle.
3. Opzionale: cache audio pre-generato per dialoghi (due voci) se si vuole qualità superiore al TTS live.

---

## Contatti e brand

- **Prodotto:** Luna Nihongo
- **Lezioni private:** Luna (insegnante reale, integrata nel flusso booking)
- **Super admin:** `claudio@brignole.ch`
