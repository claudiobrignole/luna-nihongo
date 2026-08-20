# Pubblicare un articolo sul blog Luna Nihongo

Guida operativa per testi, cover e pubblicazione. Gli articoli vivono su **Firestore** (`blogPosts`); le cover su **Firebase Storage** (`blog/covers/`). Non sono file nel repository git.

## Chi può farlo

Solo account con ruolo **`super_admin`**. Teacher e utenti normali non vedono l’editor.

## Aprire l’editor

Dopo il login:

1. **Menu utente** (icona profilo) → **Articoli blog** — apre direttamente la sezione blog, oppure
2. **Menu utente** → **Pannello staff** → tab **Blog**

Componente: `src/components/AdminBlogPanel.tsx`

## Nuovo articolo — passo per passo

### 1. Crea la bozza

Clic **Nuovo articolo**, poi compila il pannello a destra.

### 2. Metadati

| Campo | Cosa mettere |
|-------|----------------|
| **slug** | URL dell’articolo, es. `imparare-giapponese-con-manga`. Se vuoto, viene generato dal titolo italiano al salvataggio |
| **Pubblicato** | Spunta solo quando l’articolo deve essere visibile al pubblico. Senza spunta = bozza (solo admin) |
| **Tag** | Almeno uno: Grammatica, Conversazione, Giappone, Anime, Manga, Aggiornamenti |

### 3. Immagine cover

- Campo **Immagine cover** → scegli JPEG, PNG o WebP (**max 2 MB**)
- Upload su Storage: `blog/covers/{postId}/cover.{ext}`
- Anteprima sotto il campo dopo l’upload

**Senza cover:** il sito usa un’immagine di fallback in base al tag (`src/content/blogCoverFallbacks.ts`).

L’upload cover funziona anche prima del primo **Salva**; se manca l’ID Firestore, ne viene creato uno temporaneo (`blog-{timestamp}`).

### 4. Testi IT / EN

Tab **IT** e **EN** separati:

| Campo | Uso |
|-------|-----|
| **Titolo** | Titolo dell’articolo |
| **Excerpt** | Sottotitolo breve (lista blog + meta) |
| **Body Markdown** | Corpo in Markdown |

**Anteprima** mostra il render finale (`BlogMarkdown`).

#### Markdown supportato

- `## Titolo sezione`
- `**grassetto**`, `- elenco`, `1. numerato`
- `> citazione`
- Tabelle GFM: `| col | col |`
- Link: `[testo](https://...)`
- Testo giapponese inline, es. **私は学生です**

Esempi completi: `scripts/seed-blog-posts.mjs`.

### 5. Articoli correlati (opzionale)

**Slug correlati**, separati da virgola — es. `anime-e-particelle-wa-ga, imparare-giapponese-con-manga`.  
Compaiono in «Leggi anche» in fondo all’articolo.

### 6. Salva e pubblica

1. Clic **Salva** → scrittura su Firestore
2. L’articolo compare nella lista a sinistra (`draft` se non pubblicato)

### 7. Verifica

- Lista: `https://lunanihongo.com/#blog`
- Articolo: `https://lunanihongo.com/#blog/{slug}`

In locale: stesso hash su `http://localhost:5173/#blog/{slug}`.

## Immagini: cover vs corpo

| Tipo | Come inserirlo |
|------|----------------|
| **Cover** (card + hero) | Upload dal pannello admin |
| **Nel corpo** | Markdown con URL pubblico: `![descrizione](https://url-immagine.jpg)` — **nessun upload dedicato** nell’editor |

Per immagini inline: host su Storage/CDN/Hostinger e incolla l’URL nel Markdown.

## Checklist prima di pubblicare

- [ ] Titolo + excerpt in IT e EN (o almeno lingua principale)
- [ ] Body Markdown revisionato (usa Anteprima)
- [ ] Tag scelti
- [ ] Cover caricata o fallback accettabile
- [ ] Slug corretto
- [ ] **Pubblicato** spuntato
- [ ] **Salva** cliccato
- [ ] Controllo su `/#blog/{slug}`

## Seed da terminale (solo dev)

```bash
npm run seed:blog
```

Richiede credenziali Firebase Admin. Non usare per articoli editoriali in produzione.

## Riferimenti codice

| File | Ruolo |
|------|--------|
| `src/components/AdminBlogPanel.tsx` | Editor admin |
| `src/services/blogService.ts` | CRUD Firestore |
| `src/services/blogStorageService.ts` | Upload cover |
| `src/types/blog.ts` | Tag, slug, tipi |
| `firestore.rules` | `blogPosts`: scrittura solo super_admin |
| `storage.rules` | `blog/covers`: scrittura solo super_admin |
