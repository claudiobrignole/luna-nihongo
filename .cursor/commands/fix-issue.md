# Fix issue GitHub

Analizza e risolvi l'issue GitHub indicata dall'utente (numero o URL).

1. `gh issue view <NUMERO>` per leggere titolo, body e label
2. Cerca nel codice i file rilevanti (grep + semantic search)
3. Implementa le modifiche necessarie con diff minimi
4. Verifica:
   ```bash
   npm run lint && npm test && npm run build
   ```
5. Se tocca booking/Stripe/email: `npm run check:booking` / `check:stripe` / `check:email`
6. Commit solo se richiesto; messaggio con `fix:` e riferimento `fixes #<NUMERO>`
7. Push su `main` o apri PR solo se l'utente lo chiede

Riporta: causa, fix applicato, come verificare.
