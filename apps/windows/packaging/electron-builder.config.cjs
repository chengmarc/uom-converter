// electron-builder's settings for the .exe files and the Store's .appx, run from apps/windows/ with
// --config packaging/electron-builder.config.cjs, so the paths below are relative to apps/windows/.
// The version is the repo's (one for every app, in the root package.json); the packaged app's
// package.json also gets the repo's name, so it reads the same as before the apps had their own.

const path = require("node:path");

const { version } = require("../../../package.json");
// npm installs Electron at the repo root, where electron-builder doesn't look for it.
const electron = path.dirname(require.resolve("electron/package.json"));

module.exports = {
  appId: "com.uomconverter.app",
  extraMetadata: { name: "uom-converter", version },
  files: ["dist/**", "src/main/**", "!**/*.test.ts", "package.json"],
  directories: {
    output: "release",
    buildResources: "packaging",
  },
  electronVersion: require(path.join(electron, "package.json")).version,
  electronDist: path.join(electron, "dist"),
  win: {
    target: ["nsis", "portable"],
    icon: "src/main/icon.png",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    artifactName: "UOM-Converter-setup.exe",
  },
  portable: {
    artifactName: "UOM-Converter-portable.exe",
  },
  appx: {
    identityName: "chengmarc.UOMConverter",
    publisher: "CN=58F02A86-A694-404A-8E09-F891292262CA",
    publisherDisplayName: "chengmarc",
    applicationId: "UOMConverter",
    displayName: "UOM Converter",
    backgroundColor: "transparent",
    minVersion: "10.0.17763.0",
    maxVersionTested: "10.0.26100.0",
    languages: ["en-US"],
    artifactName: "UOM-Converter-${version}.${ext}",
  },
};
