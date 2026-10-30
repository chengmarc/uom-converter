// Finds every English string the apps show, by reading their source: t("…") calls anywhere, and the
// fields a converter or a page declares as text, which the apps pass through t() as they draw them.
// For the tests, in Node; catalogues.test.ts checks each language against this list.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const REPO = join(import.meta.dirname, "..", "..", "..");

/** Property names that hold text a person reads. */
const TEXT = new Set(["title", "blurb", "empty", "note", "label", "name", "summary", "heading", "error", "detail", "group", "description", "sub", "suffix", "placeholder", "topic"]);
/** Properties that are a list of text. */
const LISTS = new Set(["formula", "columns"]);
/** Calls with text among their arguments: linear(key, name, …), voltsField(label). */
const CALLS: Record<string, number> = { linear: 1, voltsField: 0 };

const sources = (dir: string) =>
  readdirSync(join(REPO, dir))
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => join(REPO, dir, f));

/** Strings in an expression, skipping the ones it only compares against ("mm2" in v.str("sys") === "mm2"). */
function literals(node: ts.Node, out: Set<string>) {
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)) return;
  if (ts.isCallExpression(node)) return; // str("sys"), or a t() of its own, found by the walk below
  if (ts.isStringLiteralLike(node)) out.add(node.text);
  ts.forEachChild(node, (c) => literals(c, out));
}

function scanTs(file: string, declared: boolean, out: Set<string>) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true);
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === "t" && node.arguments[0]) literals(node.arguments[0], out);
      if (declared && name in CALLS && node.arguments[CALLS[name]]) literals(node.arguments[CALLS[name]], out);
    }
    if (declared && ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name))) {
      const name = node.name.text;
      if (TEXT.has(name) || LISTS.has(name)) literals(node.initializer, out);
    }
    // A list of text shared between converters: WIRE_FORMULA.
    if (declared && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text.endsWith("_FORMULA") && node.initializer) literals(node.initializer, out);
    ts.forEachChild(node, visit);
  };
  visit(source);
}

function scanHtml(file: string, out: Set<string>) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(/<\w+[^>]*\sdata-t(?:\s[^>]*)?>([^<]+)</g)) out.add(m[1]);
  for (const m of html.matchAll(/\sdata-t-[\w-]+="([^"]+)"/g)) out.add(m[1]);
}

/** Text with no words to translate: numbers, unit symbols and codes read the same in every language. */
export const neutral = (s: string) =>
  !/\p{L}/u.test(s.replace(/\b(AWG|kcmil|kVA|kWh|kW|kvar|BTU|mm|cm|km|ft|in|lbf|lb|kg|mL|ml|Hz|kA|V|A|W|N|h|E|C|M|Z|OK|Al|Cu|PF|lx|fc|hp|m|r|min)\b|[²³°ΩµF]/g, ""));

/** Every string to translate. */
export function messages(): Set<string> {
  const out = new Set<string>();
  for (const f of sources("packages/converters/src")) scanTs(f, true, out);
  for (const f of ["converter", "visuals", "audiences", "search"]) scanTs(join(REPO, "packages/ui/src", `${f}.ts`), true, out);
  for (const f of sources("packages/core/src")) scanTs(f, false, out);
  for (const f of ["apps/android/src/main.ts", "apps/windows/src/renderer/main.ts"]) scanTs(join(REPO, f), false, out);
  for (const f of ["apps/android/src/index.html", "apps/windows/src/renderer/index.html"]) scanHtml(join(REPO, f), out);
  return new Set([...out].filter((s) => !neutral(s)));
}
