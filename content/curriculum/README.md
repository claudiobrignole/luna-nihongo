# Luna Nihongo — Curriculum

Contenuto didattico versionabile per il percorso di studio (`LearningPath`).
Porta lo studente da zero a un **JLPT N4** solido (traccia N5 completa + espansione N4).
Bilingue IT/EN ovunque.

## Stato attuale

| | |
|--|--|
| `schemaVersion` | **1.1.0** |
| `targetLevel` | **N4** |
| Macro-livelli | **13** (L0–L12) |
| Unità | **142** (N5: 85 · N4: 57) |
| Atomici | 211 kana · 116 kanji · 137 vocab · 47 grammatica · 20 dialoghi |

Conteggio unità per livello: L0=21, L1=12, L2=12, L3=14, L4=11, L5=11, L6=4, L7=10, L8=10, L9=10, L10=11, L11=12, L12=4.

## Struttura delle cartelle

```
curriculum/
├─ manifest.json          # schemaVersion, unitOrder (sequenza canonica), unitMap
├─ levels.json            # 13 macro-sezioni (livelli 0–12)
├─ schema/
│  └─ syllabus.types.ts   # tipi TypeScript di tutte le entità
├─ repositories/          # contenuto ATOMICO, referenziato dalle unità
│  ├─ kana.json
│  ├─ kanji.json
│  ├─ vocab.json
│  ├─ grammar.json
│  └─ dialogues.json      # 20 scene situazionali
├─ units/                 # 142 file, uno per unità (units/{id}.json)
├─ hydrate.mjs            # build + validatore (Node 18+)
├─ insert-units.mjs       # inserisce nuove unità in unitOrder
└─ build/
   └─ curriculum.json     # OUTPUT generato: bundle idratato per React
```

## Principio chiave: refs, non copie

Le unità **non contengono** i dati delle card. Contengono solo **riferimenti**
per id (`kanaRefs`, `kanjiRefs`, `vocabRefs`, `grammarRefs`, `dialogueRefs`, `reviewPoolRefs`).
Lo script `hydrate.mjs` risolve i riferimenti e produce `build/curriculum.json`,
con ogni record inline, pronto da importare nel componente React.

Vantaggio: un carattere o un vocabolo esiste in **un solo posto**. Correggere
un mnemonico o un romaji è una modifica singola che si propaga a tutte le unità
che lo usano (incluse le review-unit, che pescano dal pool già visto).

## Convenzioni sugli id (NON rinominare id pubblicati)

| Entità   | Pattern             | Esempi                          |
|----------|---------------------|---------------------------------|
| kana     | `hira-<romaji>` / `kata-<romaji>` | `hira-ka`, `kata-shi`, `hira-kya`, `hira-sokuon` |
| kanji    | `kanji-<lettura>`   | `kanji-ichi`, `kanji-ki`, `kanji-miru-k` |
| vocab    | `vocab-<romaji>`    | `vocab-arigatou`, `vocab-taberu` |
| grammar  | `gr-<slug>`         | `gr-wa-topic`, `gr-te-form`     |
| dialogue | `dlg-<slug>`        | `dlg-self-intro`, `dlg-keigo-shop` |
| unit     | slug descrittivo    | `hiragana-vowels`, `grammar-te-form` |
| quiz     | `q-<unit-abbr>-<tipo>-<n>` | `q-hv-mc-1`, `q-l5r-match-1` |

Gli id sono il contratto con lo stato utente salvato in Firestore
(`completedUnits`, XP). Rinominare un id pubblicato fa perdere il progresso.

## Schema 1.1.0 — situazioni, scrittura, stroke-order

| Novità | Dettaglio |
|--------|-----------|
| `UnitType: "situation"` | Dialogo + Can-do + tag situazionali |
| `repositories/dialogues.json` | 20 scene referenziate via `dialogueRefs` |
| Campi unità | `dialogueRefs[]`, `canDo[]`, `situationTags[]` |
| Quiz `writing` | Produzione libera — grading AI (`task`, `rubric`, `modelAnswer`) |
| Quiz `stroke-order` | Tracciamento carattere — `targetItemId` + KanjiVG |
| Unità `writing-*` | Scrittura kana/kanji con quiz dedicati |
| `mastery` / `mock-exam` | Sintesi e simulazioni N5/N4 (livelli 6 e 12) |

Inserimento nuove unità: **non modificare `unitOrder` a mano**. Creare il file in
`units/`, poi:

```bash
node content/curriculum/insert-units.mjs <unit-id> [unit-id...]
npm run curriculum:check
```

### KanjiVG e `strokeData` (licenza)

I JSON del curriculum contengono **solo un riferimento** KanjiVG:

```json
"strokeData": { "kanjiVgId": "03042", "strokeCount": 3 }
```

- `kanjiVgId` = codepoint Unicode a 5 cifre esadecimali (あ → `"03042"`).
- **Nessun path geometry** nei JSON del curriculum.
- I dati vettoriali KanjiVG (licenza **CC-BY-SA 3.0**) vivono in `public/kanjivg/`,
  risolti a runtime dal componente canvas. Attribuzione in-app nel pannello stroke-order.

## Romaji + toggle utente

Il campo `romaji` è **sempre popolato** nei record atomici e negli esempi
grammaticali. La visibilità è una preferenza utente
(`settings.showRomaji`, default `true`), non una scelta di contenuto.

## Ordine UI vs ordine file

La sequenza mostrata in Studio segue `manifest.unitOrder`, non il campo `order`
di ogni unità. In React: `getUnitsForLevel()` in `src/data/curriculum.ts`.

## Tipi di unità

`hiragana` · `katakana` · `kanji` · `grammar` · `vocab` · `review` · `situation` ·
`mastery` · `mock-exam` · unità `writing-*`.

Le **review-unit** hanno `reviewPoolRefs` che pescano da contenuto precedente.
I livelli 6 (N5) e 12 (N4) chiudono con mastery + mock exam.

## Dialoghi e audio

- **20 unità `situation`** referenziano **20 dialoghi** (~62 battute totali).
- I testi sono in `dialogues.json`; l'audio in Studio usa **TTS Gemini** (come vocab/grammatica), non file pre-registrati.
- **UI dialoghi** nel drawer Studio: `DialogueStudyPanel` (battute, TTS, microfono, “Ascolta tutto”) + `CanDoPanel`.

## Suggerimenti per l'AI tutor

Ogni unità può avere `tutorReviewTopics` (lista bilingue): argomenti di ripasso
dopo il completamento. I punti grammaticali hanno `relatedRefs` per collegare argomenti affini.

## Build & validazione

```bash
npm run curriculum:build   # valida e scrive build/curriculum.json
npm run curriculum:check     # valida soltanto (CI / prebuild)
```

Il validatore fallisce (exit code 1) su: ref dangling, id duplicati,
disallineamento unitOrder↔file, `components` kanji in avanti, locale it/en mancante,
quiz malformati, unità `situation` senza `dialogueRefs`, ecc.

## Versionamento

- `schemaVersion` (manifest): versione dello schema dati.
- `contentVersion` (per unità): incrementare **solo** su modifiche materiali a
  item o quiz.

## Integrazione app

1. `hydrate.mjs` valida i JSON sorgente e genera `build/curriculum.json`.
2. `src/data/curriculum.ts` importa il bundle (`SYLLABUS`, `CURRICULUM_LEVELS`, `CURRICULUM_META`).
3. `LearningPath` consuma unità idratate, quiz, `WritingQuizPanel`, `StrokeOrderQuizPanel`.

Tipi in `schema/syllabus.types.ts` (re-esportati da `src/types/curriculum.ts`).

## Pacchetti delta N4

Le cartelle `delta-n4-l7/` … `delta-n4-l12/` (root repo) contengono patch
atomiche e script `apply-atomic.mjs` usati durante l'integrazione N4.
Flusso: applicare delta → `insert-units.mjs` → `curriculum:check` → commit.

## Lacune / prossimi passi contenuto

1. Allineare prompt tutor a 142 unità / 13 livelli (alcuni testi ancora su “60 unità”).
2. Eventuale cache audio pre-generato per dialoghi (due voci) se si vuole qualità superiore al TTS live.
