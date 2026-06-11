# Delta — N4 Livello 9 + recupero tracciamento kanji L7/L8

Terzo blocco N4. Pacchetto UNICO: atomico (grammar+kanji) + dialogo + 12 unità.
Include il RECUPERO del tracciamento kanji dei livelli 7 e 8 (che avevano il
riconoscimento ma non il tracciamento), accoppiato subito dopo le rispettive
unità di riconoscimento già pubblicate.

## Convenzioni applicate (novità vs L7/L8)
1. CATENA DI PREREQUISITI COMPLETA su tutte le unità L9: ognuna ha come
   prerequisite la precedente → curriculum:insert le ancora TUTTE da sole, in
   sequenza, ZERO riordino manuale.
2. apply-atomic.mjs: il merge dei livelli è opzionale (delta.levels.json assente
   qui — i livelli 7-12 esistono già dal L7).
3. Le 3 unità di tracciamento dichiarano il prerequisite verso la loro unità di
   riconoscimento, quindi si inseriscono nel punto esatto (anche dentro L7/L8).

## Contenuto
```
delta-n4-l9/
├── apply-atomic.mjs        # merge grammar+kanji per-id (livelli opzionali)
├── delta.grammar.json      # 6 punti: to-omou/to-iu, toki, deshou, kamoshirenai, sou-desu(×2)
├── delta.kanji.json        # 10 kanji N4 (家族兄弟姉妹送借貸泳) con strokeData
├── delta.dialogues.json    # 1 scena (dlg-opinion-weather)
└── units/                  # 12 file:
    9 unità L9 (6 grammar + kanji-n4-family + situation-opinions-guesses + n4-level9-review)
    + writing-kanji-n4-2 (recupero L7: 待始終開閉)
    + writing-kanji-n4-3 (recupero L8: 教習走歩止動働帰買売)
    + writing-kanji-n4-4 (L9: 家族兄弟姉妹送借貸泳)
```

## Procedura (dalla radice del repo)
```bash
# FASE A — atomico
node delta-n4-l9/apply-atomic.mjs --delta delta-n4-l9 --dry-run
# atteso: grammar +6 → 33, kanji +10 → 96
node delta-n4-l9/apply-atomic.mjs --delta delta-n4-l9

# FASE A-bis — KanjiVG: estendi il bundle ai 10 nuovi kanji L9
npm run kanjivg:bundle
# lo script legge tutti i kanji con strokeData da kanji.json; verifica 0 mismatch.
# (i 10 L9: 家族兄弟姉妹送借貸泳 — SVG non modificati, licenza CC-BY-SA)

# FASE B — dialogo + unità
# append dlg-opinion-weather a repositories/dialogues.json (1 record)
cp delta-n4-l9/units/*.json content/curriculum/units/
npm run curriculum:insert -- \
  grammar-to-omou-to-iu grammar-toki grammar-deshou grammar-kamoshirenai \
  grammar-sou-desu-hearsay grammar-sou-desu-looks kanji-n4-family \
  situation-opinions-guesses n4-level9-review \
  writing-kanji-n4-2 writing-kanji-n4-3 writing-kanji-n4-4

# FASE C — valida
npm run curriculum:check   # atteso: PASS, 115 unità, 13 livelli
npm run build
```

## Verificato
Testato sul repo simulato con L7+L8 (103 unità): dopo il pacchetto → PASS,
115 unità, grammar 33, kanji 96. Tutte le unità ancorate AUTOMATICAMENTE
(catena di prerequisiti), zero riordino manuale. Le unità di tracciamento di
recupero si collocano dentro L7 (writing-kanji-n4-2 dopo kanji-n4-verbs-1) e
L8 (writing-kanji-n4-3 dopo kanji-n4-verbs-2), senza rinominare nulla.

## Note
- Contenuto originale. Nessun commit: revisiona prima.
- Da qui in poi ogni livello che introduce kanji ha la sua unità di tracciamento
  accoppiata (riconoscimento → tracciamento), come per i kana N5.
