# UOM converter

Unit-of-measure conversions for the electrical industry, on one page. Pick who you are
(supplier, distributor, counter staff, electrician/contractor, electrical engineer, PIM/data)
to see the converters that role uses, and a region (US, Canada, Europe) for default voltages,
frequency, units, currency and number format. Every converter has worked examples; formulas
and sources sit under "How it's calculated".

```
npm install
npm run dev        # the page, with live reload
npm run build      # static site in dist/
npm test           # unit tests
npm run typecheck
```

Links open a specific view: `?for=engineer&region=eu#vdrop`.

## Windows app

The same page, wrapped in Electron (`electron/main.cjs`). It is served from a private `app://`
scheme, with no Node access in the page, a sandboxed renderer and a content security policy.

```
npm run app        # build the page and open it in the desktop shell
npm run app:dev    # desktop shell on the live dev server (run `npm run dev` first)
npm run dist:win   # release/UOM-Converter-Setup-<version>.exe and a portable .exe
```

Before shipping:

- **Code signing:** the installers are unsigned, so Windows SmartScreen shows "unknown
  publisher". Add a certificate (e.g. Microsoft Trusted Signing) through electron-builder's
  `win.signtoolOptions` or `azureSignOptions`.
- **Identity:** set `author` and a real `build.appId` (reverse domain you own) in `package.json`;
  the appId is fixed once people install the app.
- **Version:** bump `version` in `package.json` for each release; it names the installer.
- **Behind a proxy:** Electron's runtime download ignores `HTTPS_PROXY` unless
  `NODE_USE_ENV_PROXY=1` is set (Node 24).

## Layout

| Path | What it is |
|---|---|
| `src/reference.ts` | The conversions, computed from definitions rather than copied tables: E/C/M pricing and mix-up detection, price per length, discount chains, margin/markup, packs and put-ups, AWG/kcmil ↔ mm², conductor weight and resistance, voltage drop, conduit trade sizes and knockout punches, kVA/kW/amps, line ↔ neutral voltage, Ohm's law, energy cost, power factor correction, motor speed/slip, transformer fault current, fractional inches, and unit factors |
| `src/uom.ts` | UN/ECE Rec 20 unit codes (Rec 21 package codes, X-prefixed) and alias lookup, spec values to metric for ETIM, price quantity to unit price |
| `src/gtin.ts` | GTIN check digits and parsing; builds pack-level GTIN-14s for the Packaging levels converter |
| `web/main.ts` | Every converter: fields, examples, result rows, diagrams |
| `web/audiences.ts` | Who the page serves and which converters each audience sees, in order |
| `web/regions.ts` | US / Canada / Europe defaults |
| `web/ui.ts` | The shared converter layout, number formatting and parsing per region |
| `web/visuals.ts`, `web/icons.ts` | Inline SVG diagrams and line icons |
| `electron/` | Desktop shell and app icon (`web/icon.svg` is the source) |

## Adding things

- **An audience:** add an entry to `web/audiences.ts` (label, description, converter ids in order).
  A startup check fails if an id doesn't exist.
- **A converter:** add it to `web/main.ts` with region-aware examples, put its maths in
  `src/reference.ts` with tests, and list it in the audiences that need it.

Conversions stay formula-based. Code-table lookups (ampacity, conduit fill, motor full-load
amps) are left out on purpose; the one copied table, knockout punch sizes, cites its source.
