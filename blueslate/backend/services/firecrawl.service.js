import { setTimeout as delay } from "node:timers/promises";

const FIRECRAWL_API  = "https://api.firecrawl.dev/v1";
const CRAWL_LIMIT    = 10;
const CRAWL_TIMEOUT  = 90_000; // ms — Firecrawl crawls typically finish in 15-45s
const POLL_INTERVAL  = 4_000;

const EXCLUDE_PATHS = [
    "**/blog/**", "**/news/**", "**/press/**",
    "**/privacy**", "**/terms**", "**/legal**",
    "**/login**", "**/logout**", "**/account**", "**/dashboard**",
    "**/cart**", "**/checkout**",
    "**/sitemap**", "**/feed**",
];

/**
 * Scrapes a website using the Firecrawl API (handles JS-rendered sites).
 * Returns the same shape as extractWebsiteMetadata so it can be a drop-in
 * replacement. Returns null if FIRECRAWL_API_KEY is unset or the call fails,
 * allowing the caller to fall back to the cheerio crawler.
 */
export async function scrapeWebsiteWithFirecrawl(websiteUrl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
        console.log("[FIRECRAWL] FIRECRAWL_API_KEY not set — skipping");
        return null;
    }

    // Try multi-page crawl first; fall back to single-page scrape if it fails.
    try {
        return await _crawl(websiteUrl, apiKey);
    } catch (crawlErr) {
        console.warn("[FIRECRAWL] Crawl failed:", crawlErr.message, "— retrying with single scrape");
        try {
            return await _scrape(websiteUrl, apiKey);
        } catch (scrapeErr) {
            console.error("[FIRECRAWL] Single scrape also failed:", scrapeErr.message);
            return null;
        }
    }
}

// ── single-page scrape ────────────────────────────────────────────────────────

async function _scrape(url, apiKey) {
    console.log("[FIRECRAWL] Scraping single page:", url);

    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
        method:  "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

    const json = await res.json();
    if (!json.success) throw new Error("success:false from /scrape");

    const page    = json.data;
    const content = _buildContent(page.markdown ?? "", page.metadata);

    console.log("[FIRECRAWL] Single scrape done. content length:", content.length);

    return _toMetadata(
        page.metadata?.title       ?? "",
        page.metadata?.description ?? "",
        content,
        [url],
    );
}

// ── multi-page crawl ──────────────────────────────────────────────────────────

async function _crawl(url, apiKey) {
    console.log("[FIRECRAWL] Starting crawl:", url);

    const startRes = await fetch(`${FIRECRAWL_API}/crawl`, {
        method:  "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            url,
            limit:           CRAWL_LIMIT,
            formats:         ["markdown"],
            onlyMainContent: true,
            excludePaths:    EXCLUDE_PATHS,
        }),
    });

    if (!startRes.ok) throw new Error(`Crawl start HTTP ${startRes.status}: ${await startRes.text()}`);

    const { id } = await startRes.json();
    console.log("[FIRECRAWL] Crawl job started, id:", id);

    const pages = await _pollUntilDone(id, apiKey);
    console.log("[FIRECRAWL] Crawl complete. pages:", pages.length);

    if (pages.length === 0) throw new Error("Crawl returned 0 pages");

    const title        = pages[0].metadata?.title       ?? "";
    const description  = pages[0].metadata?.description ?? "";
    const crawledPages = pages.map((p) => p.metadata?.sourceURL ?? url);

    const allMarkdown = pages
        .map((p) => p.markdown ?? "")
        .filter(Boolean)
        .join("\n\n---\n\n");

    const content = _buildContent(allMarkdown, { title, description });
    console.log("[FIRECRAWL] Merged content length:", content.length);

    return _toMetadata(title, description, content, crawledPages);
}

async function _pollUntilDone(id, apiKey) {
    const deadline = Date.now() + CRAWL_TIMEOUT;

    while (Date.now() < deadline) {
        await delay(POLL_INTERVAL);

        const res = await fetch(`${FIRECRAWL_API}/crawl/${id}`, {
            headers: { "Authorization": `Bearer ${apiKey}` },
        });

        if (!res.ok) {
            console.warn("[FIRECRAWL] Poll returned HTTP", res.status, "— retrying");
            continue;
        }

        const data = await res.json();
        console.log(`[FIRECRAWL] Poll: status=${data.status}, pages=${data.data?.length ?? 0}`);

        if (data.status === "completed") return data.data ?? [];
        if (data.status === "failed")    throw new Error(`Crawl job failed: ${data.error ?? "unknown"}`);
    }

    throw new Error(`Crawl job timed out after ${CRAWL_TIMEOUT / 1000}s`);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function _buildContent(markdown, metadata) {
    const lines = [];
    if (metadata?.title)       lines.push(`Business name: ${metadata.title}.`);
    if (metadata?.description) lines.push(`About: ${metadata.description}.`);
    if (lines.length)          lines.push("");
    lines.push(markdown.trim());
    return lines.join("\n");
}

function _toMetadata(title, description, content, crawledPages) {
    return {
        title,
        description,
        content,
        services:      [],
        programs:      [],
        ageGroups:     [],
        faqs:          [],
        contactInfo:   "",
        businessHours: "",
        crawledPages,
    };
}
