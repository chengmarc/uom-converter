# The website

<https://uom-converter.com/>: every converter at its own address (`/voltage-drop-calculator`,
`/awg-to-mm2`…) so a search can land on it, a page per topic listing its converters (`/electrical`,
`/units`…), and a home page. Static files on Cloudflare; the converters run in the browser.

← Back to the [README](../../README.md).

## How-to guides

### Preview, build and deploy

Commands run from the repo root:

```
npm run web:dev       # live-reloading at http://localhost:5173/
npm run web:build     # the site, into apps/web/dist/
npm run web:check     # check the built pages as search engines and link previews read them
npm run web:preview   # serve apps/web/dist/ at http://localhost:4173/
npm run web:deploy    # build and deploy to Cloudflare (needs `npx wrangler login` once)
```

Pushing to `main` deploys it too: Cloudflare's Git integration builds and publishes every push.
`.github/workflows/checks.yml` runs the tests, the build and `web:check` on GitHub, and doesn't
deploy.

### Change a page's title or description

Edit its entry in `src/pages.ts`: `PAGES` by converter id, `TOPIC_PAGES` by topic, `HOME`. Titles
are at most 60 characters and descriptions at most 160, so search results show them whole
(`src/pages.test.ts` checks). The slug is the page's address: changing it breaks links to the old
one.

### Build it for another address

Set `SITE_URL` (default `https://uom-converter.com/`) when building. Its path becomes the base
for every link, e.g. `SITE_URL=https://example.com/uom-converter/ npm run web:build`.

### Change the icon or the share image

They're `@uom/brand`'s `icon-256.png` and `share.png`, drawn by the Windows app's
`apps/windows/store/render.cjs` (`npm run windows:assets`), and published as `icon-256.png` and
`og.png`.

## Explanation

**One page, drawn twice.** `src/main.ts` draws every page in the browser and moves between them
without reloading. The build runs that same script in happy-dom (`generate/prerender.ts`) to
write each page's HTML with its content already in it, so search engines and people without
scripts get the converter, its worked examples and its links; in the browser the script then
draws the page again, live.

**`src/pages.ts` is where addresses come from.** The sitemap, `_redirects`, each page's canonical
address, share tags and structured data, and `llms.txt` are all made from it, so a page's
address is written once.

**Settings in the address.** The role and region ride along in the query string
(`?for=engineer&region=eu`), so a shared link opens the same way.

**Offline.** `sw.js` keeps the converters' pages and files for use without a connection, and leaves
pictures to be cached as they're shown.

## Reference

What the build writes, and which `generate/` module writes it: the header of
[vite.config.ts](vite.config.ts).

| Path | What it is |
|---|---|
| `src/main.ts`, `src/style.css`, `src/index.html` | The page: header, home, converter and topic pages |
| `src/pages.ts` | Every page's address, title and description |
| `src/site.ts` | The site's name, the Store link, and turning on the offline copy |
| `generate/` | Build-time output: prerendered pages, heads, sitemap, `llms.txt`, offline files, Cloudflare rules |
| `scripts/check-pages.mjs` | `npm run web:check` |
| `wrangler.jsonc` | How Cloudflare serves `dist/`: static files, no Worker code |
