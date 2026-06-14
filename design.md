# Luna Nihongo — Design memory

Riferimento rapido per decisioni visive permanenti. Dettaglio completo in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

## Sfondi

| Token | Hex | Uso |
|-------|-----|-----|
| `--ln-cream` | **`#FAF6ED`** | **Solo** sfondo pagina (`body`, `.app-container`, `--bg-app`) e **header** (`.main-header`) |
| `--ln-washi` | **`#EFE3C8`** | Bande manga beige — hero Studio (`page-hero`), sezione 01 home (`mg-band--washi`) |
| `--ln-card-bg` / `--bg-panel` | **`#ffffff`** | Card, pannelli, filtri, flashcard, footer, nav mobile — tutto il resto |

**Regola:** `#FAF6ED` non va su card, pannelli, filtri o altri componenti UI. Per superfici elevate usare bianco (`--ln-card-bg` o `--bg-panel`).

**CSS:** `src/index.css` (`--ln-cream`, `--ln-washi`, `--ln-card-bg`, `--bg-panel`).

**Non confondere:** il crema `#FAF6ED` è pagina + header; il washi `#EFE3C8` è solo per le bande hero/home; il bianco è per tutte le superfici contenuto.
