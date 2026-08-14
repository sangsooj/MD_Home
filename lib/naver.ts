import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { htmlToPlainText, sanitizeBodyHtml } from "./sanitize.js";

const DEFAULT_BLOG_ID = "hyunjp88";
const DEFAULT_CATEGORY = "공지사항";

export interface NaverNoticeFeedItem {
  externalId: string;
  title: string;
  sourceUrl: string;
  publishedAt: Date;
  rssDescription: string;
  categoryNo?: string;
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

function parseNaverPublishedAt(value: string): Date | undefined {
  const match = cleanText(value).match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{2})/);
  if (!match) return undefined;

  const [, year, month, day, hour, minute] = match;
  const publishedAt = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+09:00`,
  );
  return Number.isNaN(publishedAt.getTime()) ? undefined : publishedAt;
}

async function fetchPinnedNoticeItems(
  blogId: string,
  rssItems: NaverNoticeFeedItem[],
): Promise<NaverNoticeFeedItem[]> {
  const response = await fetch(
    `https://blog.naver.com/PostList.naver?blogId=${encodeURIComponent(blogId)}&categoryNo=0&from=postList`,
    {
      headers: { "User-Agent": "MathDoingNoticeSync/2.0 (+https://www.mathdoing.com)" },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) throw new Error(`네이버 공지 목록 요청 실패: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const rssByExternalId = new Map(rssItems.map((item) => [item.externalId, item]));
  const pinnedItems: NaverNoticeFeedItem[] = [];

  $("strong.notice").each((_, element) => {
    const anchor = $(element).nextAll("a[href*='logNo=']").first();
    const href = anchor.attr("href") ?? "";
    const externalId = extractExternalId(href);
    const title = cleanText(anchor.text());
    if (!externalId || !title) return;

    const rssItem = rssByExternalId.get(externalId);
    const categoryNo = href.match(/[?&]categoryNo=(\d+)/)?.[1];
    pinnedItems.push({
      externalId,
      title: rssItem?.title ?? title,
      sourceUrl: `https://blog.naver.com/${blogId}/${externalId}`,
      publishedAt: rssItem?.publishedAt ?? new Date(0),
      rssDescription: rssItem?.rssDescription ?? "",
      categoryNo,
    });
  });

  return pinnedItems;
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
  const rssItems: NaverNoticeFeedItem[] = [];
  const categoryItems: NaverNoticeFeedItem[] = [];

  $("item").each((_, element) => {
    const item = $(element);

    const sourceUrl = cleanText(item.find("guid").first().text()) || cleanText(item.find("link").first().text());
    const externalId = extractExternalId(sourceUrl);
    const title = cleanText(item.find("title").first().text());
    const publishedAt = new Date(cleanText(item.find("pubDate").first().text()));
    if (!externalId || !title || Number.isNaN(publishedAt.getTime())) return;

    const feedItem = {
      externalId,
      title,
      sourceUrl: `https://blog.naver.com/${blogId}/${externalId}`,
      publishedAt,
      rssDescription: item.find("description").first().text().trim(),
    };
    rssItems.push(feedItem);
    if (cleanText(item.find("category").first().text()) === categoryName) categoryItems.push(feedItem);
  });

  const pinnedItems = await fetchPinnedNoticeItems(blogId, rssItems);
  const noticesByExternalId = new Map<string, NaverNoticeFeedItem>();
  for (const item of [...categoryItems, ...pinnedItems]) noticesByExternalId.set(item.externalId, item);
  return [...noticesByExternalId.values()];
}

export async function fetchNoticePost(item: NaverNoticeFeedItem): Promise<NaverNoticePost> {
  const blogId = process.env.NAVER_BLOG_ID ?? DEFAULT_BLOG_ID;
  const categoryNo = item.categoryNo ?? process.env.NAVER_NOTICE_CATEGORY_NO ?? "33";
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

  const bodyHtml = sanitizeBodyHtml(content.html() ?? "");

  if (!bodyHtml) throw new Error(`네이버 글 ${item.externalId}의 정리된 본문이 비어 있습니다.`);

  const title = cleanText($("meta[property='og:title']").attr("content") ?? item.title);
  const publishedAt = parseNaverPublishedAt($(".se_publishDate").first().text()) ?? item.publishedAt;
  const plainText = htmlToPlainText(bodyHtml);
  const excerpt = plainText.slice(0, 180) + (plainText.length > 180 ? "…" : "");
  const contentHash = createHash("sha256")
    .update(`${title}\n${bodyHtml}`)
    .digest("hex");

  return { ...item, title, publishedAt, bodyHtml, excerpt, contentHash };
}
