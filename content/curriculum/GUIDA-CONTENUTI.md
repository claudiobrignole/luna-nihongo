# Guida — aggiungere o modificare contenuti didattici

Questa cartella contiene **tutto il percorso N5** (60 unità). L'app non legge i singoli file: legge il bundle generato da `hydrate.mjs`.

## Struttura

```
content/curriculum/
├── manifest.json           # Sequenza canonica (unitOrder)
├── levels.json             # Titoli dei 7 macro-livelli
├── repositories/           # Contenuto atomico (una sola copia per item)
│   ├── kana.json
│   ├── kanji.json
│   ├── vocab.json
│   └── grammar.json
├── units/                  # Una lezione = un file {id}.json
├── hydrate.mjs             # Validatore + generatore bundle
└── build/curriculum.json   # OUTPUT (generato, non editare a mano)
```

## Regola fondamentale: refs, non copie

Le unità **non duplicano** caratteri o parole. Referenziano id:

```json
"kanaRefs": ["hira-a", "hira-i"],
"kanjiRefs": ["kanji-ichi"],
"vocabRefs": ["vocab-arigatou"],
"grammarRefs": ["gr-wa-topic"],
"reviewPoolRefs": ["hira-shi", "hira-tsu"]
```

Per correggere un mnemonico o un romaji, modifica **solo** il record in `repositories/`. La modifica si propaga ovunque quell'id sia usato.

## Convenzioni id (non rinominare dopo il go-live)

| Tipo     | Pattern              | Esempio              |
|----------|----------------------|----------------------|
| kana     | `hira-*` / `kata-*`  | `hira-ka`, `kata-shi` |
| kanji    | `kanji-*`            | `kanji-ichi`         |
| vocab    | `vocab-*`            | `vocab-mizu`         |
| grammar  | `gr-*`               | `gr-wa-topic`        |
| unità    | slug descrittivo     | `hiragana-vowels`    |

Gli id sono legati al progresso utente in Firestore (`completedUnits`). **Non rinominare** un id già pubblicato.

---

## Scenario 1 — Correggere testo esistente

1. Trova l'id (es. `hira-a` in `repositories/kana.json`).
2. Modifica il campo (mnemonico, romaji, traduzione IT/EN).
3. Valida: `npm run curriculum:check`
4. Commit + push → deploy automatico su Hostinger.

Non serve toccare le unità se l'id resta uguale.

---

## Scenario 2 — Aggiungere una nuova unità

1. **Crea** `units/nome-unita.json` (copia struttura da un'unità simile).
2. **Aggiungi** l'id in `manifest.json` → array `unitOrder` **nella posizione giusta**.
3. Assicurati che `id` nel JSON = nome file (`nome-unita.json`).
4. Compila `title`, `description`, `quizzes` (IT + EN obbligatori).
5. Referenzia item esistenti o aggiungi prima i record in `repositories/`.
6. Valida: `npm run curriculum:check`
7. Commit + push.

---

## Scenario 3 — Aggiungere un nuovo carattere / parola / punto grammaticale

1. Aggiungi **un record** in `repositories/kana.json` (o kanji/vocab/grammar).
2. Usa un id **nuovo e stabile** seguendo le convenzioni.
3. In `units/…json`, aggiungi l'id a `kanaRefs` / `kanjiRefs` / ecc.
4. `npm run curriculum:check` → commit + push.

Per i kanji con composizione: `components` deve puntare solo a kanji **già presenti prima** nel repo (ordine in `kanji.json`).

---

## Scenario 4 — Unità di ripasso (review)

- `type`: `"review"`
- `reviewPoolRefs`: elenco di id già insegnati in unità **precedenti** in `unitOrder`
- Quiz mirati sulle coppie confondibili del blocco

---

## Quiz — formati supportati

| Tipo              | Campi chiave                          |
|-------------------|---------------------------------------|
| multiple-choice   | `prompt`, `options[]`, `correctIndex` |
| spelling          | `prompt`, `answer`, `acceptedAnswers?` |
| matching          | `prompt`, `pairs: [{ left, right }]`  |

Ogni `prompt` e opzione devono avere `it` e `en`.

---

## Comandi

```bash
# Solo controllo (utile in CI / prima del commit)
npm run curriculum:check

# Valida + genera build/curriculum.json
npm run curriculum:build

# Dev locale (rigenera curriculum + avvia Vite)
npm run dev

# Build produzione (curriculum incluso → Hostinger)
npm run build
```

Se `curriculum:check` fallisce, leggi l'errore: di solito è un ref mancante, un id duplicato, o un'unità fuori da `unitOrder`.

---

## Versionamento contenuti

- `contentVersion` nell'unità: incrementa **solo** se cambi quiz o item in modo significativo.
- In futuro si può salvare in Firestore quale `contentVersion` l'utente ha completato.

---

## Cosa non fare

- Non editare `build/curriculum.json` a mano (viene rigenerato).
- Non mettere contenuto didattico in `src/data/lessons.ts` (legacy, non più usato).
- Non duplicare lo stesso kana/kanji in più repository.
- Non committare senza passare `npm run curriculum:check`.

---

## Flusso consigliato (team)

```
Modifica JSON → npm run curriculum:check → git commit → git push → Hostinger deploy
```

Documentazione tecnica completa (schema TypeScript, estensioni future): vedi `README.md` in questa cartella.
