# Delta — unità di tracciamento kana (stroke-order)

Aggiunge 11 unità `writing-*` di tracciamento a mano, una per ogni unità kana
base esistente, intrecciate subito dopo la rispettiva unità di riconoscimento.
Copre tutti i 92 kana che hanno già `strokeData`. NON modifica unità esistenti.

## Contenuto
```
delta-stroke/units/   11 file:
  writing-hiragana-k, -s, -t, -n, -h, -m, -yrw
  writing-katakana-vowels-k, -s-t, -n-h, -m-yrw
```
Ogni unità: type "situation", un quiz stroke-order per carattere + 1 MC
sull'importanza dell'ordine dei tratti, canDo di scrittura, prerequisite =
l'unità kana corrispondente.

## Prerequisiti infrastruttura (già presenti nel repo)
- 92 kana con strokeData in kana.json ✓
- 92 SVG in public/kanjivg/ ✓
- StrokeOrderQuizPanel + kanjiVgLoader + strokeMatch ✓
Nessuna modifica a schema, hydrate, o componenti: è solo contenuto nuovo.

## Procedura (dalla radice del repo)
```bash
cp delta-stroke/units/*.json content/curriculum/units/

npm run curriculum:insert -- \
  writing-hiragana-k writing-hiragana-s writing-hiragana-t writing-hiragana-n \
  writing-hiragana-h writing-hiragana-m writing-hiragana-yrw \
  writing-katakana-vowels-k writing-katakana-s-t writing-katakana-n-h \
  writing-katakana-m-yrw

npm run curriculum:check   # atteso: PASS, 85 unità
npm run build
```

## Risultato atteso
- unità: 74 → 85 (+11)
- quiz stroke-order: 3 → 96 (3 vocali + 93 nuovi)
- nessun nuovo kana/vocab/dialogo: usa solo strokeData già presenti

Ogni unità è ancorata dopo la sua (es. writing-hiragana-k subito dopo
hiragana-k). Gli id sono nuovi: nessun rischio per il progresso Firestore.
Nessun commit: revisiona prima.
