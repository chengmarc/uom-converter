# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
match the release tags (`v<version>`).

## [Unreleased]

### Changed

- the website's home page opens on a strip of photos with no captions or links, the category bar being the way to
  a topic, then the Windows app card
- the Windows app card has a button to download the installer, and sits at the top of the side menu
- topic and converter pages open on the photo alone, was a tinted band with the title and breadcrumb on it
- the website's breadcrumb runs Converters, topic, converter on every page, ending on the page shown
- the website's header and footer have the same small links: Home, Privacy, Source code, Report a problem
- the website's footer lists the Android app, which goes to the Windows app until it's on Google Play
- the website's background is grey with diagonal stripes and the page lifted off it, was a photo under a navy wash
- the Android app's Google Play listing is in Spanish, German and French as well as English: one file per
  language in `store-listing/localization/`, and what's entered once in `store-listing/SUBMISSION.md`, was
  `store-listing/LISTING.md`
- the Google Play images and icon are rendered per language into `dist/<language>/`, was tracked in `store-listing/`
- the Android app's tablet screenshots are the app alone at 9:16, as Google asks, was a caption over a framed tablet
- the Windows app's shell is in `shell/` and its page directly in `src/`, as in the Android app, was
  `src/main/` and `src/renderer/`
- the `.appx`'s tile icons are rendered into `build/packaging/appx/` by `npm run windows:appx`, was tracked in
  `packaging/appx/`
- the Windows app's theme setting is a row of buttons, like the region's, was a dropdown
- the Windows app's Store listing is in Spanish, German and French as well as English: one file per
  language in `store-listing/localization/`, and what's entered once in `store-listing/SUBMISSION.md`,
  was `store-listing/LISTING.md`
- the Windows Store images are rendered per language into `dist/<language>/`, was tracked
  in `store-listing/`. Git keeps only the README's screenshots, in `docs/screenshots/`

### Fixed

- the Windows Store screenshots show the app at its real size. Rendering them after the Android images
  left the app at half size

## [1.3.0] - 2026-10-31

### Added

- conductor ampacity: the NEC and CEC tables, derated for heat and bundling, and held to the terminals
- motor full-load amps: horsepower to table current, with the wire, breaker, fuses and overload setting
- conduit fill: the smallest EMT for a mix of wires, or how full a size would be
- box fill: the box volume conductors and devices need, by the NEC or the CEC. It replaces the
  box fill volume converter
- metal surcharge: what a copper or aluminum move adds to wire
- fault current down a run, by the point-to-point method, against the equipment's rating
- transformer sizing, generator and UPS sizing, house service size, lighting layout, EV charger circuit and PV string voltage
- the Windows and Android apps have a theme setting: system, light or dark
- gentle motion: a converter eases in as it opens, a picked example's answer lands piece by piece,
  and buttons respond to a press. Nothing moves while you type, and it all follows the system's
  reduced-motion setting
- voltage drop takes the load's power factor, the raceway and parallel sets
- transformer fault current takes the motor load, and adds what motors feed into a fault
- wire coils and reels take an allowance for terminations
- spec value to metric reads volts, amps, hertz, kVA, kA, lumens, kelvin, mils and M feet
- UOM codes has VA, kA, mV, MW, MWh, kelvin and candela
- wire sizes from 1250 to 2000 kcmil, and 700, 800 and 900 kcmil
- in Europe, the conduit converter gives the typical clearance hole for M16 to M63
- line and neutral voltage checks a meter reading against the limits for its nominal voltage, and
  gives the legs of a centre-tapped delta, including the high leg
- Ohm's law gives what a resistive load does on another voltage
- the power converter has metric horsepower and tons of cooling
- the length converter takes feet and inches as plans write them, such as 12'-6", and shows them
- estimator and inspector roles, each with the converters that role uses first
- power factor correction gives the capacitor to buy for one rated at another voltage

### Changed

- each converter's web address now sits under its topic, such as
  /wire-and-conduit/voltage-drop-calculator. The old addresses redirect permanently
- seven topics in one order on every app: Power & loads, Wire & conduit, Equipment, Lighting, EV &
  solar, Pricing & ordering, Units and Product data. Voltage drop moves to Wire & conduit and metal
  price to Pricing & ordering. The website's electrical page moves to power-and-loads, and its old
  address redirects there
- the Windows app opens at 1400 × 860, which is also its smallest size, or the size of the screen if that's smaller
- the photo behind a converter in the Windows app is a little stronger
- voltage drop uses AC resistance and reactance, not DC resistance alone: a 500 kcmil feeder
  reads about twice what it did, and a bigger wire no longer appears to cure a drop that
  reactance sets. North American sizes use stranded values
- metric sizes use their IEC 60228 resistance limit, which reads 5-7% higher than nominal area
- voltage drop's size for AWG and kcmil also has to carry the load, and never one a circuit can't
  be run in, such as 18 AWG, or 14 AWG in aluminum. Metric sizes are marked as voltage drop only
- in Canada, a drop over 3% is shown as over the limit, as CEC Rule 8-102 sets it
- transformer fault current leads with a worst case that allows for the 10% impedance tolerance.
  On single-phase it also gives line-to-neutral at a centre-tapped secondary
- kVA, kW and amps asks for the power factor when starting from kW, where it used to assume 1
- wire size conversions lead with the smallest size at least as big, since the nearest can be smaller
- the UOM mix-up check also looks for ft/m, lb/kg, dozens and boxes, and allows for a real price
  gap on top of a power of ten
- Ohm's law shows values under 1 in mA and mW
- a motor's speed on the other frequency keeps the same r/min below synchronous

### Fixed

- long labels on choice buttons wrap instead of being cut off, and the captions under the mm² to
  AWG cross-sections no longer run into each other
- wire coils and reels count whole pulls: three 300 ft pulls need three 500 ft spools, not two
- line and neutral voltage names a standard system only for the side measured, so 400 V
  line-to-neutral is no longer shown as 230/400 V
- "lm" is read as lumen, not linear metre
- in Europe, the conduit converter no longer treats M16 and M63 as trade sizes 1/2" and 2-1/2"
- in Europe, a decimal comma works in discount chains, spec values and conduit sizes
- power factor correction shows line current only for a voltage you entered
- a motor slip too high for an induction motor is flagged
- "10 M" in spec values is refused, where it was read as metres though M means thousand in pricing
- "0 kcmil" is refused

## [1.2.0] - 2026-10-31

### Added

- the Android app, in closed testing on Google Play: every converter on its own touch screen,
  offline and with no account
- the Windows and Android apps in Spanish, German and French: they open in the system's language, and Settings changes it. The language is separate from the region, which still sets units, number formats
  and voltages

### Changed

- the Windows app's regions each show their wiring code and frequency, not only on hover

### Fixed

- in the US and Canada, a number with a comma that doesn't separate thousands, such as
  "7,4", is an error instead of being read as 74

## [1.1.0] - 2026-10-20

### Added

- a table of common values on the length, weight, temperature, power, light level, torque,
  box fill volume and metal price converters: each value in every unit, with the row for the
  value you entered highlighted
- the website, at https://uom-converter.com/: every converter at its own address with
  its own title and description, a sitemap, and an offline copy once visited

### Fixed

- the E/C/M price heading reads "per 1,000 (M)" instead of "per 1,000 (m)", which looked
  like metres

### Removed

- the portable exe: GitHub Releases has the installer only

## [1.0.0] - 2026-10-10

First release.

### Added

- 31 converters in five topics: pricing, wire & conduit, electrical, units, and product data
- a view for each role (supplier, distributor, counter staff, electrician, engineer, PIM / data)
  showing the converters it uses most, plus Everything
- US, Canada and Europe regions, setting default voltages, frequency, units, currency and
  number format
- a worked example filled in on every converter, more examples one click away, and the formula
  behind each answer under "How it's calculated"
- click any result to copy it; Ctrl+F searches the converters
- Windows app with a Windows 11 Acrylic frame, as an installer, a portable exe, and a Microsoft
  Store package
