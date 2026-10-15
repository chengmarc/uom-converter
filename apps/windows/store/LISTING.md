# Microsoft Store submission — UOM Converter

Everything to paste into Partner Center → UOM Converter, in the submission's order: Properties, Store listings
(English (United States)), Submission options. Pricing and availability, Age ratings and Packages are filled in Partner
Center by hand. Images are in [listing/](listing/), rendered by `npm run store:assets` (from `apps/windows/`).

## Properties

- **Category:** Utilities & tools. **Subcategory:** none.
- **Privacy policy:** paste [PRIVACY.md](PRIVACY.md) as it is; it's plain text, written for Partner Center's box.
- **Website:** `https://uom-converter.com/`
- **Support contact info:** `https://github.com/chengmarc/uom-converter/issues`
- **System requirements:** leave every row unchecked; the app runs on any PC that runs Windows 10 (1809) or later.
- **Product declarations:** none apply. Leave "This product has been tested to meet accessibility guidelines"
  unchecked unless it has been.

## Store listings — English (United States)

### Description

```
Convert every number in the electrical trade, from wire sizes to price units, in one window.

UOM Converter gives electricians, engineers, counter staff, distributors, suppliers and product data teams the answers they look up every day: what 12 AWG is in mm², whether a run stays within 3 % voltage drop, how many amps a 100 kVA transformer draws, what a price per M comes to each. Pick your role and region, and the converters you use most are the first in the list, with your voltages, units, currency and number format.

Size wire and conduit
• Turn AWG and kcmil into mm², and mm² into the nearest AWG size, with the conductor's weight.
• Turn conduit trade sizes into metric designators, and find the knockout punch for each.

Check a circuit before you build it
• Enter a run and its load to see the voltage drop, and the smallest wire that keeps it within your target.
• Get kVA, kW and amps, single- or three-phase, and size power factor correction.
• Work out transformer fault current, motor speed and slip, line-to-neutral voltage, Ohm's law and energy cost.

Get prices right
• Turn prices per 100 (C) and per 1,000 (M) into the price of one, and back.
• Catch an item loaded in the wrong unit: two prices 10, 100 or 1,000 times apart are flagged.
• Turn wire prices per foot into per metre, apply list-price multipliers and discount chains, and switch between margin and markup.
• Find how many boxes, packs, coils or reels cover what you need.

Clean up product data
• Turn units as a supplier file writes them (EA, ft, box, lbs) into UN/ECE codes for BMEcat, ETIM and e-invoicing.
• Turn spec values into metric for ETIM and price quantities into unit prices, and build pack, case and pallet quantities with their GTIN-14s.
• Convert length, fractions of an inch, temperature, power, light level, torque, weight and box fill volume.

Trust every answer
• Every converter opens on a worked example, so you see what it does before you type anything.
• "How it's calculated" shows the formula and its source behind each answer.
• Click any result to copy it, and press Ctrl+F to find a converter.

Free, offline, and nothing to sign up for
No account, no ads and no tracking. Everything works without an internet connection, and nothing you type leaves your PC.

Requirements
Windows 10 (version 1809) or later, or Windows 11. Laid out for screens of 1366 × 768 or larger.

UOM Converter is open source under the Apache 2.0 license.
```

### What's new in this version

Leave blank while the package is still 1.0.0. For the next version, the changelog's section for it in
[docs/CHANGELOG.md](../../../docs/CHANGELOG.md), with only what the Store edition's users see.

### Product features

One per line in Partner Center ("Add more" for each); each finishes "With this app, you can …":

```
Convert wire sizes: AWG and kcmil to mm² and back, with the nearest size and the conductor's weight
Check voltage drop on a run and find the smallest wire that meets your target
Turn kVA, kW and amps into each other, single- or three-phase
Turn a price per 100 (C) or per 1,000 (M) into the price of one, and back
Catch prices loaded in the wrong unit before they reach a quote
Work out how many boxes, packs, coils or reels to order
Match conduit trade sizes to metric designators and knockout punch sizes
Turn supplier units like EA, ft or box into UN/ECE codes for ETIM and BMEcat
See the converters your role uses first: supplier, distributor, counter, electrician, engineer, PIM
Get US, Canadian or European voltages, units, currency and number format by default
See the formula and source behind every answer
Copy any result with one click, and find a converter with Ctrl+F
Use it offline, with no account, no ads and no tracking
Read and change every line: it's open source under Apache 2.0
```

### Screenshots

Upload in this order (the first is shown first); each names one need, met in the real app:

1. `listing/screenshot-1-promo.png`: every number on the job, converted (12 AWG to mm²)
2. `listing/screenshot-2-voltage-drop.png`: will that wire carry the run? (voltage drop and the smallest wire)
3. `listing/screenshot-3-price-units.png`: price per C or M, to price each
4. `listing/screenshot-4-kva-amps.png`: kVA to amps (Engineer, Europe)
5. `listing/screenshot-5-reels.png`: how many reels for this job (Counter staff, Canada)
6. `listing/screenshot-6-uom-codes.png`: units in a supplier file to UN/ECE codes (PIM / data, Europe)

### Store logos

| Slot | File |
|---|---|
| 9:16 Poster art (1440 × 2160) | `listing/poster-art-1440x2160.png`: the main logo on Windows 10/11 |
| 1:1 Box art (2160 × 2160) | `listing/box-art-2160.png` |
| 1:1 App tile icon (300 × 300) | `listing/store-logo-300.png` |
| 150 × 150, 71 × 71 | Leave empty; the Store takes them from the package. |

### Trailers, Xbox images

Leave empty: there's no trailer, and it isn't an Xbox app.

### Supplemental fields

- **Short title:** leave empty; "UOM Converter" is short already.
- **Voice title:** leave empty, for the same reason.
- **Short description** (270 characters or fewer):

  ```
  Convert every number in the electrical trade: AWG to mm², voltage drop, kVA to amps, price per C and M, conduit and UOM codes. Set for your role and for the US, Canada or Europe, with the formula behind each answer. Works offline, free, no account.
  ```

### Additional information

- **Keywords** (up to 7, 40 characters each, 21 words in all):

  ```
  unit converter
  AWG to mm2
  voltage drop calculator
  electrical calculator
  kVA to amps
  UOM codes
  electrician tools
  ```

- **Copyright and trademark info:** `© 2026 chengmarc`
- **Additional license terms:** `Apache License 2.0: https://github.com/chengmarc/uom-converter/blob/main/LICENSE`
- **Developed by:** `chengmarc`

## Submission options

- **Publishing hold options:** publish as soon as it passes certification. For an update with something to
  announce, hold it and publish on a weekday morning (US Eastern time), when the trade is at work and looking things up.
- **Restricted capabilities → runFullTrust:**

  ```
  UOM Converter is a desktop app built with Electron, packaged with the Desktop Bridge. runFullTrust is required for any packaged Win32 desktop app to launch its executable (EntryPoint="Windows.FullTrustApplication"). It is used only to run the app itself. The app does not access the network, does not read or write user files, does not run other programs, and stores nothing beyond its own settings (the chosen role and region, and the window's size and position) in its app data folder.
  ```

- **Notes for certification:**

  ```
  No account, sign-in or internet connection is needed, and there's nothing to set up. The app opens on a converter with a worked example already filled in and its answer shown. To try another: 1. Click Electrician in the row at the top, and US next to Region. 2. Click Voltage drop in the left sidebar; it shows 5.15 % for 12 AWG over 100 ft at 16 A and 120 V, and 8 AWG as the smallest wire within 3 %. 3. Click any result to copy it, or press Ctrl+F and type "price" to find the price converters. The app runs on any Windows 10 (1809) or later PC; it has no hardware requirements.
  ```
