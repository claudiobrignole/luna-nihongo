# Delta — N4 Livello 10 (condizioni e obblighi)

Quarto blocco N4. Pacchetto UNICO: atomico (grammar+kanji) + dialogo + 11 unità.
Stesse convenzioni del L9: catena di prerequisiti completa (zero riordino),
apply-atomic con livelli opzionali, step KanjiVG dedicato.

## Contenuto
```
delta-n4-l10/
├── apply-atomic.mjs        # merge grammar+kanji per-id (livelli opzionali)
├── delta.grammar.json      # 7 punti: tara, to-conditional, ba, nara, nakereba-naranai, nakutemo-ii, te-shimau-oku-miru
├── delta.kanji.json        # 10 kanji N4 (親朝昼夜曜週新古多少) con strokeData
├── delta.dialogues.json    # 1 scena (dlg-plans-conditions)
└── units/                  # 11 file:
    7 grammar + kanji-n4-time-quantity + situation-plans-obligations +
    n4-level10-review + writing-kanji-n4-5 (tracciamento L10, accoppiato)
```

## Procedura (dalla radice del repo)
```bash
# FASE A — atomico
node delta-n4-l10/apply-atomic.mjs --delta delta-n4-l10 --dry-run
# atteso: grammar +7 → 40, kanji +10 → 106
node delta-n4-l10/apply-atomic.mjs --delta delta-n4-l10

# FASE A-bis — KanjiVG: estendi il bundle ai 10 nuovi kanji L10
npm run kanjivg:bundle
# (10 L10: 親朝昼夜曜週新古多少 — SVG non modificati, CC-BY-SA; verifica 0 mismatch)

# FASE B — dialogo + unità
# append dlg-plans-conditions a repositories/dialogues.json (1 record)
cp delta-n4-l10/units/*.json content/curriculum/units/
npm run curriculum:insert -- \
  grammar-tara grammar-to-conditional grammar-ba grammar-nara \
  grammar-nakereba-naranai grammar-nakutemo-ii grammar-te-shimau-oku-miru \
  kanji-n4-time-quantity situation-plans-obligations n4-level10-review \
  writing-kanji-n4-5

# FASE C — valida
npm run curriculum:check   # atteso: PASS, 126 unità, 13 livelli
npm run build
```

## Verificato
Testato sul repo simulato con L7-L9 (115 unità): dopo il pacchetto → PASS,
126 unità, grammar 40, kanji 106. Catena di prerequisiti → zero riordino manuale.
writing-kanji-n4-5 accoppiata dopo kanji-n4-time-quantity.

## Nota didattica
I quattro condizionali (たら/と/ば/なら) sono il punto più sottile dell'N4: si
traducono tutti con "se" ma hanno usi distinti. Le unità e il ripasso insistono
sulle differenze (と automatico, なら contestuale, ば ipotetico, たら versatile).

Contenuto originale. Nessun commit: revisiona prima.
