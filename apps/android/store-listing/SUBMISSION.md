# Google Play submission — UOM Converter

How to fill in a Play Console submission for the Android app, in the order Console asks. What's entered once for the
app is here, to paste. What's entered per language is that language's listing: its text in `localization/<code>.md`,
and its images in `apps/android/dist/<code>/`, made by `npm run android:store` and not kept in git. The package is
`com.chengmarc.uomconverter`; the bundle is built and signed as [the README](../README.md#build-a-release-for-google-play) says.

← Back to the [Android app's README](../README.md).

## Release

- **Release name:** `<version> (<versionCode>)`, e.g. `1.3.0 (10300)`. Not shown to users.
- **Release notes** (500 characters or fewer per language): `What's new in this version` in each file in
  `localization/`, rewritten for each release from the changelog's section in
  [docs/CHANGELOG.md](../../../docs/CHANGELOG.md), with only what the Android app's users see. They go in one box, each
  language in its own tags, with the tags on their own lines:

  ```
  <en-US>
  …
  </en-US>
  <es-ES>
  …
  </es-ES>
  <de-DE>
  …
  </de-DE>
  <fr-FR>
  …
  </fr-FR>
  ```

## Store settings

- **App category:** Tools.
- **Tags** (up to 5): Calculator, Measurement, Business, Productivity. No others: "Barcode
  scanner" would mislead (it checks GTINs, it doesn't scan).
- **Contact details:** email (required, shown on the listing); website `https://uom-converter.com/`.

## Store listings

One per language: en-US, the default, then es-ES, de-DE and fr-FR, added under Manage translations. Play doesn't tie
them to the app's languages, but they're the ones the app offers (`LANGUAGES` in `@uom/i18n`).
A reader in a language with no listing sees the default, or an automated translation. Play's own translation isn't
used: the text comes from `localization/`.

### Text

The fields in `localization/<code>.md`, within Play Console's limits, which
`packages/test/src/android/listing.test.ts` checks:

- **App name** (30 characters or fewer)
- **Short description** (80 characters or fewer)
- **Full description** (4,000 characters or fewer)

No "free", "best", "#1" or "top", and no calls to act like "install now", in the short description or the images: Google
asks store assets to avoid them. Play has no keywords field; search reads the name and the descriptions.

### Graphics

From `apps/android/dist/<code>/`. A language with none shows the default language's.

- **App icon:** `icon-512.png`, 512 × 512. It has no words, so it's the same in every language.
- **Feature graphic:** `feature-graphic.png`, 1024 × 500.
- **Phone screenshots** (2 to 8, 9:16; at least 4 at 1080 px or more on each side to be eligible for promotion):
  `phone-*.png`, in their numbered order. Each has a headline over the app, translated.
- **7-inch tablet screenshots** (at least 4): `tablet7-*.png`.
- **10-inch tablet screenshots** (at least 4): `tablet10-*.png`. Both tablet sets are the app alone, 9:16: Google asks them
  to leave out text that isn't part of the app, since Play can crop it.
- **Video:** none.

## App content

- **Privacy policy:** `https://github.com/chengmarc/uom-converter/blob/main/apps/android/store-listing/PRIVACY.md`
- **App access:** all functionality is available without special access (no login).
- **Ads:** no, the app contains no ads.
- **Content rating** (IARC questionnaire): category "All other app types" or "Utility,
  productivity, communication or other"; answer no to every content question (violence, sexuality,
  language, controlled substances, gambling, user interaction, sharing location, digital
  purchases).
- **Target audience:** 18 and over. An age group under 13 would bring in the Families policy,
  which a trade tool doesn't need.
- **Data safety:** no user data collected or shared. Settings (role, region, language, theme, recent converters)
  stay on the phone and are never sent, so they aren't "collected" in Play's sense.
- **News app, government app, financial features, health:** no / none apply.
