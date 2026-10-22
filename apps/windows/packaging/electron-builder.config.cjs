// electron-builder's settings for the installer and the Store's .appx, run from apps/windows/ with
// --config packaging/electron-builder.config.cjs, so the paths below are relative to apps/windows/.
// The version is the repo's (one for every app, in the root package.json); the packaged app's
// package.json also gets the repo's name, so it reads the same as before the apps had their own.
// Everything electron-builder makes lands in build/electron-builder/; only the installer and the
// .appx are copied out to dist/, so dist/ holds just what ships.

const fs = require("node:fs");
const path = require("node:path");

const { version } = require("../../../package.json");
// npm installs Electron at the repo root, where electron-builder doesn't look for it.
const electron = path.dirname(require.resolve("electron/package.json"));

module.exports = {
  appId: "com.uomconverter.app",
  extraMetadata: { name: "uom-converter", version },
  files: ["build/web/**", "src/main/**", "!**/*.test.ts", "package.json"],
  directories: {
    output: "build/electron-builder",
    buildResources: "packaging",
  },
  afterAllArtifactBuild: ({ artifactPaths }) => {
    const dist = path.join(__dirname, "..", "dist");
    fs.mkdirSync(dist, { recursive: true });
    for (const file of artifactPaths.filter((f) => /\.(exe|appx)$/.test(f))) fs.copyFileSync(file, path.join(dist, path.basename(file)));
    return [];
  },
  electronVersion: require(path.join(electron, "package.json")).version,
  electronDist: path.join(electron, "dist"),
  win: {
    target: ["nsis"],
    icon: "src/main/icon.png",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    artifactName: "UOM-Converter-setup.exe",
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
