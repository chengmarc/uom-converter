# Releasing

How the source tree becomes the two release files: an installer for GitHub Releases, and an
`.appx` for the Microsoft Store. electron-builder builds both from
[packaging/electron-builder.config.cjs](../apps/windows/packaging/electron-builder.config.cjs), into `apps/windows/dist/`. Commands run from
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

5. **Refresh the images** if the app's look, the icon or the screenshots' converters changed. This
   also re-renders the website's icon and share image (below), which go live with its next deploy:

   ```
   npm run windows:assets
   ```

6. **Build:**

   ```
   npm run windows:dist   # UOM-Converter-setup.exe
   npm run windows:appx   # UOM-Converter-<version>.appx
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

9. **Publish** the installer to GitHub, with the version's CHANGELOG section as the
   description. [packaging/release-notes.cjs](../apps/windows/packaging/release-notes.cjs) copies it to `apps/windows/dist/RELEASE_NOTES.md`:

   ```
   node apps/windows/packaging/release-notes.cjs <version>
   gh release create v<version> apps/windows/dist/UOM-Converter-setup.exe --title "UOM Converter <version>" --notes-file apps/windows/dist/RELEASE_NOTES.md
   ```

   The README's download badge points at `releases/latest/download/UOM-Converter-setup.exe`, so it
   fetches the new installer as soon as the release is published. That only works while the file
   name has no version in it.
10. **Submit to the Store** (below).

## Microsoft Store

The Store takes the `.appx` and signs it itself, so it needs no code-signing certificate. It
rejects unsigned exe installers, so the installer is for GitHub only and the `.appx` is never
published there.

1. **One time:** copy the three values under Partner Center → the app → Product identity into
   `appx` in [packaging/electron-builder.config.cjs](../apps/windows/packaging/electron-builder.config.cjs): `identityName`, `publisher` (`CN=…`) and `publisherDisplayName`.
   Until then they hold placeholders, and the Store rejects a package whose identity doesn't match.
2. **Build** with `npm run windows:appx`.
3. **Upload** `apps/windows/dist/UOM-Converter-<version>.appx` in a new Partner Center
   submission. Every other field (listing text, images in their numbered order, privacy policy,
   `runFullTrust` justification, certification notes) is in
   [apps/windows/listing/LISTING.md](../apps/windows/listing/LISTING.md), ready to paste.

## Reference

### Release files

In `apps/windows/dist/`:

| File | Published to |
|---|---|
| `UOM-Converter-setup.exe` | GitHub Releases |
| `UOM-Converter-<version>.appx` | Microsoft Store (Partner Center) only |
| `RELEASE_NOTES.md` | The GitHub release's description (from `packaging/release-notes.cjs`) |

Only these are copied there. Everything else electron-builder makes (`win-unpacked/`, `.blockmap`
files, `builder-debug.yml`) stays in `apps/windows/build/electron-builder/`, with the other
intermediates, and isn't published.

### Where the images come from

`npm run windows:assets` runs [listing/generator/render.cjs](../apps/windows/listing/generator/render.cjs), which renders from
`packages/brand/app-icon.svg` and the built page (paths below are in `apps/windows/`):

| Output | Used for |
|---|---|
| `src/main/icon.png` | The window, taskbar and installer icon |
| `packaging/appx/` | Start, tile and taskbar icons inside the `.appx` |
| `listing/`, `listing/desktop/` | Partner Center: store logo, box and poster art (designed in `listing/generator/logo.html`), and in `desktop/` the screenshots (captions in `listing/generator/shots.html`, around captures of the app in `build/shots/`) |
| `packages/brand/rendered/` (at the repo root) | The website: `icon-256.png` (its install icon) and `share.png` (the preview when a link is shared, published as `og.png`), copies of the 256 px tile icon and the promo screenshot |
