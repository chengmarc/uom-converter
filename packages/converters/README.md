# @uom/converters

Each converter as data: its fields, worked examples, and a compute function that turns the inputs
into labelled result rows. Also the regions and the region-aware number formats every converter
reads and shows numbers with. Every app draws converters its own way; nothing here touches a page.

← Back to the [README](../../README.md).

## How-to guides

### Add a converter

1. **Write `src/<name>.ts`**, exporting a `Converter` (`src/model.ts`).
   - A value in one unit shown in every other unit is one `unitConverter()` call: see `weight.ts`.
   - Anything else is a `Converter` with `fields`, `examples` and `compute`: see `mixup.ts`. Check
     inputs with `invalid()` (`checks.ts`), and format every number through `format.ts`.
   - Put the formula in `@uom/core` (with its tests) and keep the converter to fields, labels and
     judgments.
2. **Add it to `TOOLS`** in `src/index.ts`. Its position is its place in every list, and the
   Everything view orders topics by their first converter.
3. **Give it a page on the website:** an entry in `PAGES` in `apps/web/src/pages.ts`, with a slug,
   a title of at most 60 characters and a description of at most 160.
   `apps/web/src/pages.test.ts` fails until it has one.
4. **List it for the audiences that use it** in `packages/ui/src/audiences.ts`. A converter that no
   audience lists appears only under Everything.
5. **Run `npm test`.** `src/index.test.ts` works out every example in every region. If the
   converter makes a judgment of its own (a good/warn/bad status, a refusal), add a test for that
   rule there, named after it.
6. **Note it** under `[Unreleased]` in [docs/CHANGELOG.md](../../docs/CHANGELOG.md).

The apps' sidebars, search, the website's sitemap and `llms.txt` all pick it up from `TOOLS`.

### Add a topic

Add it to `Topic` in `src/model.ts`; TypeScript then asks for the rest, each a `Record<Topic, …>`:

- its icon: `TOPICS` in `packages/ui/src/icons.ts`
- its photos: `TOPIC_SLOTS` in `packages/ui/src/photos.ts`, cut by `packages/brand/photos.mjs`
  (`packages/ui/src/photos.test.ts` checks the files are there)
- its page: `TOPIC_PAGES` in `apps/web/src/pages.ts`

### Check a change

```
npm test
npm run typecheck
```

## Explanation

**No page.** Converters run in Node with no DOM, as the tests run them, so every app can use the
same ones. `@uom/ui`'s `converter.ts` draws them as HTML for all three apps. Diagrams
(`visual.ts`) and reference tables are described as data for the same reason; each app styles
them its own way.

**Maths in `@uom/core`, everything else here.** Core has the formulas and standards tables, tested
against published values. A converter adds what a person sees: which fields, which examples, how
the answer is labelled, and judgments such as voltage drop's good/warn/bad.

**Inputs through `Values`.** `compute` reads inputs only through `Values` (`str`, `num`), so it
never sees a form. Each app backs it with its own form, and `exampleValues()` backs it with an
example's settings and no page at all: the tests and the website's worked examples use that.

**One number style at a time.** The app calls `setNumberStyle()` with the region's style before
drawing, and everything formats and parses through `format.ts`. That's module state, so a test
that reads or shows numbers sets the style first (`output()` in `src/index.test.ts`). Labels,
examples and defaults can be `Dyn` (worked out when drawn) so their numbers come out in the
region's format.

**What a field holds.** `parseNumber` returns `undefined` for an empty field (no answer yet, no
error) and `NaN` for anything it can't read, which the converter reports as an error on that
field. Where the decimal mark is a dot, a comma must separate thousands: "7,4" is an error, not
74.

## Reference

| File | What's in it |
|---|---|
| `src/index.ts` | `TOOLS` (every converter, in display order), `byId`, `TOPICS` |
| `src/model.ts` | `Converter`, `Field`, `Output`, `Row`, `Table`, `Values`, `Dyn`; `exampleValues()`, `fieldNumber()`, `byRegion()` |
| `src/format.ts` | The number style; `fmt`, `plain`, `typed`, `money`, `amount`, `moneyAmount`; `parseNumber` |
| `src/regions.ts` | `REGIONS`: each region's number style, wiring code, voltages and defaults |
| `src/visual.ts` | The diagram kinds and their constructors; `Status` |
| `src/unit-converter.ts` | `unitConverter()` and `linear()`, for value-and-unit converters |
| `src/electrical-fields.ts`, `src/wire.ts` | Fields and rows shared by the supply and conductor converters |
| `src/checks.ts` | `isNum()`, `invalid()` |

The package's entry points, as its `package.json` exports them: `@uom/converters` (`index.ts`),
`/model`, `/format`, `/regions` and `/visual`. The converter files themselves are internal.
