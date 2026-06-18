# Verifica pre-deploy

Esegui i controlli di salute prima di un deploy in produzione.

1. **Build e test locali**
   ```bash
   npm run curriculum:check
   npm run lint
   npm test
   npm run build
   npm run functions:build
   ```

2. **Health-check infrastruttura** (richiede rete + gcloud opzionale)
   ```bash
   npm run check:booking
   npm run check:stripe
   npm run check:email
   ```

3. Se `subscribeNewsletter` o `bookAvailabilitySlot` restituiscono 500:
   ```bash
   npm run fix:functions-iam
   ```
   Attendi 1–2 minuti e ripeti i check.

4. Riporta tabella: check → esito (OK / FAIL) → azione suggerita

5. Ricorda all'utente:
   - Frontend: `git push origin main`
   - Backend: `npm run functions:deploy` + IAM Cloud Run se necessario
