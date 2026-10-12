<div align="center">

  <img src="src/web/app-icon.svg" width="180"><br>

  <a href="https://apps.microsoft.com/detail/9PHZQBV736JC"><img src="store/badges/badge-microsoft.svg" height="50"></a>
  <a href="https://github.com/chengmarc/uom-converter/releases/latest/download/UOM-Converter-setup.exe"><img src="store/badges/badge-download.svg" height="50"></a>

  <h1>UOM Converter - Unit Converter for Electrical Industry</h1>

  **[Use it in your browser](https://uom-converter.com/)**

  <img src="store/listing/screenshot-1-promo.png">

</div>

## Screenshots

<img src="store/listing/screenshot-2-awg.png">
<img src="store/listing/screenshot-3-voltage-drop.png">
<img src="store/listing/screenshot-6-reels.png">

## Quick start

```
npm install
npm test           # unit tests
npm run typecheck
```

Links open a specific view: `?for=engineer&region=eu#vdrop`.

## Website

The same page, built with every converter at its own address
(`/voltage-drop-calculator/`, `/awg-to-mm2/`…) so searches can land on it. Each page's title and
description are in `src/web/pages.ts`; `vite.site.config.ts` writes the pages, a sitemap, and an
offline copy for phones.

```
npm run dev            # live-reloading at http://localhost:5173/
npm run build:site     # site/
npm run preview:site   # serve site/ at http://localhost:4173/
```

Every push to `main` publishes it to GitHub Pages (`.github/workflows/pages.yml`), at
<https://uom-converter.com/>. The domain is set in the repo's Settings → Pages, not in a `CNAME`
file, which Pages ignores for Actions deployments. Set `SITE_URL` to build it for another address.

## Windows app (.exe)

The same page, wrapped in Electron (`src/electron/main.cjs`). It is served from a private `app://`
scheme, with no Node access in the page, a sandboxed renderer and a content security policy.

```
npm run app        # build the page and open it in the desktop shell
npm run dist:win   # release/UOM-Converter-setup.exe and UOM-Converter-portable.exe
```

## Microsoft Store (.appx)

The Store build is an MSIX package. Partner Center signs it on submission, so it needs no
certificate of its own.

```
npm run store:assets   # re-render the app icon and store/ from app-icon.svg and the built page
npm run dist:store     # release/UOM-Converter-<version>.appx
```

## Releasing

Releases follow the [release guide](docs/RELEASING.md): the `.exe` files go on GitHub Releases,
the `.appx` to the Microsoft Store. Changes are listed in the [changelog](docs/CHANGELOG.md), and the
app's [privacy policy](PRIVACY.md) covers every edition.
