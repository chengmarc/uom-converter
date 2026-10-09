# Releasing

How the source tree becomes the three release files: an installer and a portable exe for GitHub
Releases, and an `.appx` for the Microsoft Store. electron-builder builds all three from the
`build` settings in [package.json](../package.json).

← Back to the [README](../README.md).

## Cut a release

1. **Freeze the scope.** Don't mix feature work into the release pass.
2. **Choose the version** (`1.2.0`, say). The git tag `v<version>` is the version of record;
   bump the two places that spell it out to match:
   - `version` in `package.json`: run `npm version <version> --no-git-tag-version`, which also
     updates `package-lock.json`. It sets the Store package version (`<version>.0`).
   - the text in [store/badges/badge-download.svg](../store/badges/badge-download.svg), which
     reads `Download (<version>)` in two places.
3. **Write it up.** Move the entries under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md) into a
   dated `[<version>]` section, and add `docs/release/RELEASE_NOTES_<version>.md`.
4. **Check:**

   ```
   npm test
   npm run typecheck
   ```

5. **Refresh the images** if the app's look, the icon or the screenshots' converters changed:

   ```
   npm run store:assets
   ```

6. **Build:**

   ```
   npm run dist:win     # release/UOM-Converter-setup.exe and release/UOM-Converter-portable.exe
   npm run dist:store   # release/UOM-Converter-<version>.appx
   ```

7. **Try it out.** Install with the setup exe, ideally on a machine that hasn't run the app before:
   - it starts, opens on a worked example, and the title bar shows its backdrop on Windows 11
   - switching role and region updates the sidebar and the examples
   - clicking a result copies it
   - the window reopens where you left it
   - it uninstalls cleanly from Settings → Apps
8. **Commit and tag** once the installer checks out:

   ```
   git add -A
   git commit -m "Release <version>"
   git tag v<version>
   git push origin main v<version>
   ```

9. **Publish** the two exe files to GitHub, with the release notes as the description:

   ```
   gh release create v<version> release/UOM-Converter-setup.exe release/UOM-Converter-portable.exe --title "UOM Converter <version>" --notes-file docs/release/RELEASE_NOTES_<version>.md
   ```

   The README's download badge points at `releases/latest/download/UOM-Converter-setup.exe`, so it
   fetches the new installer as soon as the release is published. That only works while the file
   name has no version in it.
10. **Submit to the Store** (below).

## Microsoft Store

The Store takes the `.appx` and signs it itself, so it needs no code-signing certificate. It
rejects unsigned exe installers, so the exe files are for GitHub only and the `.appx` is never
published there.

1. **One time:** copy the three values under Partner Center → the app → Product identity into
   `build.appx` in `package.json`: `identityName`, `publisher` (`CN=…`) and `publisherDisplayName`.
   Until then they hold placeholders, and the Store rejects a package whose identity doesn't match.
2. **Build** with `npm run dist:store`.
3. **Upload** `release/UOM-Converter-<version>.appx` in a new Partner Center submission. For a
   first submission or new screenshots, upload the images in `store/listing/` in their numbered
   order, and give `PRIVACY.md`'s GitHub address as the privacy policy URL.
4. When asked about the `runFullTrust` capability: it's a desktop app built with Electron.

## Reference

### Release files

| File | Published to |
|---|---|
| `release/UOM-Converter-setup.exe` | GitHub Releases |
| `release/UOM-Converter-portable.exe` | GitHub Releases |
| `release/UOM-Converter-<version>.appx` | Microsoft Store (Partner Center) only |

Everything else electron-builder leaves in `release/` (`win-unpacked/`, `.blockmap` files,
`builder-debug.yml`) is intermediate and isn't published.

### Where the images come from

`npm run store:assets` runs [store/render.cjs](../store/render.cjs), which renders from
`src/web/app-icon.svg` and the built page:

| Output | Used for |
|---|---|
| `src/electron/icon.png` | The window, taskbar and installer icon |
| `store/appx/` | Start, tile and taskbar icons inside the `.appx` |
| `store/listing/` | Partner Center: store logo, box art, the promo (designed in `store/promo.html`) and screenshots |
