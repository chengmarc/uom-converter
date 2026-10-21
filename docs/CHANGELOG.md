# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
match the release tags (`v<version>`).

## [Unreleased]

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
