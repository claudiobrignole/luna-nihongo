# Delta ATOMICO — N4 Livello 7 (da applicare PRIMA delle unità)

Questo pacchetto aggiunge il CONTENUTO ATOMICO mancante che le unità del
Livello 7 referenziano. Cursor ha verificato che nel repo NON c'erano ancora:
i 5 punti grammaticali L7, i kanji N4, e i livelli 7-12. Questo delta li aggiunge.

## Ordine corretto di applicazione (IMPORTANTE)
1. PRIMA questo delta atomico (grammar + kanji + levels)
2. POI il delta delle unità (delta-n4-l7/): dialogo + 9 unità + curriculum:insert
Se inverti l'ordine, curriculum:check fallisce su riferimenti mancanti.

## Contenuto
```
delta-n4-l7-atomic/
├── apply-atomic.mjs       # merge per-id in grammar/kanji/levels (idempotente)
├── delta.grammar.json     # 5 punti L7: dictionary-form, nai, ta-plain, n-desu, relative
├── delta.kanji.json       # 10 kanji N4 (思知作使持待始終開閉) con strokeData + components → kanji N5 reali
└── delta.levels.json      # definizioni livelli 7-12
```

## Procedura completa (dalla radice del repo)
```bash
# === FASE A: atomico ===
node delta-n4-l7-atomic/apply-atomic.mjs --delta delta-n4-l7-atomic --dry-run
# atteso: grammar +5 → 21, kanji +10 → 76, levels +6 → 13
node delta-n4-l7-atomic/apply-atomic.mjs --delta delta-n4-l7-atomic

# === FASE B: unità (dal pacchetto delta-n4-l7/) ===
# append del dialogo dlg-plain-chat a repositories/dialogues.json (1 record)
cp delta-n4-l7/units/*.json content/curriculum/units/
npm run curriculum:insert -- \
  grammar-dictionary-form grammar-nai-form grammar-ta-form-plain \
  grammar-n-desu grammar-relative-clauses kanji-n4-verbs-1 \
  situation-plain-friends writing-kanji-n4-1 n4-level7-review

# === FASE C: valida ===
npm run curriculum:check   # atteso: PASS, 94 unità, 13 livelli
npm run build
```

## Verificato
Testato su un repo simulato che replica lo stato reale (66 kanji, 16 grammar,
7 livelli, 85 unità): dopo i due delta → PASS, 94 unità, 13 livelli, 76 kanji,
21 grammar. I componenti dei 10 kanji N4 puntano solo a kanji N5 realmente
presenti (kanji-ta, kanji-kuchi, kanji-hito, kanji-te-hand, kanji-ji-time,
kanji-onna, kanji-kan). 0 componenti in avanti.

## Note
- I 10 kanji N4 hanno strokeData (kanjiVgId + strokeCount). Per il tracciamento
  servono i loro SVG nel bundle KanjiVG (vedi LEGGIMI del pacchetto unità):
  estendi kanjivg:bundle a kanji.json. Senza SVG, il quiz usa il fallback.
- Tutto il contenuto è originale. Nessun commit: revisiona prima.
