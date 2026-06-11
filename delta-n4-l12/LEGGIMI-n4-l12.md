# Delta — N4 Livello 12 (sintesi + mock exam) — CHIUSURA N4

Sesto e ULTIMO blocco N4. Non introduce grammatica né kanji nuovi: consolida
tutto l'N4 e chiude col mock exam. Pacchetto: 1 dialogo + 4 unità. NESSUN
delta atomico (niente grammar/kanji nuovi).

## Contenuto
```
delta-n4-l12/
├── delta.dialogues.json    # 1 scena (dlg-n4-synthesis)
└── units/                  # 4 file:
    n4-grammar-synthesis (ripasso di tutta la grammatica N4)
    n4-kanji-synthesis   (ripasso di tutti i 50 kanji N4)
    situation-n4-synthesis (conversazione che intreccia più strutture)
    n4-mock-exam         (esame di prova N4 finale, 14 quiz)
```

## Procedura (dalla radice del repo)
```bash
# NIENTE FASE A atomica (nessun grammar/kanji nuovo)
# NIENTE FASE A-bis KanjiVG (nessun kanji nuovo)

# FASE B — dialogo + unità
# append dlg-n4-synthesis a repositories/dialogues.json (1 record)
cp delta-n4-l12/units/*.json content/curriculum/units/
npm run curriculum:insert -- \
  n4-grammar-synthesis n4-kanji-synthesis situation-n4-synthesis n4-mock-exam

# FASE C — valida
npm run curriculum:check   # atteso: PASS, 142 unità, 13 livelli
npm run build
```

## Verificato
Testato sul repo simulato con L7-L11 (138 unità): dopo il pacchetto → PASS,
142 unità, 13 livelli. Il percorso si chiude con n4-mock-exam. Catena di
prerequisiti → zero riordino manuale.

## Con questo, l'N4 è COMPLETO
- 6 livelli N4 (7-12), 61 unità N4 sopra le 81 dell'N5
- 31 punti grammaticali N4, 50 kanji N4 (tutti con tracciamento KanjiVG)
- dialoghi situazionali, scrittura libera e tracciamento per ogni blocco
- mock exam finale che copre tutto il livello

Contenuto originale. Nessun commit: revisiona prima.
