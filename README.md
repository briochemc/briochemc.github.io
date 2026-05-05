# briochemc.github.io — Franklin.jl source

Personal academic website for Benoît Pasquier. Built with [Franklin.jl](https://franklinjl.org/), deployed to GitHub Pages at <https://briochemc.github.io>.

This README is **not deployed** — Franklin ignores `README.md` and `LICENSE.md` at the repo root by default (see `config.md`). It's here to document the structure for future maintenance and possible migration to another static site generator.

---

## How the site is built

`config.md` is the global config (author, RSS, `\newcommand` LaTeX macros, ignore list). Each `.md` file at the root is a top-level page (`index.md` → `/`, `publications.md` → `/publications/`, etc.). Layout is wrapped via `_layout/head.html` + `_layout/pgwrap.html` + `_layout/foot.html`. CI runs `Franklin.optimize()` (which does prerender + minify) and pushes `__site/` to the `gh-pages` branch.

The site uses two custom mechanisms heavily:

1. **HFun callbacks** — Julia functions named `hfun_*` defined in the `.jl` files at the repo root. Franklin invokes them when it sees `{{name args...}}` in markdown or layouts. Example: `publications.md` contains `{{bibliography article}}`, which calls `hfun_bibliography(["article"])` defined in `bib.jl`.
2. **YAML/BibTeX data files** in `data/` — single source of truth for publications, talks, students, courses, and the people/institutes registry. The Julia HFun callbacks read these and emit HTML.

There is **no manual HTML for publication, talk, student, or course lists** — they're all generated from data.

---

## Top-level layout

```
config.md                       Franklin global config + LaTeX \newcommands
index.md                        Home / about page
publications.md                 Calls {{bibliography ...}} HFuns
software.md                     Calls {{bibliography software*}} HFuns
talks.md                        Calls {{talks}} HFun
contact.md                      Static contact info
404.md                          Custom 404
todo.md                         Personal notes (ignored via config.md)

bib.jl                          Bibliography rendering (BibTeX → HTML)
talks.jl                        Talks/posters rendering
teaching.jl                     Students + courses rendering
names.jl                        People/institutes registry + linkify
yaml.jl                         Small HTML helpers (icons, link buttons)
latex2html.jl                   LaTeX → HTML char map (chemistry, isotopes)
timeline.jl, timeline3D.jl      CairoMakie scripts that produce timeline.svg
utils.jl                        Demo HFuns + hfun_projectslist; includes the above

Project.toml, Manifest.toml     Julia env (Franklin, Bibliography, YAML, NodeJS)

_layout/                        HTML templates (head, foot, sidebar wrap, ...)
_css/                           franklin.css + jtd.css + custom liszt.css
_libs/                          Vendored highlight.js + KaTeX
_rss/                           RSS feed templates
_assets/                        Images, favicons, generated SVGs, demo scripts
data/                           YAML + BibTeX data files (see below)
pdfs/                           ~210 MB of CV, slides, papers (checked in)
talks/                          Keynote (.key) presentation source files
projects/                       Empty (referenced by hfun_projectslist for future use)
theses/                         Empty placeholder

.github/workflows/Deploy.yml    GitHub Pages CI
.gitlab-ci.yml                  GitLab Pages CI (alternative; same Franklin.optimize call)
__site/                         Build output (gitignored)
```

---

## The Julia files

All `.jl` files are loaded by Franklin at build time via `utils.jl`, which `include`s the others. Anything named `hfun_X` becomes a `{{X ...}}` callable in markdown/layouts.

### `utils.jl`
Top-level orchestrator. `include`s `yaml.jl`, `names.jl`, `latex2html.jl`, `bib.jl`, `talks.jl`, `teaching.jl`. Defines `hfun_projectslist()` (renders `projects/*.md` sorted by date — currently unused since `projects/` is empty), plus a couple of demo HFuns (`hfun_bar`, `hfun_m1fill`, `lx_baz`).

### `bib.jl`
The largest piece (~510 lines). Reads `data/mypapers2.bib` and `data/bibliography.yaml` via `Bibliography.jl` and `YAML.jl`, normalizes entries, and exposes:
- `hfun_bibliography(types[, file])` — filtered list (article / thesis / online / software / softwareowner / softwarecontribution).
- `hfun_bibentry(key[, file])` — single entry.
- `hfun_cite(params)`, `hfun_nocite(params)`, `hfun_references()` — inline citations + endnotes.

Renders authors (with the user's name highlighted), title (with `latex2html` substitutions for chemistry/isotopes), journal, year, DOI, PDF link, and a collapsible abstract toggle.

### `talks.jl`
Reads `data/talks.yaml`. `hfun_talks(highlights?)` returns a chronological list (or a curated highlight subset). Each item: authors, title, conference/seminar metadata, abstract toggle, and any of {PDF, Keynote, slides, video, repo, notebook, DOI} links.

### `teaching.jl`
Reads `data/teaching.yaml` and `data/students.yaml`. HFuns:
- `hfun_students(types[, file])` — filtered student supervision list (PhD / Master / Bachelor / etc.).
- `hfun_lectures()`, `hfun_exercises()` — courses sorted by date.

Handles ongoing-vs-completed date formatting.

### `names.jl`
Reads `data/names.yaml` (people + institutes with ORCID, GitHub, Twitter, Google Scholar, arXiv, full/short/bib name forms, affiliation). Used everywhere a person or institution is rendered.
- `hfun_person(name, style)` — renders a person, optionally with social-icon footnotes.
- `hfun_institute(name, style)` — renders an institute name/link.

### `yaml.jl`
Tiny helpers used by `bib.jl` / `talks.jl` / `teaching.jl` to render icon links and buttons consistently (`entry_to_html`, `entry_to_list_icon`, `entry_to_list_buttonicon`).

### `latex2html.jl`
A replacement dictionary for chemistry notation (CO₂, PO₄³⁻, δ⁵⁶Fe, etc.) and special characters in titles/abstracts. Applied before HTML emission.

### `timeline.jl` / `timeline3D.jl`
Standalone CairoMakie scripts. Run **manually** to regenerate `_assets/timeline.svg` and `_assets/timeline3D.svg` when CV data changes. Hardcoded list of jobs/positions in the script itself. The SVGs are checked in — CI does **not** rebuild them.

---

## Data files (`data/`)

| File | Contents |
|---|---|
| `bibliography.yaml` (~60 KB) | Publications: keys, authors, title, year, journal, DOI, abstract, PDF path, biblatextype |
| `mypapers2.bib` (~40 KB) | BibTeX source (parsed at build) |
| `mypapers.bib` (~19 KB) | Older BibTeX source |
| `literature.yaml` (~3 KB) | Smaller YAML bibliography (merged at runtime) |
| `talks.yaml` (~52 KB) | Talks/posters with date, authors, conference, abstract, links |
| `names.yaml` (~18 KB) | People + institutes registry |
| `students.yaml` (~9 KB) | Student supervision records |
| `teaching.yaml` (~7 KB) | Course records |

---

## Templates (`_layout/`)

Franklin's `{{...}}` template syntax is used. Conditionals like `{{if hasmath}}`, `{{if hascode}}`, `{{ispage publications}}`.

| File | Role |
|---|---|
| `head.html` | DOCTYPE, meta, conditional KaTeX/highlight.js include, opens `<body>` + sidebar wrapper |
| `pgwrap.html` | Sidebar nav (active-page highlighting), social icons (Scholar, ORCID, GitHub, CV PDF) |
| `foot.html` | Closes wrappers, conditional KaTeX/highlight footer scripts, JS abstract-toggle helper |
| `style.html` | Loads Font Awesome 6.6, Academicons, the three CSS files |
| `head_katex.html` / `foot_katex.html` | KaTeX CSS + auto-render runtime (only when page has math) |
| `head_highlight.html` / `foot_highlight.html` | highlight.js CSS + runtime (only when page has code) |
| `tag.html` | Tag page template (Franklin default) |
| `page_foot.html` | Currently unused in the head→foot chain |

---

## CSS (`_css/`)

- `franklin.css` (~7.7 KB) — Franklin defaults (variables, typography, container/row classes).
- `jtd.css` (~11 KB) — "Just the Docs" style sidebar/nav adapted from a Jekyll theme.
- `liszt.css` (~10 KB) — Custom layer: `.person`, `.bibliography`, `.talks`, `.nav-icons`, etc.

All three are vendored — there's no build step (no Tailwind, no Sass).

---

## RSS (`_rss/`)

`head.xml` + `item.xml` are Franklin's standard RSS templates. RSS is enabled via `generate_rss = true` in `config.md`.

---

## Build / deploy (`.github/workflows/Deploy.yml`)

1. Trigger on push to `main`/`master`.
2. Set up Python 3.8 (only used for the HTML/CSS/JS minifier in `Franklin.optimize()`).
3. Set up latest stable Julia.
4. `Pkg.activate(".") && Pkg.instantiate()`, install `highlight.js` via `NodeJS.jl`, then `Franklin.optimize()`.
5. Push `__site/` to the `gh-pages` branch via `JamesIves/github-pages-deploy-action@releases/v3`.

`.gitlab-ci.yml` is the equivalent for GitLab Pages (julia:1.6 image, css-html-js-minify pip pkg, copies `__site/` → `public/`). Only one CI is needed in practice.

---

## Franklin features in active use

- **KaTeX math** with custom `\newcommand`s in `config.md` (`\R`, `\scal`, `\note`).
- **highlight.js** code highlighting.
- **RSS** generation.
- **HFun callbacks** — heavy use (every list of publications/talks/students is one).
- **Page variables** (`@def title = "..."`, `pagevar(...)`, `locvar(...)`).
- **`Franklin.fd2html(...)`** — used in `bib.jl` / `talks.jl` / `teaching.jl` to convert markdown summaries inside YAML records.
- **Conditional layout inserts** (`{{if hasmath}}`, `{{ispage ...}}`).
- **`\newcommand` macros** defined in `config.md`.

There are no Franklin pre/post-processing hooks, no custom block environments (`env_*`), no user-defined LaTeX commands (`lx_*`) beyond a demo, and no blog/dated-archive features.

---

## Things to know before editing

- **Adding a publication**: add a record to `data/bibliography.yaml` (or a BibTeX entry in `data/mypapers2.bib`) and Franklin picks it up. Set `biblatextype` so it shows under the right section.
- **Adding a talk**: add a YAML record under `data/talks.yaml`. Optional fields: `pdf`, `keynote`, `slides`, `video`, `repo`, `notebook`, `doi`.
- **Adding a person**: add a record to `data/names.yaml` first; then references like `{{person dr-foo}}` will linkify with their ORCID/Scholar/etc.
- **Updating the CV timeline**: edit the hardcoded job list in `timeline.jl` / `timeline3D.jl`, run them locally, commit the regenerated `_assets/timeline*.svg`.
- **Adding a page**: drop a new `.md` at the repo root; reference it from the sidebar in `_layout/pgwrap.html`.
- **Local preview**: `julia --project=. -e 'using Franklin; serve()'`.
- **Ignored from build**: `README.md`, `LICENSE.md` (Franklin defaults) and `node_modules/`, `todo.md` (set in `config.md`).

---

## Migration notes

Franklin.jl is in maintenance mode (only bugfixes / dep bumps). A migration plan + alternative-SSG comparison is being maintained separately — see `MIGRATION.md` if it exists in this branch.

Things that would need to be re-implemented in any target SSG:

- The HFun callbacks in `bib.jl` / `talks.jl` / `teaching.jl` / `names.jl` (publication / talk / student / person rendering from YAML+BibTeX). Rewrite as the target's templating language (Liquid, Nunjucks, Lua filters, Astro components, …) or as a pre-build script that emits markdown.
- The CV-timeline SVG generator (CairoMakie) — easiest to keep as a Julia script that runs locally and commits the SVG (the current arrangement).
- The two-source bibliography (BibTeX + YAML merge) — most SSGs will want one canonical format.
- The custom KaTeX `\newcommand`s in `config.md` — need to be moved into the target's math config.
