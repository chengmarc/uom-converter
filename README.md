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

The maths lives in `src/`: plain TypeScript with no DOM, each tested in a matching file (`conductors.ts` ↔ `conductors.test.ts`). The page lives in `web/`.

| Path | What it is |
|---|---|
| `src/units.ts` | Exact unit factors, temperature, fractions of an inch |
| `src/pricing.ts` | E/C/M price units and mix-up detection, price per length, discount chains, margin/markup, packs and put-ups, price quantity to unit price |
| `src/conductors.ts` | AWG/kcmil ↔ mm², North American building-wire sizes, conductor weight and resistance, voltage drop |
| `src/conduit.ts` | Conduit trade sizes ↔ metric designators, knockout punch sizes |
| `src/electrical.ts` | kVA/kW/amps, line ↔ neutral voltage, Ohm's law, energy cost, power factor correction, motor speed/slip, transformer fault current |
| `src/uom.ts` | UN/ECE Rec 20 unit codes (Rec 21 package codes, X-prefixed) and alias lookup, spec values to metric for ETIM |
| `src/gtin.ts` | GTIN check digits and parsing; builds pack-level GTIN-14s for the Packaging levels converter |
| `src/region.ts` | The `Region` type (US, Canada, Europe) |
| `web/main.ts` | The page: audience and region pickers, sidebar, URL and saved choices |
| `web/converters/` | One file per converter (fields, examples, result rows, diagrams); `index.ts` lists them in display order |
| `web/converters/checks.ts`, `electrical-fields.ts`, `wire.ts` | Input checks, phase/voltage fields, and conductor metal and weight rows shared by several converters |
| `web/ui.ts` | The converter model (fields, rows, examples) and the layout every converter renders with |
| `web/unit-converter.ts` | The simple converter shape: a value and unit in, every other unit out |
| `web/format.ts` | Number formatting, money and parsing per region |
| `web/audiences.ts` | Who the page serves and which converters each audience sees, in order |
| `web/regions.ts` | US / Canada / Europe defaults |
| `web/visuals.ts`, `web/icons.ts` | Inline SVG diagrams and line icons |
| `electron/` | Desktop shell and app icon (`web/icon.svg` is the source) |

## Adding things

- **An audience:** add its id to `AudienceId` and an entry to `web/audiences.ts` (label, description,
  converter ids in order), and an icon in `web/icons.ts`. The typecheck fails without the icon;
  `web/audiences.test.ts` fails if a converter id doesn't exist.
- **A converter:** add a file to `web/converters/` with region-aware examples and list it in
  `web/converters/index.ts`. Put its maths in the matching `src/` file with tests, and list it
  in the audiences that need it. `web/converters/index.test.ts` checks every example sets real fields.

Conversions stay formula-based. Code-table lookups (ampacity, conduit fill, motor full-load
amps) are left out on purpose; the one copied table, knockout punch sizes, cites its source.
