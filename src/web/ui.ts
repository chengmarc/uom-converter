// Renders a converter (src/converters/model.ts) as a panel: examples, the "Convert from" form,
// and the result, all laid out the same way for every converter.

import type { Region } from "../core/region";
import { numberStyle, parseNumber } from "../converters/format";
import { dyn, type Converter, type Field, type Output, type Row, type Table, type Values } from "../converters/model";
import { drawVisual } from "./visuals";

/** Reads a converter's inputs from its panel's form. */
class PanelValues implements Values {
  constructor(
    private conv: Converter,
    private panel: HTMLElement,
    readonly region: Region,
  ) {}

  str(id: string): string {
    const f = this.field(id);
    if (f.kind === "choice") {
      return this.panel.querySelector<HTMLInputElement>(`input[name="${this.conv.id}-${id}"]:checked`)!.value;
    }
    return this.panel.querySelector<HTMLInputElement>(`[data-field="${id}"]`)!.value.trim();
  }

  num(id: string): number | undefined {
    const f = this.field(id);
    return parseNumber(this.str(id), f.kind !== "choice" && f.signed);
  }

  private field(id: string): Field {
    return this.conv.fields.find((f) => f.id === id)!;
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function renderConverter(conv: Converter, region: Region): HTMLElement {
  const panel = el("section", "converter");
  panel.id = `c-${conv.id}`; // not the bare hash, so switching converters does not scroll
  panel.setAttribute("aria-labelledby", `${conv.id}-h`);
  const values = new PanelValues(conv, panel, region);
  const h = el("h2", undefined, conv.title);
  h.id = `${conv.id}-h`;
  panel.append(h, el("p", "blurb", dyn(conv.blurb, values)));

  // Examples first: the quickest way to see what a converter does.
  const examples = dyn(conv.examples, values);
  const exampleBar = el("div", "examples");
  exampleBar.append(el("span", "examples-label", "Try an example"));
  const exampleButtons = examples.map((ex) => {
    const b = el("button", "example", ex.label);
    b.type = "button";
    b.addEventListener("click", () => {
      fill(ex.set);
      exampleButtons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
    exampleBar.append(b);
    return b;
  });
  if (examples.length) panel.append(exampleBar);

  const flow = el("div", "flow");
  const from = el("div", "box from");
  from.append(el("h3", "box-title", "Convert from"));
  // Attached before the fields are built, so a field's label or placeholder can read another field.
  flow.append(from);
  panel.append(flow);
  const more = el("details", "more");
  const moreSummary = el("summary");
  more.append(moreSummary);
  const errId = `${conv.id}-err`;

  const dynamic: (() => void)[] = [];
  const summaryParts: (() => string)[] = [];
  for (const f of conv.fields) {
    const target = f.advanced ? more : from;
    if (f.kind === "choice") {
      const fs = el("fieldset", "field");
      fs.append(el("legend", "label", f.label));
      const seg = el("div", "segmented");
      seg.style.setProperty("--n", String(f.options.length));
      const initial = f.value === undefined ? f.options[0].value : dyn(f.value, values);
      for (const o of f.options) {
        const lab = el("label");
        const input = el("input");
        input.type = "radio";
        input.name = `${conv.id}-${f.id}`;
        input.value = o.value;
        input.checked = o.value === initial;
        lab.append(input, el("span", undefined, o.label));
        seg.append(lab);
      }
      fs.append(seg);
      target.append(fs);
      if (f.advanced) summaryParts.push(() => f.options.find((o) => o.value === values.str(f.id))!.label);
      continue;
    }
    const lab = el("label", "field");
    const labelText = el("span", "label");
    const box = el("span", "text-input");
    const cur = f.currency ? numberStyle() : undefined;
    if (cur && !cur.currencyAfter) box.append(el("span", "affix", cur.currency));
    const input = el("input");
    input.type = "text";
    input.autocomplete = "off";
    input.dataset.field = f.id;
    input.inputMode = f.kind === "number" && !f.signed ? "decimal" : "text";
    input.value = f.value === undefined ? "" : dyn(f.value, values);
    input.setAttribute("aria-describedby", errId);
    box.append(input);
    const suffix = el("span", "affix");
    if (f.suffix || cur?.currencyAfter) box.append(suffix);
    lab.append(labelText, box);
    if (f.list) {
      const dl = el("datalist");
      dl.id = `${conv.id}-${f.id}-list`;
      input.setAttribute("list", dl.id);
      lab.append(dl);
      dynamic.push(() =>
        dl.replaceChildren(...dyn(f.list!, values).map((v) => Object.assign(el("option"), { value: v }))),
      );
    }
    const suffixText = () => [cur?.currencyAfter ? cur.currency : "", f.suffix ? dyn(f.suffix, values) : ""].filter(Boolean).join(" ");
    dynamic.push(() => {
      labelText.textContent = dyn(f.label, values) + (f.optional ? " (optional)" : "");
      input.placeholder = f.placeholder === undefined ? "" : dyn(f.placeholder, values);
      suffix.textContent = suffixText();
    });
    if (f.advanced) {
      summaryParts.push(() => {
        const val = values.str(f.id);
        return val === "" ? "" : `${dyn(f.label, values)} ${val}${suffixText() ? ` ${suffixText()}` : ""}`;
      });
    }
    target.append(lab);
  }
  if (summaryParts.length) {
    from.append(more);
    dynamic.push(() => {
      const parts = summaryParts.map((p) => p()).filter(Boolean);
      moreSummary.replaceChildren(el("span", "more-title", "More options"), el("span", "more-values", parts.join(" · ")));
    });
  }

  const arrow = el("div", "arrow", "→");
  arrow.setAttribute("aria-hidden", "true");

  const to = el("div", "box to");
  to.setAttribute("aria-live", "polite");
  const toTitle = el("h3", "box-title");
  const toBody = el("div", "to-body");
  to.append(toTitle, toBody);
  const err = el("p", "error");
  err.id = errId;
  err.setAttribute("role", "alert");

  flow.append(arrow, to);
  if (conv.note) panel.append(el("p", "note", dyn(conv.note, values)));
  const table = conv.table ? renderTable(conv.table()) : undefined;
  if (table) panel.append(table);

  const update = () => {
    dynamic.forEach((d) => d());
    const out = conv.compute(values);
    const bad = out && "error" in out ? out.fields : [];
    panel.querySelectorAll<HTMLInputElement>("[data-field]").forEach((i) => {
      i.setAttribute("aria-invalid", String(bad.includes(i.dataset.field!)));
    });
    // Never hide a problem inside a closed "More options".
    if (bad.some((id) => conv.fields.find((f) => f.id === id)?.advanced)) more.open = true;

    if (!out) {
      toTitle.textContent = "Result";
      toBody.replaceChildren(el("p", "empty", examples.length ? `${conv.empty} Or pick an example.` : conv.empty));
    } else if ("error" in out) {
      toTitle.textContent = "Result";
      err.textContent = out.error;
      toBody.replaceChildren(err);
    } else {
      toTitle.textContent = out.heading;
      toBody.replaceChildren(...renderResult(out));
    }
    const hit = out && "rows" in out ? out.highlight : undefined;
    table?.querySelectorAll<HTMLElement>("tbody tr").forEach((tr) => tr.classList.toggle("hit", tr.dataset.key !== undefined && tr.dataset.key === hit));
  };

  function fill(set: Record<string, string>) {
    for (const [id, value] of Object.entries(set)) {
      const f = conv.fields.find((x) => x.id === id);
      if (!f) throw new Error(`Example for ${conv.id} sets unknown field ${id}`);
      if (f.kind === "choice") {
        const radio = panel.querySelector<HTMLInputElement>(`input[name="${conv.id}-${id}"][value="${value}"]`);
        if (!radio) throw new Error(`Example for ${conv.id}: ${id} has no option ${value}`);
        radio.checked = true;
      } else {
        panel.querySelector<HTMLInputElement>(`[data-field="${id}"]`)!.value = value;
      }
    }
    // Fields the example leaves out go back to their defaults, so examples don't mix.
    for (const f of conv.fields) {
      if (f.id in set || f.kind === "choice") continue;
      panel.querySelector<HTMLInputElement>(`[data-field="${f.id}"]`)!.value = f.value === undefined ? "" : dyn(f.value, values);
    }
    update();
  }

  // Typing after picking an example means it's no longer that example.
  panel.addEventListener("input", () => exampleButtons.forEach((b) => b.setAttribute("aria-pressed", "false")));
  panel.addEventListener("input", update);
  panel.addEventListener("change", update);
  // Open on a worked answer rather than an empty form; the first click in a field selects its
  // value, so typing replaces the example.
  panel.querySelectorAll<HTMLInputElement>("input[data-field]").forEach((input) => {
    let selecting = false;
    input.addEventListener("focus", () => {
      input.select();
      selecting = true;
    });
    input.addEventListener("mouseup", (e) => {
      if (selecting) e.preventDefault();
      selecting = false;
    });
  });
  if (exampleButtons.length) exampleButtons[0].click();
  else update();
  return panel;
}

function renderResult(out: Extract<Output, { rows: Row[] }>): Node[] {
  const [answer, ...rest] = out.rows;
  const nodes: Node[] = [];
  if (answer) {
    const hero = el("button", `answer${answer.status ? ` is-${answer.status}` : ""}`);
    hero.type = "button";
    const top = el("span", "answer-label", answer.label);
    const value = el("span", "answer-value", answer.value);
    const hint = el("span", "row-copy", "Copy");
    hint.setAttribute("aria-hidden", "true");
    hero.append(top, value);
    if (answer.detail) hero.append(el("span", "answer-detail", answer.detail));
    hero.append(hint);
    hero.setAttribute("aria-label", `${answer.label}: ${answer.value}. Copy.`);
    hero.addEventListener("click", () => copy(hero, hint, answer.copy ?? answer.value));
    nodes.push(hero);
  }
  if (out.visual) {
    const fig = el("figure", "visual");
    fig.append(drawVisual(out.visual));
    nodes.push(fig);
  }
  if (rest.length) nodes.push(renderRows(rest));
  if (out.formula?.length) {
    const how = el("details", "how");
    how.append(el("summary", undefined, "How it's calculated"));
    const list = el("ul");
    for (const line of out.formula) list.append(el("li", undefined, line));
    how.append(list);
    nodes.push(how);
  }
  return nodes;
}

/** A reference table folded under "summary"; rows with a key can be highlighted by the answer. */
function renderTable(t: Table): HTMLElement {
  const details = el("details", "table-wrap");
  details.append(el("summary", undefined, t.summary));
  const table = el("table", t.wide ? "wide" : undefined);
  const headRow = el("tr");
  for (const c of t.columns) headRow.append(Object.assign(el("th", undefined, c), { scope: "col" }));
  const body = el("tbody");
  for (const r of t.rows) {
    const tr = el("tr");
    if ("group" in r) {
      tr.className = "cat";
      tr.append(Object.assign(el("td", undefined, r.group), { colSpan: t.columns.length }));
    } else {
      if (r.key !== undefined) tr.dataset.key = r.key;
      tr.append(...r.cells.map((c) => el("td", undefined, c)));
    }
    body.append(tr);
  }
  const head = el("thead");
  head.append(headRow);
  table.append(head, body);
  details.append(table);
  return details;
}

function renderRows(rows: Row[]): HTMLElement {
  const list = el("div", "rows");
  let group: string | undefined;
  for (const r of rows) {
    if (r.group && r.group !== group) list.append(el("h4", "row-group", r.group));
    group = r.group;
    const row = el("button", `row${r.status ? ` is-${r.status}` : ""}`);
    row.type = "button";
    const left = el("span", "row-label", r.label);
    if (r.detail) left.append(el("small", undefined, r.detail));
    const value = el("span", "row-value", r.value);
    const hint = el("span", "row-copy", "Copy");
    hint.setAttribute("aria-hidden", "true");
    row.append(left, hint, value);
    row.setAttribute("aria-label", `${r.label}: ${r.value}. Copy.`);
    row.addEventListener("click", () => copy(row, hint, r.copy ?? r.value));
    list.append(row);
  }
  return list;
}

async function copy(row: HTMLElement, hint: HTMLElement, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    hint.textContent = "Copied";
    row.classList.add("copied");
    setTimeout(() => {
      hint.textContent = "Copy";
      row.classList.remove("copied");
    }, 1200);
  } catch {
    // Clipboard blocked (insecure context or permissions): nothing to do.
  }
}
