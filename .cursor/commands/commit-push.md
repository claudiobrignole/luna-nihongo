# Commit e push su main

Crea un commit con tutte le modifiche correnti e pusha su `main` (trigger auto-deploy Hostinger).

1. Esegui in parallelo: `git status`, `git diff`, `git log -3 --oneline`
2. Verifica che lint e test passino: `npm run lint && npm test`
3. Scrivi un messaggio chiaro: `feat:`, `fix:`, `docs:`, `refactor:` + descrizione breve
4. **Non** committare `.env`, secret, `delta-stroke/`, `gemini-secret.php` con chiavi reali
5. `git add` solo file rilevanti → `git commit` → `git push origin main`
6. Riporta hash commit e conferma push

Non aprire PR a meno che l'utente lo chieda esplicitamente.
