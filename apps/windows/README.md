# The Windows app

The converters in a desktop window: an Electron shell (`src/main/`) around its own page
(`src/renderer/`), shipped as an installer on GitHub Releases and as an `.appx` on the Microsoft
Store. It never connects to the internet.

← Back to the [README](../../README.md).

## How-to guides

### Run and build

Commands run from the repo root:

```
npm run windows:dev     # live preview: Vite's dev server in the app's window
npm run windows:start   # build the page and open it in the app
npm run windows:dist    # the installer, apps/windows/release/UOM-Converter-setup.exe
npm run windows:appx    # the Store package, apps/windows/release/UOM-Converter-<version>.appx
```

`windows:dev` reloads on every save to the page; a change to `src/main/` needs the window closed
and the command run again.

### Release

Follow the [release guide](../../docs/RELEASING.md): version, changelog, checks, images, build,
try it out, tag, then GitHub Releases and Partner Center.

### Refresh the icons and Store images

```
npm run windows:assets
```

Builds the page and runs `store/render.cjs`, which redraws every image made from
`@uom/brand`'s `app-icon.svg` and the built page: the window and tile icons, the Store listing
images, and the website's icon and share image in `packages/brand/rendered/`. Look over the
screenshots before committing them. The release guide's
[image table](../../docs/RELEASING.md#where-the-images-come-from) lists every output.

### Change a Store screenshot

Each shot is an entry in `SHOTS` in `store/shots.html`: its caption, and the role, region and
converter it opens on (`query`). `scroll` scrolls the converter so its answer stays inside the
frame. Then refresh the images (above).

### Change the privacy policy

Edit the repo's [PRIVACY.md](../../PRIVACY.md), then run `node apps/windows/store/privacy.cjs`
to write `store/PRIVACY.md`, the plain-text copy pasted into Partner Center.
`store/privacy.test.ts` fails until the two match.

## Explanation

**A real origin, nothing from outside.** `src/main/main.cjs` serves the built page from a private
`app://` scheme, so browser storage and the clipboard behave as they do on the website, and the
page's content security policy (`src/renderer/index.html`) loads nothing from anywhere else. The
renderer is sandboxed with no Node access. Only the app's own pages open in the window: any web
link goes to the default browser.

**Its own page, the shared converters.** The page (`src/renderer/main.ts`) is the desktop layout:
role tabs, a sidebar with search, one converter at a time. Each converter is drawn by
`@uom/ui`'s `converter.ts`, as on the website.

**The frame follows the page.** The title bar's colours in `main.cjs` (`FRAME`) are the page's
`--sunken` and `--text` tokens from `@uom/brand`; `src/main/theme.test.ts` checks they match. On
Windows 11 22H2 and later the frame shows Acrylic through the page's transparent parts.

**What it keeps.** The role and region in the page's storage, and the window's size and position
in `window-state.json`, both in the app's data folder (see [PRIVACY.md](../../PRIVACY.md)).

## Reference

| Path | What it is |
|---|---|
| `src/main/main.cjs` | The Electron shell: window, `app://` scheme, navigation rules, window state |
| `src/renderer/` | The page: `index.html`, `main.ts`, `style.css` |
| `scripts/dev.mjs` | `npm run windows:dev` |
| `packaging/electron-builder.config.cjs` | Installer and `.appx` settings, including the Store identity |
| `packaging/appx/` | The `.appx` tile icons (rendered) |
| `packaging/release-notes.cjs` | A version's changelog section, for the GitHub release |
| `store/render.cjs` | `npm run windows:assets`: every rendered image |
| `store/shots.html`, `store/logo.html` | The designed screenshots, box art and poster art |
| `store/LISTING.md` | Everything Partner Center asks for, ready to paste |
| `store/privacy.cjs`, `store/PRIVACY.md` | The privacy policy as plain text for Partner Center |
| `release/` | Build output (not in git) |
