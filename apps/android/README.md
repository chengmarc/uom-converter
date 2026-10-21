# The Android app

The converters on a phone: its own touch screens (`src/`) in a Capacitor app (`native/`), package
`com.uomconverter.app`. A home screen of converter cards (the ones opened last, then by topic,
with search and a filter by role), a screen per converter, and region in a settings sheet.

← Back to the [README](../../README.md).

## How-to guides

### Set up

Install Android Studio, for the Android SDK, an emulator and a Java Gradle can run on. The scripts
find them on their own (`scripts/sdk.cjs`), so `JAVA_HOME` and `ANDROID_HOME` needn't be set.

### Run and build

Commands run from the repo root:

```
npm run android:dev       # live preview on an emulator (started if need be) or a USB phone
npm run android:run       # build, install and open on the running emulator or phone
npm run android:emulator  # open the emulator with the app installed (or apps/android/emulator.cmd)
npm run android:apk       # debug .apk, in apps/android/native/app/build/outputs/apk/debug/
npm run android:aab       # release .aab for Google Play, signed with the upload key (below)
npm run android:sync      # build the page and copy it into the native project
```

`android:dev` points the installed app at Vite's dev server while it runs, and puts the bundled
page back when stopped (Ctrl+C or closing the console); until then, the app on the phone keeps
loading from this computer.

### Build a release for Google Play

Play takes only bundles signed with the app's upload key; Play App Signing then signs what it
ships with the app's own key, which Google keeps. The upload key lives outside the repo, in a
keystore made once with Android Studio's `keytool`:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
  -keystore "$env:USERPROFILE\.keys\uom-converter-upload.jks" -alias upload `
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=chengmarc"
```

Back up the keystore and its password: a lost upload key takes Play support days to reset. To
build, point the build at it, and bump the version first (every upload needs a higher
versionCode):

```powershell
$env:UOM_UPLOAD_KEYSTORE = "$env:USERPROFILE\.keys\uom-converter-upload.jks"
$env:UOM_UPLOAD_PASSWORD = "<its password>"
npm run android:aab   # apps/android/native/app/build/outputs/bundle/release/app-release.aab
```

Without them the build stops (`scripts/gradle.cjs`) rather than make a bundle Play would refuse.

### Behind a proxy

Every emulator the scripts start gets this computer's proxy (Windows' system proxy, or
`UOM_PROXY=host:port` to choose), so the Play Store works where Google is only reachable through
one. Gradle gets `HTTPS_PROXY` as Java's own proxy settings (`scripts/gradle.cjs`).

### Black emulator window

The emulators draw in software, since on some laptops with two GPUs, Chrome and the Play Store
otherwise show only black. `UOM_GPU=host` uses the GPU again.

### Refresh the icons

```
npm run android:icons
```

Redraws the launcher icons (`native/app/src/main/res/mipmap-*/`) and the Play icon
(`store/icon-512.png`) from `@uom/brand`'s `app-icon.svg` (`scripts/render-icons.cjs`).

## Explanation

**Its own screens, the shared converters.** A phone gets a different layout from the desktop and
website, but each converter is still drawn by `@uom/ui`'s `converter.ts`; this app only styles it
(`src/style.css`) and copies with a native clipboard plugin.

**Everything bundled.** The page is built into `dist/` and copied into the native project, which
serves it from `https://localhost`. Its content security policy (`src/index.html`) lets it load
only its own files.

**What shows before the page.** The splash colour (`launch.xml`, light and night) and the web
view's background (`capacitor.config.ts`) are the page's `--bg`, so opening the app doesn't
flash another colour. `src/theme.test.ts` checks they match `@uom/brand`'s tokens.

**One version.** The version is the root `package.json`'s; Google Play's versionCode is worked out
from it in `native/app/build.gradle` (1.2.3 is 10203).

## Reference

| Path | What it is |
|---|---|
| `src/` | The page: `index.html`, `main.ts`, `style.css` |
| `capacitor.config.ts` | Capacitor settings: app id, web view background, the dev server during `android:dev` |
| `native/` | The Android Studio project Capacitor syncs the page into |
| `scripts/sdk.cjs` | Finds the SDK and Java, the proxy, and an emulator or phone to install on |
| `scripts/gradle.cjs` | Runs Gradle with them: the `run`, `apk` and `aab` scripts |
| `scripts/dev.mjs`, `scripts/emulator.cjs` | `npm run android:dev`, `npm run android:emulator` |
| `scripts/render-icons.cjs` | `npm run android:icons` |
| `store/icon-512.png` | The Play listing icon (rendered) |
