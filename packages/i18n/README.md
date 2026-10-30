# @uom/i18n

The apps' text in the reader's language: `t()`, the list of languages, and each language's
translations. The Windows and Android apps offer English, Spanish, German and French. Simplified
Chinese and Japanese are translated but held back. The website stays in English.

← Back to the [README](../../README.md).

## How-to guides

### Add or change text

Write the English where the text belongs. Text a converter or page declares (a `title`, a `label`,
a row's `detail`) needs nothing more: the apps pass it through `t()` as they draw it. Text with a
number or a name in it goes through `t()` where it's built, with placeholders, so a translation can
put them where its language wants them:

```ts
heading: t("{volts} V line-to-line equals", { volts: fmt(n, 2) }),
```

Text in an app's own HTML is marked `data-t`, or `data-t-placeholder`, `data-t-aria-label` and
`data-t-title` for those attributes.

Then run `npm test`: `packages/ui/src/translations.test.ts` lists what each language is missing, and
anything left over. Add those lines to `src/<language>.ts`.

### Offer a held language

Move it from `HELD_LANGUAGES` to `LANGUAGES` in `src/index.ts`, add it to `CATALOGUES` in
`src/catalogues.ts` and list it for the stores (step 4 below). First give its readers a region of
their own, in `packages/converters/src/regions.ts`.

### Add a language

1. **Add it to `LANGUAGES`** in `src/index.ts`, with the name people know it by in that language.
2. **Write `src/<id>.ts`** and add it to `CATALOGUES` in `src/catalogues.ts`. `npm test` lists every
   string it needs.
3. **Add its menus** to `TEXT` in `apps/windows/src/main/menus.cjs`.
4. **List it for the stores:** `appx.languages` and `nsis.installerLanguages` in
   `apps/windows/packaging/electron-builder.config.cjs`, and
   `apps/android/native/app/src/main/res/xml/locales_config.xml`.

## Explanation

**The English is the key.** `t("Voltage drop")` looks the English up in the current catalogue, and
text with no translation shows in English. The source reads as it always did, and an app that
loads no catalogue, like the website, shows exactly what's written.

**Held languages stay complete.** `HELD_LANGUAGES` are checked like the rest, so new text needs them
too, but nothing can reach them: the apps don't list them, a system set to one opens in English,
`?lang=` ignores them, and `CATALOGUES` leaves them out, so they aren't in the apps' bundles.

**Only the apps load catalogues.** `src/catalogues.ts` is imported by `@uom/ui/language`, and only
the Windows and Android apps import that, so the website's bundle has no translations in it.

**Language isn't region.** The region sets units, number formats, voltages and the wiring code; the
language sets the words. Numbers keep the region's format in every language.

**Trade terms are translated for the trade.** E/C/M, AWG and kcmil, the unit symbols and codes, and
standards like NEC stay as they are. `neutral()` in `src/scan.ts` is the list of what needs no
translation.

**Translations are English-keyed files, not a service.** `src/scan.ts` reads the source to find every
string, and the tests check each language against that, including that placeholders match. A test
also runs every converter in Chinese and fails on any English word that gets through, which catches
text built without `t()`.

## Reference

| File | What's in it |
|---|---|
| `src/index.ts` | `t()`, `setCatalogue()`, `LANGUAGES`, `HELD_LANGUAGES`, `Language` |
| `src/catalogues.ts` | `CATALOGUES`: the translations of every language on offer |
| `src/zh.ts`, `ja.ts`, `es.ts`, `de.ts`, `fr.ts` | The translations, English → translated |
| `src/scan.ts` | `messages()`: every string to translate, read from the source. For tests only |
| `../ui/src/language.ts` | `chosenLanguage()`, `chooseLanguage()`, and translating an app's HTML |
| `../ui/src/translations.test.ts` | The checks on every language |
