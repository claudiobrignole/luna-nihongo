# Luna Nihongo — Design System 「るなマンガ」 v1.0

Sistema visivo della piattaforma, ispirato all'illustrazione editoriale manga flat
(riferimento: layout a bande piene, personaggi line-art, retini halftone, lettering
gigante in filigrana). Sostituisce il glassmorphism nella home pubblica; il resto
dell'app migra progressivamente.

**Brand:** il nome è scritto **るな** (hiragana) accompagnato dal lockup latino
**Luna Nihongo**. Mai "Runa", mai katakana ルナ nel logo.

---

## 1. Design token

Definiti in `src/index.css` sotto il commento `/* ── Manga brand tokens ── */`.
Prefisso `--ln-`.

### Colori brand

| Token | Hex | Uso |
|-------|-----|-----|
| `--ln-cream` | `#FAF6ED` | **Solo sfondo pagina + header** — vedi [`design.md`](design.md) |
| `--ln-ink` | `#2b2333` | Outline illustrazioni, testo, bordi, ombre dure |
| `--ln-paper` | `var(--ln-cream)` | Alias sfondo pagina (non usare su card/pannelli) |
| `--ln-washi` | `#EFE3C8` | Banda beige hero Studio + sezione 01 home |
| `--ln-red` | `#d6304a` | **Rosso unico del brand** — bande hero, CTA, chat, link, accenti, errori, PWA |
| `--ln-red-deep` | `#a8203a` | Hover, pressed, ombre sul rosso |
| `--ln-red-rgb` | `214, 48, 74` | Base per opacità (`--ln-red-a08` … `--ln-red-a40`) |
| `--ln-yellow` | `#f0a92e` | Banda 02, luna crescente, accenti |
| `--ln-purple` | `#7c4bb2` | Banda 03, obi, accenti AI |
| `--ln-purple-deep` | `#5b3389` | Hover/ombre sul viola |
| `--ln-teal` | `#2f8fa8` | Solo accento secondario (sciarpa, obijime) — mai banda |

### Colori illustrazione (fissi negli SVG)

| Ruolo | Hex |
|-------|-----|
| Pelle / ombra pelle | `#f7d6b8` / `#eebd97` |
| Blush | `#f09f9f` |
| Capelli / riflesso | `#382a2c` / `#5c4341` |
| Cappotto beige / ombra | `#e6d9c4` / `#d2c0a4` |
| Sciarpa blu / fantasia | `#4286c2` / `#2b5f94` |
| Pelle nera (chiodo) / zip | `#2a2630` / `#b9bac6` |
| Gonna floreale: fiori | `#d96a7c` `#a8516b` `#e8a48f` su nero |
| Kimono base / nuvole chiare | `#37323d` / `#cfc9c2` |
| Obi viola / onde | `#5f2d9e` / `#8a5cc9` |

### Semantici (alias sul rosso brand)

| Token | Valore | Uso |
|-------|--------|-----|
| `--primary` | `var(--ln-red)` | Tutta l’app: chat, nav attiva, bottoni, badge, selezioni |
| `--primary-hover` | `var(--ln-red-deep)` | Hover su elementi primary |
| `--primary-glow` | `var(--ln-red-a15)` | Sfondi soft, focus ring, stati attivi |
| `--error` | `var(--ln-red)` | Errori (stesso rosso, mai “fuoco” separato) |

**Regola:** non usare `#e74c3c`, `hsl(350, 85%, 50%)` né altri rossi fuori da `--ln-red` /
`--ln-red-deep`. Viola (`--secondary`), giallo (`--accent`) e teal (`--ln-teal`) restano
invariati per ruoli non-rossi.

---

## 2. Tipografia

| Token | Font | Uso |
|-------|------|-----|
| `--font-heading` | **Outfit** 700–800 | Titoli e testi in italiano/inglese |
| `--font-body` | **Outfit** 400–500 | Corpo, UI, form, blog (stesso font dei titoli) |
| `--font-japanese` / `--ln-font-display` | **Noto Sans JP** 400–900 | Solo testo giapponese (`lang="ja"`, titoli di banda, kana nei fumetti) |
| `--ln-font-brush` | Yuji Syuku 400 | Calligrafia: ribbon, etichette verticali `.mg-vertical` |

**Regola obbligatoria:** usare **sempre Outfit** per titoli e testi latini. **Mai Plus Jakarta Sans.**  
Per il giapponese usare **Noto Sans JP** (`lang="ja"` o `.ja-text`, `.mg-kana`, `.mg-bubble`).  
Yuji Syuku solo per elementi calligrafici espliciti, mai per paragrafi in IT/EN.

**Scala corpo testo:** `--ln-body-text-scale: 1.21` (+21% sulla root `html`) — compensazione Outfit vs Plus Jakarta (base tipografica +10%, aggiustamento +10%). I titoli usano `calc(Nrem / var(--ln-body-text-scale))`.

Regole: i titoli di banda sono giapponese prima (`lang="ja"` → Noto), traduzione sotto in Outfit più
piccolo. Indici di sezione in Outfit maiuscolo con numero (`01.STUDY`). Etichette
verticali (`writing-mode: vertical-rl`) in Yuji Syuku per il sapore calligrafico.
Yuji Syuku non funziona dentro SVG caricati via `<img>`: la calligrafia vive
sempre nell'HTML, mai negli asset.

---

## 3. Ricetta illustrazione 「るな」

Luna è disegnata a vettori, mai foto. Recipe per ogni nuova posa:

1. Outline unico `#2b2333`, spessore 3–4 su viewBox ~360×520, `stroke-linejoin: round`.
2. Riempimenti piatti, niente gradienti; ombra come secondo flat (es. pelle → ombra pelle).
3. Capelli: lunghi, lisci, castano scurissimo, riga centrale morbida, 2–3 ciocche
   davanti alle spalle, riflesso con poche linee, mai sfumature.
4. Volto: sopracciglia sottili, occhi a mandorla con ciglia superiori spesse e
   punto luce, naso a trattino, bocca piccola, blush a tre tratti obliqui.
5. Cerchio halftone (pattern di punti ink al 15–25%) dietro il busto, come nel riferimento.
6. Le pose derivano dalle foto di Luna: saluto in cappotto beige+sciarpa blu
   (`luna-hero`), pensierosa in kimono con dito al mento (`luna-sensei`), indice
   alzato in chiodo+gonna floreale (`luna-tomodachi`), kimono a braccia aperte
   (`luna-okaeri`).

Asset in `src/assets/brand/*.svg`. Elementi giapponesi di contorno: sakura
(petali e ramo), treno locale, torii, nuvole seigaiha, carte kana volanti.

**Aggiornamento home (produzione):** la home pubblica usa 5 illustrazioni
manga raster fornite dal cliente, scontornate e ottimizzate in WebP con alpha
(`luna-wave`, `luna-study`, `luna-flash`, `luna-talk`, `luna-torii`, ~120–180 KB
l'una, altezza 860px). Hanno già petali, fumetti こんにちは/Hello, cartelli あ/水
e torii inclusi nell'arte, quindi sulle relative bande quei decori SVG separati
sono rimossi. Le SVG disegnate a mano restano come riserva/fase 2. Per
scontornare uno sfondo bianco senza alpha: flood fill dai 4 angoli con PIL
(`ImageDraw.floodfill`, soglia ~28) per preservare i bianchi interni.

---

## 4. Componenti

### Banda editoriale `.mg-band`

Anatomia (come il riferimento DONGURI):

```
┌──────────────────────────────────────────────┐
│ 01.STUDY              [watermark gigante S]  │ ← indice Outfit caps
│ ガイドつきの道                    [illustr.   │ ← titolo JP 900
│ Percorso guidato — 142 unità…     Luna       │ ← sub latino
│ [CTA]                             cropped]   │もっと見る ← label verticale
└──────────────────────────────────────────────┘
```

Varianti colore: `.mg-band--washi` (testo ink), `.mg-band--yellow` (testo ink),
`.mg-band--purple` (testo bianco), `.mg-band--red` (testo bianco), `.mg-band--ink`
(testo paper). Bordi vivi (radius 0), bordo superiore 3px ink. L'illustrazione
esce dal bordo superiore della banda (`overflow: visible` + margine negativo).

### Watermark `.mg-watermark`

Una sola lettera latina (iniziale della label inglese), Outfit 900, 16–22rem,
opacità 0.10–0.14, ancorata a destra dietro l'illustrazione.

### Card manga `.mg-card`

Sfondo bianco/paper, bordo 2px ink, radius 8px, ombra dura `6px 6px 0` ink al 18%.
Niente blur, niente trasparenze.

### Bottoni `.mg-btn`

| Variante | Sfondo | Testo | Note |
|----------|--------|-------|------|
| `.mg-btn--red` | `--ln-red` | bianco | CTA primaria |
| `.mg-btn--ink` | `--ln-ink` | paper | CTA secondaria |
| `.mg-btn--ghost` | trasparente | corrente | bordo 2px corrente |

Tutti: bordo 2px ink, radius 999px, ombra dura `4px 4px 0` ink/25%; hover
`translate(-2px,-2px)` + ombra `6px 6px 0`; active rientra a 0. Focus visibile:
outline 3px `--ln-yellow`.

### Badge `.mg-badge`, indice `.mg-index`, label verticale `.mg-vertical`

Badge: pill bianco bordo ink con pallino rosso. Indice: Outfit 700 caps,
tracking 0.18em. Label verticale: `writing-mode: vertical-rl`, Yuji Syuku,
opacità 0.55, bordo sinistro 1px.

### Logo `.brand-mark`

Cerchio rosso (hinomaru) bordo 2px ink con るな bianco in Yuji Syuku e falce di
luna gialla in alto a destra; accanto, wordmark "Luna Nihongo" in Outfit 800 con
sopra るな piccolo in brush. Il vecchio cerchio sfumato 月 è deprecato.

---

## 5. Pattern

| Pattern | Implementazione |
|---------|-----------------|
| Halftone | `background: radial-gradient(circle, ink 1.2px, transparent 1.4px)`, size 11px, dentro cerchi/mask |
| Seigaiha | SVG data-URI ripetuto, opacità ≤ 0.08, su sezioni washi |
| Petali sakura | `.mg-petal` assoluti, animazione float 8–14s, disattivata con `prefers-reduced-motion` |
| Kana volanti | Card mini bianche bordo ink con あ／ね／水, rotazioni ±8° |

---

## 6. Accessibilità

Contrasto: testo bianco solo su rosso/viola/ink (≥ 4.5:1); su giallo e washi
sempre ink. Le illustrazioni hanno `alt` descrittivo ("Luna in kimono indica la
lavagna"), gli elementi decorativi `aria-hidden="true"`. Tutte le animazioni
rispettano `prefers-reduced-motion: reduce`. La calligrafia verticale è
decorativa e mai unico veicolo di informazione.

## 7. Do / Don't

| ✅ Do | ❌ Don't |
|------|---------|
| Bande piatte a tutta larghezza, bordi vivi | Glassmorphism/blur nella home pubblica |
| Una lettera watermark per banda | Più watermark sovrapposti |
| るな in Yuji Syuku nell'HTML | Calligrafia come `<text>` negli SVG `<img>` |
| Ombre dure offset (x=y, 0 blur) | Ombre morbide sfumate |
| JP grande + latino piccolo | Solo inglese nei titoli di banda |
| Outline `#2b2333` ovunque nelle illustrazioni | Nero puro `#000` |

## 8. Migrazione

Fase 1 (questa): home pubblica, header/logo, favicon, loading screen.
Fase 2: TeacherProfile con `luna-sensei`/`luna-okaeri`, AuthPage, dashboard.
Le classi `.marketing-*` sono deprecate e rimosse insieme al redesign della home.
