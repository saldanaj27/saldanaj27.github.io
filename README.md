# javiersaldana site

Personal site for Javier Saldana. Astro static site, deployed to GitHub Pages
via GitHub Actions on every push to `main`.

## Commands

- `npm run dev` — local dev server
- `npm run build` — build to `dist/` and run the confidentiality scrub gate
- `npm run preview` — preview the built site

## Content rules

- Site content is **hand-authored** and maintained independently. It is derived
  from private source notes but never generated or synced from them. Do not
  paste raw source material into this repo.
- Every page derived from professional work was scrubbed for internal
  identifiers before publishing. `scripts/scrub-check.sh` greps the built
  output for a blocklist and fails the build on any hit; it runs in CI on every
  deploy. If you add content about professional work, keep it at the pattern
  level: public tooling names and public resume metrics only.
- Voice: first person, past tense, concrete numbers, trade-offs stated. No
  em-dashes.

## Resume

`public/Javier_Saldana_Resume.pdf` and `src/pages/resume.astro` mirror each
other. When the resume changes, update both together.
