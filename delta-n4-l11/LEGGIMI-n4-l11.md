# Delta — N4 Livello 11 (dare/ricevere, voci verbali, cortesia) — versione ricca

Quinto blocco N4, il più denso. Pacchetto UNICO: atomico + 2 dialoghi + 12 unità.
Articolato in versione "ricca" (opzione A): i punti più ostici hanno un'unità
dedicata ciascuno, e ci sono DUE situazioni (dare/ricevere + keigo).

## Contenuto
```
delta-n4-l11/
├── apply-atomic.mjs        # merge grammar+kanji (livelli opzionali)
├── delta.grammar.json      # 7 punti: ageru-kureru-morau, causative, passive,
│                           #          causative-passive, node-noni, tame-ni-you-ni, keigo-basics
├── delta.kanji.json        # 10 kanji N4 (長短近遠強弱重軽病院) con strokeData
├── delta.dialogues.json    # 2 scene (dlg-gifts, dlg-keigo-shop)
└── units/                  # 12 file:
    7 grammar (incl. causativo-passivo dedicato)
    + kanji-n4-adjectives
    + situation-giving-receiving + situation-keigo-shop
    + n4-level11-review
    + writing-kanji-n4-6 (tracciamento, accoppiato dopo il kanji)
```

## Procedura (dalla radice del repo)
```bash
# FASE A — atomico
node delta-n4-l11/apply-atomic.mjs --delta delta-n4-l11 --dry-run
# atteso: grammar +7 → 47, kanji +10 → 116
node delta-n4-l11/apply-atomic.mjs --delta delta-n4-l11

# FASE A-bis — KanjiVG: estendi il bundle ai 10 nuovi kanji L11
npm run kanjivg:bundle
# (10 L11: 長短近遠強弱重軽病院 — SVG non modificati, CC-BY-SA; verifica 0 mismatch)

# FASE B — dialoghi + unità
# append dlg-gifts E dlg-keigo-shop a repositories/dialogues.json (2 record)
cp delta-n4-l11/units/*.json content/curriculum/units/
npm run curriculum:insert -- \
  grammar-ageru-kureru-morau grammar-causative grammar-passive \
  grammar-causative-passive grammar-node-noni grammar-tame-ni-you-ni \
  grammar-keigo-basics kanji-n4-adjectives situation-giving-receiving \
  situation-keigo-shop n4-level11-review writing-kanji-n4-6

# FASE C — valida
npm run curriculum:check   # atteso: PASS, 138 unità, 13 livelli
npm run build
```

## Verificato
Testato sul repo simulato con L7-L10 (126 unità): dopo il pacchetto → PASS,
138 unità, grammar 47, kanji 116. Catena prerequisiti → zero riordino manuale.

## Note didattiche (livello difficile)
- DARE/RICEVERE (あげる/くれる/もらう): scelta per direzione del favore, non per
  significato. Il punto più diverso dall'italiano.
- CAUSATIVO-PASSIVO (〜させられる): unità dedicata, è il punto dove molti crollano.
- KEIGO: a N4 si RICONOSCE, non si padroneggia. La situazione keigo è di
  comprensione (skill reading), non di produzione.

Contenuto originale. Nessun commit: revisiona prima.
