# Migration plan — moving off Franklin.jl

**Status:** draft v1, 2026-05-05. Iterate freely.
**Not deployed:** `MIGRATION.md` is added to the `ignore = [...]` list in `config.md`, so Franklin won't generate `/migration/` from it. (`README.md` is ignored by default.)

---

## TL;DR recommendation

For your use case (ocean-modelling scientist; CV timeline figures; bibliography from BibTeX+YAML; talks list with rich metadata; some KaTeX math; minimal blogging), the strongest candidates are:

1. **Quarto** — best fit for a scientist who already lives in the R/Python/Julia ecosystem. Native BibTeX, native KaTeX/MathJax, can run Julia code chunks, growing academic-website ecosystem, very actively maintained by Posit.
2. **Astro** — most flexible for the long term; great DX; would require writing custom components for publications/talks/people; overkill if you don't already like JS/TS tooling.

**Status quo (stay on Franklin)** is also viable for another 1–2 years given the maintenance-mode commitment from `tlienart`. The only real risk is upstream Julia/Bib/YAML packages making breaking changes Franklin can't follow.

---

## What we're moving

The non-trivial pieces in this codebase (see `README.md` for full structure):

| Concern | Today's mechanism | What a migration must reproduce |
|---|---|---|
| Publications list | `data/bibliography.yaml` + `data/mypapers2.bib` → `bib.jl` HFuns | Render a filtered, typed publication list (article, software, thesis, online) from BibTeX, with abstract toggle, DOI, PDF, name highlighting |
| Talks list | `data/talks.yaml` → `talks.jl` HFun | Date-sorted talk records with conference metadata, multiple link types (PDF/Keynote/slides/video/repo/notebook/DOI) |
| Students/teaching | `data/students.yaml` + `data/teaching.yaml` → `teaching.jl` HFuns | Filtered supervision lists; courses |
| People registry | `data/names.yaml` → `names.jl` HFun | Inline person mention → name + ORCID/GitHub/Scholar/etc. icons |
| CV timeline figure | `timeline.jl` (CairoMakie) → `_assets/timeline.svg` | Same — keep as Julia script, target SSG just serves the SVG |
| Math | KaTeX + `\newcommand`s in `config.md` | KaTeX or MathJax config in target |
| Code highlighting | highlight.js | Most SSGs do this natively |
| RSS | Franklin built-in | Native or plugin in target |
| LaTeX-to-HTML chemistry chars | `latex2html.jl` substitutions | Pre-process step, or accept Unicode in source |

---

## Option A — Quarto (recommended starting point)

**Maintainer:** Posit (commercial backer). Active.

### Pros
- **Native BibTeX**: drop a `.bib` file and reference with `@key` — automatic CSL citations; styles via Zenodo CSL pack.
- **Math**: KaTeX/MathJax built-in; supports `\newcommand`.
- **Can execute Julia / R / Python in markdown** (you'd no longer need to run `timeline.jl` separately — Quarto can call it via Jupyter/IJulia or via `engine: julia`).
- **Real academic momentum**: many scientists have migrated to Quarto over the last 2–3 years (Andreas Handel, Drew Dimmery, Nicola Rennie, Silvia Canelón, etc.).
- Built-in **search** across the whole site.
- Fast builds; output is plain HTML/CSS.
- Pandoc under the hood → publishing the same content as PDF/EPUB if ever wanted.

### Cons / unknowns
- The publications page works best as Quarto-native CSL bibliography (good for journal-style lists). For your **typed multi-section** list (article / software / thesis / online / softwarecontribution) you'd either:
  - Use [`produnis/publicationlist`](https://github.com/produnis/publicationlist) or [`mps9506/quarto-cv`](https://github.com/mps9506/quarto-cv)'s lua filter to multiplex multiple `.bib` files; or
  - Write a small pre-render script (Julia — reuse `bib.jl` logic) that emits `_publications.qmd`.
- **Talks/students/courses lists**: no native equivalent. You'd write a pre-render script that ingests your existing `talks.yaml` / `students.yaml` / `teaching.yaml` and emits markdown listings. Fine — and you keep your YAML as the source of truth.
- **The people-mention HFun (`{{person foo}}`)** — Quarto has shortcodes; you'd write a simple Lua filter or a pre-render step to expand them.

### Migration effort estimate
~1–2 weekends. Most time spent reproducing the publication/talk/student renderers as small Julia/Python scripts that emit `.qmd` from your existing YAML.

### Risk
Low. Quarto is the most "future-proof" of the options for an academic.

---

## Option B — Astro

**Maintainer:** Astro core is very actively developed.

### Pros
- **Best authoring DX in 2026** for sites where you want components.
- TypeScript content collections + zod schemas would model your `bibliography.yaml` / `talks.yaml` / `names.yaml` very cleanly with type checking.
- Ships near-zero JS by default; great Lighthouse scores.
- Markdown + MDX for content.

### Cons
- **You'd be writing JS/TS components** for the publication-list, talk-list, person-mention rendering. If you don't already enjoy that, this is friction.
- KaTeX support via remark plugins — fine but one more thing to wire up.
- BibTeX → Astro: no first-class story; you'd parse `.bib` in a Node script (e.g. `@retorquere/bibtex-parser`).

### Migration effort estimate
2–4 weekends if you're new to Astro; 1 weekend if you already know it.

### Risk
Low long-term, but more lines of code to maintain than Quarto.

---

## Option C — Stay on Franklin.jl (or move to Xranklin.jl)

### Pros
- **Zero migration cost.**
- Maintainer (`tlienart`) committed to bugfixes + dep updates → no imminent breakage.
- Your codebase is comfortable in the Julia ecosystem (`Bibliography.jl`, `YAML.jl`, `CairoMakie`).
- All your HFun logic keeps working.
- A successor — **Xranklin.jl** — exists in beta, feature-complete but undocumented. Could be a smaller jump than a full SSG migration when/if needed.

### Cons
- **Bus factor of ~1.** No new features; ecosystem effectively frozen.
- If a major Julia release breaks `Bibliography.jl` or `YAML.jl` in a way Franklin can't quickly absorb, you'd be stuck.
- You won't benefit from improvements in math rendering, search, image optimization, etc. that other SSGs are getting.
- Future contributors / collaborators are far less likely to know Franklin than Quarto/Astro.

### Effort
None — but you do owe yourself a periodic check on whether Xranklin.jl has docs and a migration path.

---

## Decision matrix

| Criterion | Franklin (status quo) | Quarto | Astro |
|---|---|---|---|
| Ecosystem health | At risk | Excellent | Excellent |
| BibTeX bibliography | Custom Julia | First-class | DIY |
| Math (KaTeX + macros) | First-class | First-class | DIY |
| Run Julia at build (timeline) | Native | Native | DIY (call externally) |
| Custom data lists (talks, students) | Custom HFun | Pre-render script + qmd | Component + content collection |
| Migration effort | 0 | Low–medium | Medium–high |
| Long-term maintainability | Low | High | High |
| Future contributor familiarity | Very low | Medium | High |

---

## A concrete migration recipe (if you go with Quarto)

1. Create a sibling `BP_website_Quarto/` directory with `quarto create-project`.
2. Move `index.md`, `contact.md`, `software.md`, `talks.md`, `publications.md` over. Convert `~~~ ... ~~~` raw HTML blocks to fenced ```{=html} blocks.
3. Copy `data/` over verbatim.
4. Copy `_assets/` over (Quarto serves a flat `assets/` or arbitrary dirs).
5. Port `timeline.jl` / `timeline3D.jl` — either keep them as standalone scripts that commit SVGs, or wire them as a `{julia}` chunk in `index.qmd`.
6. Port the **person-mention** HFun: write a Lua filter (or a Julia pre-render script) that reads `data/names.yaml` and replaces `{{person foo}}`/`@person foo` with the same HTML you produce today.
7. Port the **publications** rendering: easiest is a Julia pre-render script that reads `data/bibliography.yaml` + `data/mypapers2.bib` (reusing `bib.jl` logic) and writes `_publications.qmd` with the four sections (article / software / thesis / online).
8. Port the **talks** and **students/courses** rendering: same approach — Julia script reads YAML, emits markdown list to `_talks.qmd` / `_supervision.qmd`.
9. Replace `_layout/pgwrap.html` sidebar with Quarto's `navbar` + `sidebar` config in `_quarto.yml`.
10. Set up GitHub Pages CI: `quarto publish gh-pages` is one line.
11. Run side-by-side for a week, then flip the `briochemc.github.io` repo's main branch.

---

## What to do next

- [ ] Decide whether to spend a weekend on a **Quarto spike** — port just `index.md` + `publications.md` + 1 talk to see how it feels.
- [ ] If Quarto feels good, port the rest.
- [ ] If it doesn't, do the same spike with Astro.
- [ ] If neither feels right, stay on Franklin and revisit in 12 months.

---

## Sources

- Franklin.jl status (Discourse): <https://discourse.julialang.org/t/franklin-jl-project-status-alternatives/129618>
- Quarto for academics — Andreas Handel: <https://www.andreashandel.com/posts/2022-10-01-hugo-to-quarto-migration/>
- Migrating to Quarto — Drew Dimmery: <https://ddimmery.com/posts/quarto-website/>
- Migrating to Quarto — Nicola Rennie: <https://nrennie.rbind.io/blog/hugo-quarto-website/>
- Quarto citations docs: <https://quarto.org/docs/authoring/citations.html>
- `produnis/publicationlist` Quarto extension: <https://github.com/produnis/publicationlist>
- `mps9506/quarto-cv` (multi-bib lua filter): <https://github.com/mps9506/quarto-cv>
