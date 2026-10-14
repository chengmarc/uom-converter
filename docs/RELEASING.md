# Releasing

How the source tree becomes the three release files: an installer and a portable exe for GitHub
Releases, and an `.appx` for the Microsoft Store. electron-builder builds all three from
[packaging/electron-builder.config.cjs](../apps/windows/packaging/electron-builder.config.cjs), into `apps/windows/release/`. Commands run from
the repo root.

← Back to the [README](../README.md).

## Cut a release

1. **Freeze the scope.** Don't mix feature work into the release pass.
2. **Choose the version** (`1.2.0`, say). The git tag `v<version>` is the version of record;
   bump `version` in the root `package.json` to match: run `npm version <version> --no-git-tag-version`,
   which also updates `package-lock.json`. It sets the Store package version (`<version>.0`).
3. **Write it up.** Move the entries under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md) into a
   dated `[<version>]` section. That section is also the GitHub release's description (step 9),
   so write it for people downloading the app.
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
   npm run dist:win     # UOM-Converter-setup.exe and UOM-Converter-portable.exe
   npm run dist:store   # UOM-Converter-<version>.appx
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

9. **Publish** the two exe files to GitHub, with the version's CHANGELOG section as the
   description. [packaging/release-notes.cjs](../apps/windows/packaging/release-notes.cjs) copies it to `apps/windows/release/RELEASE_NOTES.md`:

   ```
   node apps/windows/packaging/release-notes.cjs <version>
   gh release create v<version> apps/windows/release/UOM-Converter-setup.exe apps/windows/release/UOM-Converter-portable.exe --title "UOM Converter <version>" --notes-file apps/windows/release/RELEASE_NOTES.md
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
   `appx` in [packaging/electron-builder.config.cjs](../apps/windows/packaging/electron-builder.config.cjs): `identityName`, `publisher` (`CN=…`) and `publisherDisplayName`.
   Until then they hold placeholders, and the Store rejects a package whose identity doesn't match.
2. **Build** with `npm run dist:store`.
3. **Upload** `apps/windows/release/UOM-Converter-<version>.appx` in a new Partner Center
   submission. For a first submission or new screenshots, upload the images in
   `apps/windows/store/listing/` in their numbered order, and give [`PRIVACY.md`](../PRIVACY.md)'s GitHub
   address as the privacy policy URL.
4. When asked about the `runFullTrust` capability: it's a desktop app built with Electron.

## Reference

### Release files

In `apps/windows/release/`:

| File | Published to |
|---|---|
| `UOM-Converter-setup.exe` | GitHub Releases |
| `UOM-Converter-portable.exe` | GitHub Releases |
| `UOM-Converter-<version>.appx` | Microsoft Store (Partner Center) only |
| `RELEASE_NOTES.md` | The GitHub release's description (from `packaging/release-notes.cjs`) |

Everything else electron-builder leaves there (`win-unpacked/`, `.blockmap` files,
`builder-debug.yml`) is intermediate and isn't published.

### Where the images come from

`npm run store:assets` runs [store/render.cjs](../apps/windows/store/render.cjs), which renders from
`packages/brand/public/app-icon.svg` and the built page (paths below are in `apps/windows/`):

| Output | Used for |
|---|---|
| `src/main/icon.png` | The window, taskbar and installer icon |
| `packaging/appx/` | Start, tile and taskbar icons inside the `.appx` |
| `store/listing/` | Partner Center: store logo, box and poster art (designed in `store/logo.html`), the promo (`store/promo.html`) and screenshots |
