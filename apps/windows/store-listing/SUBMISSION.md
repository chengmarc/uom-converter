# Microsoft Store submission — UOM Converter

How to fill in a Partner Center submission for UOM Converter, in its order: Properties, Store listings, Submission
options. What's entered once for the product or the submission is here, to paste. What's entered per language is that
language's Store listing: its text in `localization/<code>.md`, and its images in `apps/windows/dist/<code>/`.
Pricing and availability, Age ratings and Packages are filled in Partner Center by hand. The images are made by
`npm run windows:assets`, and only the README's screenshots, in `docs/screenshots/`, are kept in git.

## Properties

- **Category:** Utilities & tools. **Subcategory:** none.
- **Privacy policy:** paste [PRIVACY.md](PRIVACY.md) as it is: it's plain text for Partner Center's box.
- **Website:** `https://uom-converter.com/`
- **Support contact info:** `https://github.com/chengmarc/uom-converter/issues`
- **System requirements:** leave every row unchecked; the app runs on any PC that runs Windows 10 (1809) or later.
- **Product declarations:** none apply. Leave "This product has been tested to meet accessibility guidelines"
  unchecked unless it has been.

## Store listings

One per language: en-us, es-es, de-de and fr-fr, the languages in the package (`appx.languages` in
[electron-builder.config.cjs](../packaging/electron-builder.config.cjs)). Each language in the package needs a listing,
or removing under Add/remove languages. Each is filled in the same way.

### Text

The fields in `localization/<code>.md`, within Partner Center's limits, which `packages/test/src/windows/listing.test.ts` checks:

- **Description**
- **What's new in this version** (1500 characters or fewer): rewrite this for each submission, in every file, from the
  changelog's section for that version in [docs/CHANGELOG.md](../../../docs/CHANGELOG.md), with only what the Store
  edition's users see.
- **Product features:** one per line in Partner Center ("Add more" for each). Each finishes "With this app, you can …".
- **Short description** (270 characters or fewer), under Supplemental fields.
- **Keywords** (up to 7, 40 characters each, 21 words in all), under Additional information.
- **Copyright and trademark info**, **Additional license terms** and **Developed by**, under Additional information:
  the same in every language.

### Screenshots

From `apps/windows/dist/<code>/`, in this order (the first is shown first). Each names one need, met in
the real app in that language. Spanish, German and French are taken in the Europe region, so those readers see their own
voltages and number formats.

1. `screenshot-1-promo.png`: every number on the job, converted (12 AWG to mm²)
2. `screenshot-2-voltage-drop.png`: will that wire carry the run? (voltage drop and the smallest wire)
3. `screenshot-3-price-units.png`: price per C or M, to price each
4. `screenshot-4-kva-amps.png`: kVA to amps (Engineer, Europe)
5. `screenshot-5-reels.png`: how many reels for this job (Counter staff, Canada, or Europe)
6. `screenshot-6-uom-codes.png`: units in a supplier file to UN/ECE codes (product data, Europe)

### Store logos

From `apps/windows/dist/<code>/`. The tile has no words, so it's the same in every language.

| Slot | File |
|---|---|
| 9:16 Poster art (1440 × 2160) | `poster-art-1440x2160.png`: the main logo on Windows 10/11 |
| 1:1 Box art (2160 × 2160) | `box-art-2160.png` |
| 1:1 App tile icon (300 × 300) | `store-logo-300.png` |
| 150 × 150, 71 × 71 | Leave empty; the Store takes them from the package. |

### Trailers, Xbox images

Leave empty: there's no trailer, and it isn't an Xbox app.

### Supplemental fields

- **Short title:** leave empty; "UOM Converter" is short already.
- **Voice title:** leave empty, for the same reason.

### Filling them in

Export listing and Import listings in Partner Center take all the languages at once, as a `.csv` and a folder. Its
`default` column fills any language left blank, so the shared fields only need entering there.

## Submission options

- **Publishing hold options:** publish as soon as it passes certification. For an update with something to
  announce, hold it and publish on a weekday morning (US Eastern time), when the trade is at work and looking things up.
- **Restricted capabilities → runFullTrust:**

  ```
  UOM Converter is a desktop app built with Electron, packaged with the Desktop Bridge. runFullTrust is required for any packaged Win32 desktop app to launch its executable (EntryPoint="Windows.FullTrustApplication"). It is used only to run the app itself. The app does not access the network, does not read or write user files, does not run other programs, and stores nothing beyond its own settings (the chosen role, region, language and theme, and the window's size and position) in its app data folder.
  ```

- **Notes for certification:**

  ```
  No account, sign-in or internet connection is needed, and there's nothing to set up. The app opens on a converter with a worked example already filled in and its answer shown. To try another: 1. Click Electrician in the row at the top, and US next to Region. 2. Click Voltage drop in the left sidebar; it shows 5.15 % for 12 AWG over 100 ft at 16 A and 120 V, and 8 AWG as the smallest wire within 3 %. 3. Click any result to copy it, or press Ctrl+F and type "price" to find the price converters. The app runs on any Windows 10 (1809) or later PC; it has no hardware requirements.
  ```
