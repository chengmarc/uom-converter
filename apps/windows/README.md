# The Windows app

The converters in a desktop window: an Electron shell (`shell/`) around its own page
(`src/`), shipped as an installer on GitHub Releases and as an `.appx` on the Microsoft
Store. It never connects to the internet.

← Back to the [README](../../README.md).

## How-to guides

### Run and build

Commands run from the repo root:

```
npm run windows:dev     # live preview: Vite's dev server in the app's window
npm run windows:start   # build the page and open it in the app
npm run windows:dist    # the installer, apps/windows/dist/UOM-Converter-setup.exe
npm run windows:appx    # the Store package, apps/windows/dist/UOM-Converter-<version>.appx
```

`windows:dev` reloads on every save to the page; a change to `shell/` needs the window closed
and the command run again.

### Release

Follow the [release guide](../../docs/RELEASING.md): version, changelog, checks, images, build,
try it out, tag, then GitHub Releases and Partner Center.

### Refresh the icons and Store images

```
npm run windows:assets
```

Builds the page and runs `promo/generator/render.cjs`, which redraws every image made from
`@uom/brand`'s `app-icon.svg` and the built page: the window and tile icons, the Store listing
images in every language, the README's screenshots, and the website's icon and share image in
`packages/brand/rendered/`. Look over the screenshots in `promo/out/store/microsoft-store/<language>/` before
uploading them. The release guide's
[image table](../../docs/RELEASING.md#where-the-images-come-from) lists every output.

### Change a Store screenshot

Each shot is an entry in `SHOTS` in `promo/generator/shots.html`: the role, region and
converter it opens on (`query`). `scrollTo` scrolls that part of the converter to the top, so its
answer stays inside the frame. Its words are in `promo/generator/captions.js`, one set per language, and a
language's `region` replaces the shot's own. Then refresh the images (above).

### Change the Store listing

Edit every language's file in `promo/listing/localization/`, which holds the text entered per
language, and `promo/generator/captions.js` if the images make the same claim.
`promo/listing/SUBMISSION.md` holds what's entered once. `npm test` checks every language against
Partner Center's limits.

### Change the privacy policy

Edit [promo/listing/PRIVACY.md](promo/listing/PRIVACY.md), the plain text pasted into Partner Center.
The website and the Android app keep their own.

## Explanation

**A real origin, nothing from outside.** `shell/main.cjs` serves the built page from a private
`app://` scheme, so browser storage and the clipboard behave as they do on the website, and the
page's content security policy (`src/index.html`) loads nothing from anywhere else. The
renderer is sandboxed with no Node access. Only the app's own pages open in the window: any web
link goes to the default browser.

**Its own page, the shared converters.** The page (`src/main.ts`) is the desktop layout:
role tabs, a sidebar with search, one converter at a time, and a Settings dialog for the language
and region. Each converter is drawn by
`@uom/ui`'s `converter.ts`, as on the website.

**The frame follows the page.** The title bar's colours in `main.cjs` (`FRAME`) are the page's
`--sunken` and `--text` tokens from `@uom/brand`; `packages/test/src/windows/theme.test.ts` checks they match. On
Windows 11 22H2 and later the frame shows Acrylic through the page's transparent parts.

**What it keeps.** The role, region and language in the page's storage, and the window's size and position
in `window-state.json`, both in the app's data folder (see [PRIVACY.md](promo/listing/PRIVACY.md)).

## Reference

| Path | What it is |
|---|---|
| `shell/main.cjs` | The Electron shell: window, `app://` scheme, navigation rules, window state |
| `src/` | The page: `index.html`, `main.ts`, `style.css` |
| `scripts/dev.mjs` | `npm run windows:dev` |
| `packaging/electron-builder.config.cjs` | Installer and `.appx` settings, including the Store identity |
| `build/packaging/appx/` | The `.appx` tile icons, rendered by `npm run windows:appx`. Not in git |
| `packaging/release-notes.cjs` | A version's changelog section, for the GitHub release |
| `promo/generator/render.cjs` | `npm run windows:assets`: every rendered image |
| `promo/generator/shots.html`, `promo/generator/logo.html` | The designed screenshots, box art and poster art |
| `promo/generator/captions.js` | The words on those images, per language |
| `promo/listing/SUBMISSION.md` | How to fill in Partner Center, and what's entered once |
| `promo/listing/localization/` | Each language's Store listing text |
| `promo/listing/PRIVACY.md` | The privacy policy as plain text for Partner Center |
| `dist/` | What ships: the installer, the `.appx` and the release notes (not in git) |
| `build/` | Intermediates, safe to delete: the built page (`web/`), electron-builder's full output, store screenshot captures (not in git) |
