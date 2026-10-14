# Microsoft Store listing — English (United States)

Everything to paste into Partner Center → UOM Converter → Store listing, in the page's order.
Images are in [listing/](listing/), rendered by `npm run store:assets`.

## Description

```
UOM Converter turns the numbers of the electrical trade into each other: wire sizes, conduit, voltage drop, power, prices and unit codes, all in one window.

Pick who you are and where you work. Suppliers, distributors, counter staff, electricians, engineers and PIM / data teams each get the converters they use most, and the region (US, Canada or Europe) sets the default voltages, frequency, units, currency and number format.

Every converter opens on a worked example, so you see what it does before you type anything, and "How it's calculated" shows the formula and its source for every answer. Click any result to copy it, and press Ctrl+F to find a converter.

Wire & conduit
• AWG / kcmil to mm², and mm² to the nearest AWG size, with conductor weight
• Conduit trade sizes to metric designators, with knockout punch sizes

Electrical
• Voltage drop, with the smallest wire that meets your target
• kVA, kW and amps, single- and three-phase
• Power factor correction, transformer fault current, motor speed and slip
• Line-to-neutral voltage, Ohm's law, energy cost

Pricing
• Price per each, per 100 (C) and per 1,000 (M), and E/C/M mix-up checks
• Wire price per foot or metre, list-price multipliers and discount chains, margin and markup
• Boxes and packs, coils and reels

Units and product data
• Length, fractions of an inch, temperature, power, light level, torque, weight, volume
• UN/ECE unit codes, spec values to metric for ETIM, price quantity to unit price, GTIN packaging levels

Conversions are formula-based, not copied tables, and work fully offline. No account, no ads, no tracking.
```

## What's new in this version

Leave blank: this is the first submission.

## Product features

One per line in Partner Center ("Add more" for each):

```
31 converters for wire, conduit, electrical, pricing, units and product data
A view for each role: supplier, distributor, counter staff, electrician, engineer, PIM / data
US, Canada and Europe defaults for voltages, units, currency and number format
Every converter opens on a worked example
The formula and source behind every answer
AWG / kcmil ↔ mm² with conductor weight and the nearest metric size
Voltage drop with the smallest wire that meets your target
Conduit trade sizes, metric designators and knockout punch sizes
Price per E / C / M, multipliers, discounts, margin and markup
Click any result to copy it; Ctrl+F finds a converter
Works offline: no account, no ads, no tracking
```

## Screenshots

Upload in this order (the first is shown first):

1. `listing/screenshot-1-promo.png`
2. `listing/screenshot-2-awg.png`
3. `listing/screenshot-3-voltage-drop.png`
4. `listing/screenshot-4-price-units.png`
5. `listing/screenshot-5-kva-amps.png`
6. `listing/screenshot-6-reels.png`
7. `listing/screenshot-7-uom-codes.png`
8. `listing/screenshot-8-conduit-dark.png`

## Store logos

| Slot | File |
|---|---|
| 9:16 Poster art (1440 × 2160) | `listing/poster-art-1440x2160.png`: the main logo on Windows 10/11 |
| 1:1 Box art (2160 × 2160) | `listing/box-art-2160.png` |
| 1:1 App tile icon (300 × 300) | `listing/store-logo-300.png` |
| 150 × 150, 71 × 71 | Leave empty; the Store takes them from the package. |

## Trailers, Xbox images

Leave empty.

## Supplemental fields

- **Short title:** leave empty.
- **Voice title:** leave empty.
- **Short description** (270 characters or fewer):

  ```
  Wire sizes, conduit, voltage drop, kVA and amps, price units and UOM codes for the electrical trade. Pick your role and region (US, Canada, Europe); every converter opens on a worked example and shows its formula. Works offline.
  ```

## Additional information

- **Keywords** (up to 7, 40 characters each, 21 words in all):

  ```
  unit converter
  AWG to mm2
  voltage drop calculator
  electrical calculator
  conduit size
  UOM codes
  electrician tools
  ```

- **Copyright and trademark info:** `© 2026 chengmarc`
- **Additional license terms:** leave empty.
- **Developed by:** `chengmarc`

## Elsewhere in the submission

- **Properties → Privacy policy URL:** `https://github.com/chengmarc/uom-converter/blob/main/PRIVACY.md`
- **Submission options → runFullTrust:**

  ```
  UOM Converter is a desktop app built with Electron, packaged with the Desktop Bridge. runFullTrust is required for any packaged Win32 desktop app to launch its executable (EntryPoint="Windows.FullTrustApplication"). It is used only to run the app itself. The app does not access the network, does not read or write user files, does not run other programs, and stores nothing beyond its own settings (chosen role, region and window position) in its app data folder.
  ```

- **Submission options → Notes for certification:**

  ```
  No account, sign-in or internet connection is needed. The app opens on a worked example; choose a role (e.g. Electrician) and region (US / Canada / Europe) at the top, then pick a converter from the sidebar. Click any result to copy it.
  ```
