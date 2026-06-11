# Delta — N4 Livello 8 (potenziale, esperienze, paragoni)

Secondo blocco N4. Pacchetto UNICO: atomico (grammar+kanji) + dialogo + 9 unità.
Da applicare dopo che il Livello 7 è già nel repo (103 unità attese alla fine).

## Novità di questo pacchetto
La prima unità (grammar-potential) dichiara già prerequisites:["n4-level7-review"],
quindi curriculum:insert la ancora DA SOLA dopo il Livello 7 — niente riordino
manuale come servì per il L7.

## Contenuto
```
delta-n4-l8/
├── apply-atomic.mjs        # merge grammar+kanji per-id (idempotente)
├── delta.grammar.json      # 6 punti: potential, volitional, ta-koto-ga-aru, tari, nagara, comparison
├── delta.kanji.json        # 10 kanji N4 (教習走歩止動働帰買売) con strokeData + components
├── delta.dialogues.json    # 1 scena (dlg-experiences)
└── units/                  # 9 file unità
```

## Procedura (dalla radice del repo)
```bash
# FASE A — atomico
node delta-n4-l8/apply-atomic.mjs --delta delta-n4-l8 --dry-run
# atteso: grammar +6 → 27, kanji +10 → 86
node delta-n4-l8/apply-atomic.mjs --delta delta-n4-l8

# FASE B — dialogo + unità
# append dlg-experiences a repositories/dialogues.json (1 record)
cp delta-n4-l8/units/*.json content/curriculum/units/
npm run curriculum:insert -- \
  grammar-potential grammar-volitional grammar-ta-koto-ga-aru \
  grammar-tari-tari grammar-nagara grammar-comparison \
  kanji-n4-verbs-2 situation-travel-experiences n4-level8-review

# FASE C — valida
npm run curriculum:check   # atteso: PASS, 103 unità, 13 livelli
npm run build
```

## Verificato
Testato sul repo simulato che già contiene il L7 (94 unità): dopo il pacchetto
→ PASS, 103 unità, grammar 27, kanji 86. grammar-potential ancorata
automaticamente dopo n4-level7-review, prerequisiti tutti precedenti, 0 riordino
manuale. Componenti kanji (働=動+人) risolti su kanji già presenti.

## Note
- I 10 kanji N4 hanno strokeData. Ricorda di estendere il bundle KanjiVG ai loro
  SVG (come fatto per il L7) per il tracciamento completo, altrimenti fallback.
- Contenuto originale. Nessun commit: revisiona prima.
