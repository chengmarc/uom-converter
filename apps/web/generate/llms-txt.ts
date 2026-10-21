// llms.txt: the site and every converter, for AI assistants.

import type { Topic } from "@uom/converters/model";
import { HOME, TOPIC_PAGES, type Page } from "../src/pages";
import { NAME, STORE_URL } from "../src/site";
import { SITE_URL } from "./site";

const REPO_URL = "https://github.com/chengmarc/uom-converter";

/**
 * The site for AI assistants and the crawlers that feed them (https://llmstxt.org): what it is,
 * then every converter by topic, each linked to its page with the page's own description. Built
 * from the same pages as the sitemap, with the topics as the pages' breadcrumbs show them.
 */
export function llmsTxt(converters: { page: Page; topic?: Topic }[], regions: string[]): string {
  if (!regions.length) throw new Error("no regions read from the page's region menu");
  const topics = new Map<Topic, Page[]>();
  for (const { page, topic } of converters) {
    if (!topic || !TOPIC_PAGES[topic]) throw new Error(`${page.slug}: no topic in its breadcrumb`);
    topics.set(topic, [...(topics.get(topic) ?? []), page]);
  }
  const item = (name: string, url: string, notes: string) => `- [${name}](${url}): ${notes}`;
  return [
    `# ${NAME}`,
    `> ${HOME.description}`,
    [
      `${NAME} is a free website with ${converters.length} converters and calculators for people who buy, sell, specify and install electrical products: suppliers, distributors, counter staff, electricians, engineers and product data (PIM) teams.`,
      `Every converter has its own page. The region picked in the page header sets the units, codes and frequency the converters use: ${regions.join(", ")}. The HTML of each page shows the converter with a worked example in US units and how it's calculated; every answer is worked out in the visitor's browser, with no account and nothing sent anywhere.`,
      `The home page, ${SITE_URL}, lists every converter.`,
    ].join("\n\n"),
    // Each topic's page first: it lists the converters under it.
    ...[...topics].map(([topic, pages]) => {
      const hub = TOPIC_PAGES[topic];
      return `## ${topic}\n\n${[hub, ...pages].map((p) => item(p.title, SITE_URL + p.slug, p.description)).join("\n")}`;
    }),
    `## Optional\n\n` +
      [
        item("Windows app", STORE_URL, "the same converters as a free Windows app from the Microsoft Store, working offline"),
        item("Source code", REPO_URL, "the website and apps, open source under the Apache 2.0 license"),
        item("Privacy", `${REPO_URL}/blob/main/PRIVACY.md`, "what the website and apps do and don't collect"),
        item("Sitemap", `${SITE_URL}sitemap.xml`, "every page's address"),
      ].join("\n"),
  ].join("\n\n") + "\n";
}
