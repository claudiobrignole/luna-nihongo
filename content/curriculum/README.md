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
│  └─ grammar.json        # 16 punti grammaticali
├─ units/                 # 60 file, uno per unità (units/{id}.json)
├─ hydrate.mjs            # build + validatore (Node 18+)
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
| unit     | slug descrittivo    | `hiragana-vowels`, `grammar-te-form` |
| quiz     | `q-<unit-abbr>-<tipo>-<n>` | `q-hv-mc-1`, `q-l5r-match-1` |

Gli id sono il contratto con lo stato utente salvato in Firestore
(`completedUnits`, XP). Rinominare un id pubblicato fa perdere il progresso.

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

`hiragana` · `katakana` · `kanji` · `grammar` · `vocab` · `review`.

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

## Nota sullo schema legacy dell'app

L'app usava item embedded e quiz con `question`/`correctAnswer`. Il nuovo schema
usa refs + `prompt`/`correctIndex`. Il build mappa verso `HydratedUnit`
(vedi `schema/syllabus.types.ts`); `LearningPath` va aggiornato di conseguenza,
oppure si aggiunge un piccolo adattatore in lettura del bundle.

## Stato

60 unità · 7 livelli · 211 kana · 66 kanji · 120 vocaboli · 16 punti grammaticali.
Copertura completa hiragana, katakana, kanji/vocab/grammatica N5.

## Estensioni future segnalate (non bloccanti)

- Tipi unità non ancora supportati che gioverebbero al percorso: dialoghi audio,
  reading passage, drag-and-drop. In particolare la forma -て trarrebbe beneficio
  da tabelle interattive o audio.
- SRS per-item vero (stile SM-2) come evoluzione delle review-unit esplicite,
  con coda di ripasso e scheduling per utente in Firestore.
- Espansione N4: le forme rispettose della famiglia (おとうさん…) e i vocaboli
  già predisposti con tag sono un punto di partenza naturale.
