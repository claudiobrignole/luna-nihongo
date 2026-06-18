# Aggiorna dipendenze

Aggiorna le dipendenze del progetto in modo sicuro.

1. Elenca outdated:
   ```bash
   npm outdated
   npm outdated --prefix functions
   ```
2. Aggiorna **una dipendenza alla volta**, partendo da patch/minor
3. Dopo ogni aggiornamento:
   ```bash
   npm run lint && npm test && npm run build
   npm run functions:build   # se tocca functions/
   ```
4. Se i test falliscono, ripristina quella dipendenza (`npm install <pkg>@<versione>`) e segnala
5. Non aggiornare major breaking (React, Firebase, Vite) senza piano e conferma utente
6. Commit finale (se richiesto) con elenco pacchetti aggiornati
