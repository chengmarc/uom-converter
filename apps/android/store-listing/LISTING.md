# Google Play submission — UOM Converter

Every Play Console field for the Android app, in the order Console asks, ready to paste. The
package is `com.chengmarc.uomconverter`; the bundle is built and signed as
[the README](../README.md#build-a-release-for-google-play) says.

← Back to the [Android app's README](../README.md).

## Release

- **Release name:** `<version> (<versionCode>)`, e.g. `1.1.0 (10101)`. Not shown to users.
- **Release notes** (500 characters or fewer per language). For 1.1.0, the first Android release:

  ```
  <en-US>
  First Android release: 31 converters for the electrical trade, for the US, Canada and Europe. Price units (E/C/M), wire sizes (AWG and mm²), voltage drop, conduit, kVA and amps, units and UOM codes, each with its formula and worked examples. Works offline, with no account. Tap any result to copy it.
  </en-US>
  ```

  For later versions: the changelog's section in [docs/CHANGELOG.md](../../../docs/CHANGELOG.md),
  with only what the Android app's users see.

## Store settings

- **App category:** Tools.
- **Tags** (up to 5): Calculator, Measurement, Business, Productivity. No others: "Barcode
  scanner" would mislead (it checks GTINs, it doesn't scan).
- **Contact details:** email (required, shown on the listing); website `https://uom-converter.com/`.

## Main store listing — English (United States)

- **App name** (30 characters or fewer): `UOM Converter`
- **Short description** (80 characters or fewer; no "free" or "best", per the metadata policy):

  ```
  Electrical trade converters: AWG to mm², voltage drop, kVA to amps, price per M
  ```

- **Full description** (4,000 characters or fewer):

  ```
  Convert every number in the electrical trade, from wire sizes to price units, on your phone.

  UOM Converter gives electricians, engineers, counter staff, distributors, suppliers and product data teams the answers they look up every day: what 12 AWG is in mm², whether a run stays within 3 % voltage drop, how many amps a 100 kVA transformer draws, what a price per M comes to each. Pick your region, and every converter uses your voltages, units, currency and number format. The converters you opened last come first, and you can filter the rest by your role or search them.

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
  • Tap any result to copy it.

  Offline, and nothing to sign up for
  No account, no ads and no tracking. Everything works without an internet connection, and nothing you type leaves your phone.

  Requirements
  Android 7.0 or later.

  UOM Converter is open source under the Apache 2.0 license. The same converters are on the web at uom-converter.com and in the Microsoft Store for Windows.
  ```

- **App icon:** [store-listing/icon-512.png](icon-512.png), 512 × 512, from `npm run android:icons`.
- **Feature graphic:** `store-listing/feature-graphic.png`, 1024 × 500.
- **Phone screenshots** (2 to 8, 9:16; at least 4 at 1080 px or more on each side to be eligible
  for promotion): `store-listing/phone/`, in their numbered order.
- **7-inch tablet screenshots** (required for an app that runs on tablets): `store-listing/tablet-7/`.
- **10-inch tablet screenshots:** `store-listing/tablet-10/`.
- **Video:** none.

## App content

- **Privacy policy:** `https://github.com/chengmarc/uom-converter/blob/main/PRIVACY.md`
- **App access:** all functionality is available without special access (no login).
- **Ads:** no, the app contains no ads.
- **Content rating** (IARC questionnaire): category "All other app types" or "Utility,
  productivity, communication or other"; answer no to every content question (violence, sexuality,
  language, controlled substances, gambling, user interaction, sharing location, digital
  purchases).
- **Target audience:** 18 and over. An age group under 13 would bring in the Families policy,
  which a trade tool doesn't need.
- **Data safety:** no user data collected or shared. Settings (role, region, recent converters)
  stay on the phone and are never sent, so they aren't "collected" in Play's sense.
- **News app, government app, financial features, health:** no / none apply.
