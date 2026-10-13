// Writes one version's section of docs/CHANGELOG.md, without its heading, to apps/windows/release/RELEASE_NOTES.md:
// the GitHub release's description, so the notes are written once, in the changelog.
// `node apps/windows/scripts/release-notes.cjs <version>`. A file, not stdout, because Windows PowerShell
// re-encodes what it pipes between programs.

const fs = require("node:fs");
const path = require("node:path");

const version = process.argv[2];
if (!version) {
  console.error("Usage: node apps/windows/scripts/release-notes.cjs <version>");
  process.exit(1);
}

const changelog = fs.readFileSync(path.join(__dirname, "..", "..", "..", "docs", "CHANGELOG.md"), "utf8").replace(/\r\n/g, "\n");
const sections = changelog.split(/^(?=## \[)/m);
const section = sections.find((s) => s.startsWith(`## [${version}]`));
const notes = section?.replace(/^.*\n/, "").trim();
if (!notes) {
  console.error(`No [${version}] section with entries in docs/CHANGELOG.md.`);
  process.exit(1);
}
const out = path.join(__dirname, "..", "release", "RELEASE_NOTES.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, notes + "\n");
console.log(path.relative(process.cwd(), out));
