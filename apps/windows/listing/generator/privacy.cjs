// The privacy policy as plain text, for Partner Center's privacy policy box (LISTING.md), made from
// the repo's PRIVACY.md so the two can't drift: one line per paragraph or bullet, no Markdown.
// Writes listing/PRIVACY.md; run after changing PRIVACY.md (listing/generator/privacy.test.ts checks it was):
//   node apps/windows/listing/generator/privacy.cjs

const fs = require("node:fs");
const path = require("node:path");

const SOURCE = path.join(__dirname, "..", "..", "..", "..", "PRIVACY.md");
const OUT = path.join(__dirname, "..", "PRIVACY.md");

const inline = (s) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
    .replace(/<(https?:\/\/[^>]+)>/g, "$1");

/** Markdown's wrapped lines joined back up; a line ending in "\" is a hard break and stays one. */
const unwrap = (lines) => lines.map((l) => l.trim()).join(" ").replace(/\\ /g, "\n");

function plainText(markdown) {
  const blocks = markdown.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  return (
    blocks
      .map((block) => {
        const lines = block.split("\n");
        if (/^#+ /.test(lines[0])) return inline(lines[0].replace(/^#+ /, ""));
        if (!lines[0].startsWith("- ")) return inline(unwrap(lines));
        // A list: "- " starts a bullet, "  - " a bullet under it; other lines continue the one above.
        const items = [];
        for (const line of lines) {
          const m = /^( *)- (.*)$/.exec(line);
          if (m) items.push({ sub: m[1].length > 0, lines: [m[2]] });
          else items.at(-1).lines.push(line);
        }
        return items.map((it) => `${it.sub ? "   – " : "• "}${inline(unwrap(it.lines))}`).join("\n");
      })
      .join("\n\n") + "\n"
  );
}

module.exports = { plainText, SOURCE, OUT };

if (require.main === module) {
  fs.writeFileSync(OUT, plainText(fs.readFileSync(SOURCE, "utf8")));
  console.log(`${path.relative(process.cwd(), OUT)} written from PRIVACY.md`);
}
