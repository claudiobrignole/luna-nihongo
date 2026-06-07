# Luna Nihongo — Curriculum N5

Contenuto didattico versionabile per il percorso di studio (`LearningPath`).
Porta lo studente da zero a un **JLPT N5** solido, con possibilità di
espansione verso N4. Bilingue IT/EN ovunque.

## Struttura delle cartelle

```
curriculum/
├─ manifest.json          # schemaVersion, unitOrder (sequenza canonica), unitMap
├─ levels.json            # 7 macro-sezioni (livelli 0–6)
├─ schema/
│  └─ syllabus.types.ts   # tipi TypeScript di tutte le entità
├─ repositories/          # contenuto ATOMICO, referenziato dalle unità
│  ├─ kana.json           # 211 record (hiragana + katakana)
│  ├─ kanji.json          # 66 kanji N5, ordinati per composizione
│  ├─ vocab.json          # 120 vocaboli con tag tematici
│  ├─ grammar.json        # 16 punti grammaticali
│  └─ dialogues.json      # (v1.1.0) scene dialogo — opzionale finché vuoto
├─ units/                 # 60 file, uno per unità (units/{id}.json)
├─ hydrate.mjs            # build + validatore (Node 18+)
├─ insert-units.mjs       # inserisce nuove unità in unitOrder (v1.1.0+)
└─ build/
   └─ curriculum.json     # OUTPUT generato: bundle idratato per React
```

## Principio chiave: refs, non copie

Le unità **non contengono** i dati delle card. Contengono solo **riferimenti**
per id (`kanaRefs`, `kanjiRefs`, `vocabRefs`, `grammarRefs`, `reviewPoolRefs`).
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
| dialogue | `dlg-<slug>`        | `dlg-cafe-order`, `dlg-station-ask` |
| unit     | slug descrittivo    | `hiragana-vowels`, `grammar-te-form` |
| quiz     | `q-<unit-abbr>-<tipo>-<n>` | `q-hv-mc-1`, `q-l5r-match-1` |

Gli id sono il contratto con lo stato utente salvato in Firestore
(`completedUnits`, XP). Rinominare un id pubblicato fa perdere il progresso.

## Schema 1.1.0 — layer situazionale + scrittura

Aggiunte **additive** rispetto alla 1.0.0 (i 60 file esistenti restano validi):

| Novità | Dettaglio |
|--------|-----------|
| `UnitType: "situation"` | Dialogo + Can-do + tag situazionali |
| `repositories/dialogues.json` | Scene referenziate via `dialogueRefs` |
| Campi unità | `dialogueRefs[]`, `canDo[]`, `situationTags[]` |
| Quiz `writing` | Produzione libera — `task`, `rubric`, `modelAnswer` (grading AI) |
| Quiz `stroke-order` | Tracciamento carattere — `targetItemId` + `japanese` |
| `strokeData` (opz.) | Su kana/kanji: `{ kanjiVgId, strokeCount }` — vedi KanjiVG sotto |

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
- **Nessun path geometry** nei JSON del curriculum: così i file restano contenuto
  didattico proprio e non diventano opera derivata CC-BY-SA.
- I dati vettoriali KanjiVG (licenza **CC-BY-SA 3.0**) vivono in un **bundle
  asset esterno**, risolto a runtime dal componente canvas, con attribuzione
  visibile in app.

## Romaji + toggle utente

Il campo `romaji` è **sempre popolato** nei record atomici e negli esempi
grammaticali. La visibilità è una preferenza utente
(`settings.showRomaji`, default `true`), non una scelta di contenuto.

I quiz `spelling` che producono romaji portano `requiresRomaji` (default `false`).
Il motore quiz può saltare/adattare le domande incoerenti quando il romaji è
visibile, per evitare domande banali.

## Ordine kanji per composizione

I kanji sono introdotti sfruttando i componenti come impalcatura mnemonica.
Il campo `components` di un kanji elenca gli id dei kanji-mattone già insegnati
(es. 林 e 森 dichiarano `kanji-ki`, perché 木 viene prima). Il validatore
**rifiuta** un `components` che punti a un kanji introdotto più avanti.

Catene principali: 一二三 → numeri grandi · 木→林→森 · 目→見 · 耳→聞 ·
言→話/読 · 大→天 · 子→学.

## Tipi di unità

`hiragana` · `katakana` · `kanji` · `grammar` · `vocab` · `review` · `situation` (v1.1.0).

Le **review-unit** (13 in totale, distribuite ogni 3–5 unità) hanno
`reviewPoolRefs` che pescano da contenuto di unità precedenti, e almeno un quiz
mirato sulle coppie confondibili del blocco. I 4 file del livello 6 sono review
di sintesi che attraversano l'intero curriculum.

## Suggerimenti per l'AI tutor

Ogni unità ha `tutorReviewTopics` (lista bilingue): sono gli argomenti su cui
Luna può proporre ripasso dopo il completamento, sfruttando memoria/XP studente.
I punti grammaticali hanno `relatedRefs` per collegare argomenti affini.

## Build & validazione

```bash
node hydrate.mjs          # valida e scrive build/curriculum.json
node hydrate.mjs --check  # valida soltanto (per la CI, niente output)
```

Il validatore fallisce (exit code 1) su: ref danglanti, id duplicati,
disallineamento unitOrder↔file, `components` in avanti, locale it/en mancante,
quiz malformati (correctIndex fuori range, spelling senza answer, ecc.).
Collegalo alla CI **prima del deploy** su Hostinger.

## Versionamento

- `schemaVersion` (manifest): versione dello schema dati.
- `contentVersion` (per unità): incrementare **solo** su modifiche materiali a
  item o quiz. Salvare in Firestore l'id unità + `contentVersion` completata,
  così si sa se un utente ha finito una versione superata del contenuto.

## Schema app (migrazione completata)

La migrazione al nuovo schema è **completata**. L'app non usa più item embedded né
quiz con `question`/`correctAnswer`.

Flusso attuale:

1. `hydrate.mjs` valida i JSON sorgente e genera `build/curriculum.json`.
2. `src/data/curriculum.ts` importa il bundle come `CurriculumBundle`
   (`schemaVersion`, `targetLevel`, `builtAt`, `levels`, `units`).
3. `LearningPath` consuma `SYLLABUS` (`HydratedUnit[]`) e i quiz
   `prompt` / `correctIndex` / `spelling` / `matching`, con
   `curriculumDisplay.checkQuizAnswer()`.

Tipi in `schema/syllabus.types.ts` (re-esportati da `src/types/curriculum.ts`).

## Stato

schemaVersion **1.1.0** · 60 unità · 7 livelli · 211 kana · 66 kanji · 120 vocaboli · 16 punti grammaticali · 0 dialoghi (layer pronto).
Copertura completa hiragana, katakana, kanji/vocab/grammatica N5.

## TODO app (v1.1.0 — non ancora implementati)

Integrazioni UI richieste per i nuovi tipi quiz:

1. **`writing`** — chiamata a Gemini per grading usando `task` + `rubric` + risposta studente vs `modelAnswer`.
2. **`stroke-order`** — componente canvas + risoluzione asset KanjiVG da `strokeData.kanjiVgId` + attribuzione CC-BY-SA in UI.
3. **`situation`** — pannello dialogo (linee da `dialogues[]`) + Can-do in sidebar/unit header.

## Estensioni future segnalate (non bloccanti)

- Tipi unità non ancora supportati che gioverebbero al percorso: dialoghi audio,
  reading passage, drag-and-drop. In particolare la forma -て trarrebbe beneficio
  da tabelle interattive o audio.
- SRS per-item vero (stile SM-2) come evoluzione delle review-unit esplicite,
  con coda di ripasso e scheduling per utente in Firestore.
- Espansione N4: le forme rispettose della famiglia (おとうさん…) e i vocaboli
  già predisposti con tag sono un punto di partenza naturale.
