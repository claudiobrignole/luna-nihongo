# Delta — N4 Livello 7 (forma piana e frasi complesse) — blocco d'oro

Primo blocco dell'N4. 9 unità nel Livello 7, intrecciate dopo n5-mock-exam.
Tutto il contenuto atomico (grammatica, kanji con strokeData) è GIÀ nei
repository: questo delta aggiunge solo le UNITÀ + 1 dialogo nuovo.

## Contenuto del pacchetto
```
delta-n4-l7/
├── delta.dialogues.json     # 1 scena nuova (dlg-plain-chat) da appendere
└── units/                   # 9 file unità nuovi
    grammar-dictionary-form, grammar-nai-form, grammar-ta-form-plain,
    grammar-n-desu, grammar-relative-clauses, kanji-n4-verbs-1,
    situation-plain-friends, writing-kanji-n4-1, n4-level7-review
```

## Prerequisiti già nel repo (verificare, non riprodurre)
- grammar.json: gr-dictionary-form, gr-nai-form, gr-ta-form-plain, gr-n-desu,
  gr-relative-clauses (i 5 punti L7) — già presenti
- kanji.json: i 60 kanji N4 con strokeData già presenti
- levels.json: livelli 7-12 già definiti
- public/kanjivg/: serviranno gli SVG dei kanji N4 per lo stroke-order (vedi nota)

## Procedura (dalla radice del repo)
```bash
# 1) appendi il dialogo nuovo a repositories/dialogues.json (merge per-id)
#    (usa lo stesso apply-delta o append manuale: 1 solo record, id dlg-plain-chat)

# 2) copia le 9 unità
cp delta-n4-l7/units/*.json content/curriculum/units/

# 3) inserisci in ordine (dopo n5-mock-exam, in sequenza)
npm run curriculum:insert -- \
  grammar-dictionary-form grammar-nai-form grammar-ta-form-plain \
  grammar-n-desu grammar-relative-clauses kanji-n4-verbs-1 \
  situation-plain-friends writing-kanji-n4-1 n4-level7-review

# 4) imposta targetLevel N4 in manifest.json (se non già fatto)

# 5) valida e builda
npm run curriculum:check   # atteso: PASS, 94 unità, 13 livelli
npm run build
```

## Nota stroke-order sui kanji (IMPORTANTE)
writing-kanji-n4-1 usa quiz stroke-order su 5 kanji N4 (思知作使持).
Il bundle KanjiVG attuale in public/kanjivg/ copre i 92 KANA. Per i kanji
servono i rispettivi SVG: rigenera il bundle includendo anche gli id kanji,
con lo stesso script e la stessa fonte/licenza CC-BY-SA dei kana:
  npm run kanjivg:bundle  (estendendo la sorgente id da kanji.json, non solo kana.json)
Gli id KanjiVG dei 5 kanji sono nei rispettivi strokeData.kanjiVgId.
Se gli SVG kanji non sono presenti, il quiz cade nel fallback (animazione +
conferma), non blocca — ma per l'esperienza piena vanno aggiunti.

## Risultato atteso
- unità: 85 → 94 (+9), nuovo Livello 7
- targetLevel: N5 → N4
- dialoghi: +1 (dlg-plain-chat)
- nessun nuovo kanji/vocab/grammar: usano contenuto atomico già presente

Gli id sono nuovi: nessun impatto sul progresso Firestore. Nessun commit.
