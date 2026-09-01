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
  identifiers before publishing. `scripts/scrub-check.sh` enforces two gates on
  every build and in CI:
  1. **Blocklist.** Internal service names, infra identifiers, vendor names,
     colleagues, and ticket IDs must not appear anywhere in the built output.
  2. **Attribution.** Write-ups under `src/content/writing/` must not name the
     employer at all. Work pages and the resume name FICO deliberately, because
     they describe a job. Write-ups describe architecture and failure modes, and
     attributing those to a named employer publishes that employer's engineering
     design. Keep write-ups at the pattern level; the work pages carry the
     named, attributed proof.

  If you add content about professional work, keep it at the pattern level:
  public tooling names and public resume metrics only. Never publish a specific
  production failure, incident, or outage, attributed or not.
- Voice: first person, past tense, concrete numbers, trade-offs stated. No
  em-dashes.

## Resume

`public/Javier_Saldana_Resume.pdf` is the only resume artifact on the site. It
mirrors the canonical section of `career/resume/resume_master.md`; when the
resume changes, update both together. There is deliberately no HTML resume
page: the work pages carry the substance and the PDF is linked from the home
page and About. `src/pages/resume.astro` is a compatibility redirect only, kept
so older links to `/resume/` reach the PDF instead of a 404. It is `noindex`
and excluded from the sitemap.

## RSS

`src/pages/writing/rss.xml.js` publishes a feed at `/writing/rss.xml`, and
`Base.astro` advertises it via `<link rel="alternate">` so feed readers
auto-discover it. There is no visible RSS link in the UI on purpose: clicking
it shows raw XML to the majority of visitors who do not use a feed reader.
