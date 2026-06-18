# Revisione codice

Fai una revisione del codice modificato rispetto a `main`.

1. Analizza le differenze: `git diff main...HEAD` o modifiche non committate
2. Controlla in priorità:
   - Bug logici e casi limite (booking, Stripe, auth, ruoli teacher/super_admin)
   - Sicurezza: Firestore rules, callable auth, segreti esposti
   - Regressioni curriculum (id unità, copy 142 unità)
   - Codice duplicato e funzioni incomplete
3. Riporta **solo problemi concreti**, non preferenze di stile
4. Per ogni problema: file, contesto, descrizione, fix proposto
5. Classifica: critico / importante / minore

Non modificare file a meno che l'utente chieda di applicare i fix.
