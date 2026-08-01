import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";

const DEFAULT_BLOG_ID = "hyunjp88";
const DEFAULT_CATEGORY = "공지사항";

export interface NaverNoticeFeedItem {
  externalId: string;
  title: string;
  sourceUrl: string;
  publishedAt: Date;
  rssDescription: string;
}

export interface NaverNoticePost extends NaverNoticeFeedItem {
  bodyHtml: string;
  excerpt: string;
  contentHash: string;
}

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function extractExternalId(value: string): string | undefined {
  return value.match(/(?:logNo=|\/)(\d{9,})(?:\D|$)/)?.[1];
}

export async function fetchNoticeFeed(): Promise<NaverNoticeFeedItem[]> {
  const blogId = process.env.NAVER_BLOG_ID ?? DEFAULT_BLOG_ID;
  const categoryName = process.env.NAVER_NOTICE_CATEGORY ?? DEFAULT_CATEGORY;
  const response = await fetch(`https://rss.blog.naver.com/${blogId}.xml`, {
    headers: { "User-Agent": "MathDoingNoticeSync/2.0 (+https://www.mathdoing.com)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`네이버 RSS 요청 실패: ${response.status}`);

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: NaverNoticeFeedItem[] = [];

  $("item").each((_, element) => {
    const item = $(element);
    if (cleanText(item.find("category").first().text()) !== categoryName) return;

    const sourceUrl = cleanText(item.find("guid").first().text()) || cleanText(item.find("link").first().text());
    const externalId = extractExternalId(sourceUrl);
    const title = cleanText(item.find("title").first().text());
    const publishedAt = new Date(cleanText(item.find("pubDate").first().text()));
    if (!externalId || !title || Number.isNaN(publishedAt.getTime())) return;

    items.push({
      externalId,
      title,
      sourceUrl: `https://blog.naver.com/${blogId}/${externalId}`,
      publishedAt,
      rssDescription: item.find("description").first().text().trim(),
    });
  });

  return items;
}

export async function fetchNoticePost(item: NaverNoticeFeedItem): Promise<NaverNoticePost> {
  const blogId = process.env.NAVER_BLOG_ID ?? DEFAULT_BLOG_ID;
  const categoryNo = process.env.NAVER_NOTICE_CATEGORY_NO ?? "33";
  const postUrl = `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(blogId)}&logNo=${item.externalId}&categoryNo=${encodeURIComponent(categoryNo)}`;
  const response = await fetch(postUrl, {
    headers: { "User-Agent": "MathDoingNoticeSync/2.0 (+https://www.mathdoing.com)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`네이버 글 ${item.externalId} 요청 실패: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const content = $(".se-main-container").first().length
    ? $(".se-main-container").first().clone()
    : $("#postViewArea").first().clone();

  if (!content.length) throw new Error(`네이버 글 ${item.externalId}의 본문을 찾지 못했습니다.`);

  content.find("script, style, iframe, form, button, noscript").remove();
  content.find("img").each((_, image) => {
    const node = $(image);
    const src = node.attr("data-lazy-src") || node.attr("data-src") || node.attr("data-original") || node.attr("src");
    if (src) node.attr("src", src.replace(/^http:\/\//, "https://"));
    node.attr("loading", "lazy");
  });
  content.find("a").each((_, anchor) => {
    $(anchor).attr("target", "_blank").attr("rel", "noopener noreferrer");
  });

  const bodyHtml = sanitizeHtml(content.html() ?? "", {
    allowedTags: [
      "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s",
      "blockquote", "ul", "ol", "li", "figure", "figcaption", "img", "a",
      "table", "thead", "tbody", "tr", "th", "td", "h2", "h3", "h4",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  }).trim();

  if (!bodyHtml) throw new Error(`네이버 글 ${item.externalId}의 정리된 본문이 비어 있습니다.`);

  const plainText = cleanText(cheerio.load(bodyHtml).text());
  const excerpt = plainText.slice(0, 180) + (plainText.length > 180 ? "…" : "");
  const contentHash = createHash("sha256")
    .update(`${item.title}\n${bodyHtml}`)
    .digest("hex");

  return { ...item, bodyHtml, excerpt, contentHash };
}
