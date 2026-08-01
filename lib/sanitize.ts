import * as cheerio from "cheerio";

const allowedTags = new Set([
  "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s",
  "blockquote", "ul", "ol", "li", "figure", "figcaption", "img", "a",
  "table", "thead", "tbody", "tr", "th", "td", "h2", "h3", "h4",
]);

const discardedTags = new Set([
  "script", "style", "iframe", "object", "embed", "form", "button",
  "input", "textarea", "select", "option", "noscript", "template", "svg", "math",
]);

const allowedAttributes: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function sanitizeBodyHtml(value: string): string {
  const $ = cheerio.load(value, null, false);
  const elements = $("*").toArray().reverse();

  for (const element of elements) {
    if (!("tagName" in element) || !("attribs" in element)) continue;
    const node = $(element);
    const tag = element.tagName.toLowerCase();
    if (discardedTags.has(tag)) {
      node.remove();
      continue;
    }
    if (!allowedTags.has(tag)) {
      node.replaceWith(node.contents());
      continue;
    }

    const tagAttributes = allowedAttributes[tag] ?? new Set<string>();
    for (const attribute of Object.keys(element.attribs ?? {})) {
      if (!tagAttributes.has(attribute.toLowerCase())) node.removeAttr(attribute);
    }

    if (tag === "a") {
      const href = node.attr("href");
      if (!href || !isWebUrl(href)) node.removeAttr("href");
      node.attr("target", "_blank").attr("rel", "noopener noreferrer");
    }
    if (tag === "img") {
      const src = node.attr("src");
      if (!src || !isWebUrl(src)) node.remove();
      else node.attr("src", src.replace(/^http:\/\//i, "https://")).attr("loading", "lazy");
    }
  }

  return $.html().trim();
}

export function htmlToPlainText(value: string): string {
  return cheerio.load(value, null, false).text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
