# PRD — Luna Nihongo

## Cos'è

Piattaforma web bilingue **italiano / inglese** per imparare il giapponese da zero fino al **JLPT N4**, con percorso guidato, ripetizione spaziata, tutor AI e lezioni live con insegnanti umani.

**Produzione:** https://lunanihongo.com

## Utenti

| Ruolo | Chi | Cosa fa |
|-------|-----|---------|
| **Studente** (`user`) | Iscritto standard | Studio, deck, tutor, prenota lezioni, Premium |
| **Maestro** (`teacher`) | Insegnante Luna | Dashboard lezioni, slot disponibilità, link Meet, compensi |
| **Super admin** (`super_admin`) | Operatore piattaforma | Admin utenti, pagamenti maestri, tutte le funzioni maestro |

Account protetto: `claudio@brignole.ch` (non eliminabile).

## Funzionalità core

1. **Studio** — 142 unità (hiragana → N5 → N4), quiz, scrittura, ordine tratti kanji
2. **Deck** — flashcard con SRS
3. **Tutor AI** — chat Gemini + Luna Live (voce)
4. **Lezioni** — prenotazione trial intro, lezioni incluse Premium, extra a pagamento
5. **Premium** — abbonamento Stripe mensile
6. **Admin** — gestione tier, utenti, disponibilità, payout maestri

## Fuori scope (per ora)

- App mobile nativa
- Marketplace di corsi di terze parti
- Certificazione JLPT ufficiale
- Social network / community forum

## Criteri di successo (qualitativi)

- Studente completa onboarding e almeno un'unità senza errori bloccanti
- Flusso prenotazione end-to-end funzionante (maestro → slot → conferma)
- Checkout Premium attiva tier su Firestore dopo pagamento
- Maestro vede prenotazioni e può impostare link Meet
- CI verde: lint, build, 36+ test

## Riferimenti tecnici

- Architettura e deploy: [`.cursor/PROJECT_MEMORY.md`](.cursor/PROJECT_MEMORY.md)
- Setup Cursor (rules, commands, agenti): [`.cursor/`](.cursor/)
- README sviluppatore: [`README.md`](README.md)
