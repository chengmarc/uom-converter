# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
match the release tags (`v<version>`).

## [Unreleased]

### Added

- voltage drop takes the load's power factor, the raceway and parallel sets
- transformer fault current takes the motor load, and adds what motors feed into a fault
- wire coils and reels take an allowance for terminations
- spec value to metric reads volts, amps, hertz, kVA, kA, lumens, kelvin, mils and M feet
- UOM codes has VA, kA, mV, MW, MWh, kelvin and candela
- wire sizes from 1250 to 2000 kcmil, and 700, 800 and 900 kcmil
- in Europe, the conduit converter gives the typical clearance hole for M16 to M63
- box fill: the box volume conductors and devices need, by the NEC or the CEC. It replaces the
  box fill volume converter and keeps its address
- line and neutral voltage checks a meter reading against the limits for its nominal voltage, and
  gives the legs of a centre-tapped delta, including the high leg
- Ohm's law gives what a resistive load does on another voltage
- the power converter has metric horsepower and tons of cooling
- the length converter takes feet and inches as plans write them, such as 12'-6", and shows them

### Changed

- voltage drop uses AC resistance and reactance, not DC resistance alone: a 500 kcmil feeder
  reads about twice what it did, and a bigger wire no longer appears to cure a drop that
  reactance sets. North American sizes use stranded values
- metric sizes use their IEC 60228 resistance limit, which reads 5-7% higher than nominal area
- voltage drop's size row says it covers voltage drop only, and never suggests a size a circuit
  can't be run in, such as 18 AWG, or 14 AWG in aluminum
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
