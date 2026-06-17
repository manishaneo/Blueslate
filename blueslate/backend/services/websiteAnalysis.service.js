import axios from "axios";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP, isIPv4, isIPv6 } from "node:net";
import { scrapeWebsiteWithFirecrawl } from "./firecrawl.service.js";

// ── constants ─────────────────────────────────────────────────────────────────

const MAX_PAGES       = 10;
const REQUEST_TIMEOUT = 12000;
const USER_AGENT      =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

// Path segments that indicate high-value business pages — domain-agnostic.
const PRIORITY_SEGMENTS = new Set([
    "about", "about-us", "aboutus", "about_us", "our-story",
    "service", "services", "what-we-do", "what-we-offer",
    "offering", "offerings",
    "program", "programs",
    "class", "classes",
    "course", "courses",
    "curriculum",
    "faq", "faqs", "frequently-asked-questions", "frequently-asked",
    "contact", "contact-us", "contactus", "contact_us", "reach-us", "find-us",
    "pricing", "prices", "price", "rates", "fees", "packages", "membership", "memberships",
    "team", "staff", "our-team", "meet-the-team",
    "location", "locations", "hours", "opening-hours", "business-hours",
    "booking", "book", "book-now", "schedule", "reserve", "reservation",
    "enrollment", "enroll", "register", "registration", "join", "sign-up",
    "gallery",
]);

// Path segments that indicate blog / noise pages — skip entirely.
const NOISE_SEGMENTS = new Set([
    "blog", "news", "article", "articles", "post", "posts",
    "author", "authors",
    "tag", "tags",
    "category", "categories", "cat",
    "archive", "archives",
    "privacy", "privacy-policy",
    "terms", "terms-of-service", "terms-of-use", "legal",
    "cookie", "cookies", "cookie-policy",
    "sitemap", "site-map",
    "login", "logout", "sign-in", "sign-out", "signup",
    "account", "my-account", "dashboard",
    "cart", "checkout", "basket",
    "search",
    "cdn-cgi", "wp-content", "wp-admin", "wp-login", "wp-json",
    "feed", "rss",
]);

// Non-HTML file extensions — never worth crawling.
const SKIP_EXTENSIONS = new Set([
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
    ".mp4", ".mp3", ".wav", ".zip", ".tar", ".gz",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".css", ".js", ".json", ".xml", ".txt",
]);

// ── SSRF protection ───────────────────────────────────────────────────────────

/**
 * Returns true if the IP falls in any private / loopback / link-local range.
 * Handles IPv4, IPv6, and IPv4-mapped IPv6 (decimal and hex notation).
 */
function isPrivateIp(ip) {
    if (isIPv6(ip)) {
        if (ip === "::1") return true;                         // loopback
        if (/^fe[89ab]/i.test(ip)) return true;               // fe80::/10 link-local
        if (/^f[cd]/i.test(ip)) return true;                  // fc00::/7 unique-local

        // IPv4-mapped ::ffff:a.b.c.d (decimal)
        const v4dec = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
        if (v4dec) return isPrivateIp(v4dec[1]);

        // IPv4-mapped ::ffff:aabb:ccdd (hex)
        const v4hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
        if (v4hex) {
            const hi = parseInt(v4hex[1], 16);
            const lo = parseInt(v4hex[2], 16);
            return isPrivateIp(`${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`);
        }

        return false;
    }

    if (isIPv4(ip)) {
        const [a, b] = ip.split(".").map(Number);
        return (
            a === 127 ||                          // 127.0.0.0/8  loopback
            a === 10  ||                          // 10.0.0.0/8   private
            a === 0   ||                          // 0.0.0.0/8
            (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12 private
            (a === 192 && b === 168)           ||  // 192.168.0.0/16 private
            (a === 169 && b === 254)               // 169.254.0.0/16 link-local / cloud metadata
        );
    }

    return false;
}

/**
 * Resolves the hostname of a user-supplied URL and throws if any resolved
 * address falls in a private or loopback range (SSRF prevention).
 * Must be called after URL normalisation and before any outbound HTTP request.
 */
async function validatePublicUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("Invalid URL.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only HTTP and HTTPS URLs are allowed.");
    }

    // Strip IPv6 brackets — URL.hostname includes them for IPv6 literals.
    const { hostname } = parsed;
    const host = hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;

    // Reject obviously local names before DNS resolution.
    if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local")) {
        throw new Error("Local addresses are not allowed.");
    }

    // Literal IP — validate directly, no DNS round-trip needed.
    if (isIP(host)) {
        if (isPrivateIp(host)) {
            throw new Error("Private network addresses are not allowed.");
        }
        return;
    }

    // Resolve DNS — { all: true } returns every address the OS resolver returns,
    // using the same path Node's HTTP client uses for consistency.
    let addresses;
    try {
        addresses = await lookup(host, { all: true });
    } catch {
        throw new Error(`Could not resolve hostname: ${host}`);
    }

    if (!addresses || addresses.length === 0) {
        throw new Error(`Could not resolve hostname: ${host}`);
    }

    for (const { address } of addresses) {
        if (isPrivateIp(address)) {
            throw new Error("Private network addresses are not allowed.");
        }
    }
}

// ── fetch ─────────────────────────────────────────────────────────────────────

async function fetchHtml(url) {
    const response = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        timeout: REQUEST_TIMEOUT,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType = response.headers["content-type"] ?? "";
    if (!contentType.includes("text/html")) {
        throw new Error(`Non-HTML response (${contentType})`);
    }

    return String(response.data)
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "");
}

// ── URL helpers ───────────────────────────────────────────────────────────────

// Returns a canonical string key for a URL, or null if the URL is unusable.
// Strips fragment and query string to avoid crawling paginated duplicates.
function normalizeUrl(href, base) {
    try {
        const u = new URL(href, base);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        // Remove trailing slash from all paths except root "/"
        const path =
            u.pathname.endsWith("/") && u.pathname.length > 1
                ? u.pathname.slice(0, -1)
                : u.pathname;
        return `${u.origin}${path.toLowerCase()}`;
    } catch {
        return null;
    }
}

// Returns: 10 = priority page, 5 = partial priority match,
//           0 = neutral,        -1 = noise (skip).
function scorePath(pathname) {
    const segments = pathname.toLowerCase().split("/").filter(Boolean);

    if (segments.some((seg) => NOISE_SEGMENTS.has(seg))) return -1;

    for (const seg of segments) {
        if (PRIORITY_SEGMENTS.has(seg)) return 10;
        for (const p of PRIORITY_SEGMENTS) {
            if (seg.includes(p)) return 5;
        }
    }
    return 0;
}

// Returns all unique internal links from the current page as { url, score }.
function extractInternalLinks($, pageUrl, origin) {
    const links = [];
    const seen  = new Set();

    $("a[href]").each((_, el) => {
        const href = $(el).attr("href")?.trim();
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

        const normalized = normalizeUrl(href, pageUrl);
        if (!normalized || seen.has(normalized)) return;

        try {
            const u = new URL(normalized);
            if (u.origin !== origin) return; // external link

            const ext = u.pathname.slice(u.pathname.lastIndexOf(".")).toLowerCase();
            if (SKIP_EXTENSIONS.has(ext)) return;

            const score = scorePath(u.pathname);
            if (score < 0) return; // noise — discard

            seen.add(normalized);
            links.push({ url: normalized, score });
        } catch {
            // ignore malformed URLs
        }
    });

    return links;
}

// ── shared helpers ────────────────────────────────────────────────────────────

function clean(text) {
    return text.replace(/\s+/g, " ").trim();
}

function unique(arr) {
    return [...new Set(arr.map((s) => clean(s)).filter((s) => s.length > 2))];
}

// Collect text from siblings of a heading until the next same-or-higher heading
function siblingsText($, $heading, maxSteps = 10) {
    let text  = "";
    let $el   = $heading.next();
    let steps = 0;
    while ($el.length && !$el.is("h1,h2,h3,h4,h5,h6") && steps < maxSteps) {
        text += " " + $el.text();
        $el = $el.next();
        steps++;
    }
    return clean(text);
}

// ── structured extractors ─────────────────────────────────────────────────────

function extractContactInfo($) {
    const parts = new Set();

    // Explicit tel: / mailto: hyperlinks are the most reliable source
    $("a[href^='tel:']").each((_, el) => {
        const num = clean($(el).text()) || $(el).attr("href").replace("tel:", "");
        if (num) parts.add(`Phone: ${num}`);
    });

    $("a[href^='mailto:']").each((_, el) => {
        const addr =
            clean($(el).text()) || $(el).attr("href").replace("mailto:", "");
        if (addr && !addr.includes("{") && !addr.includes("%")) {
            parts.add(`Email: ${addr}`);
        }
    });

    // Semantic <address> element
    $("address").each((_, el) => {
        const text = clean($(el).text());
        if (text) parts.add(`Address: ${text}`);
    });

    // Class/id heuristic for phone and email buried in contact sections
    const CONTACT_SEL =
        "[class*='contact'],[id*='contact'],[class*='phone'],[id*='phone']," +
        "[class*='email'],[id*='email'],[class*='address'],[id*='address']";

    $(CONTACT_SEL).each((_, el) => {
        const text = clean($(el).text());

        const phone = text.match(/(?:\+?\d[\d\s\-(). ]{6,}\d)/);
        if (phone) parts.add(`Phone: ${clean(phone[0])}`);

        const email = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
        if (email) parts.add(`Email: ${email[0]}`);
    });

    return [...parts].join("\n");
}

function extractBusinessHours($, bodyText) {
    // Priority 1 — explicit class/id names
    let found = "";
    const HOURS_SEL =
        "[class*='hour'],[id*='hour'],[class*='schedule'],[id*='schedule']," +
        "[class*='timing'],[id*='timing'],[class*='opening'],[id*='opening']," +
        "[class*='timetable'],[id*='timetable']";

    $(HOURS_SEL).each((_, el) => {
        const text = clean($(el).text());
        if (text.length > 5 && text.length < 600) found += " | " + text;
    });
    if (found) return found.replace(/^\s*\|\s*/, "").trim();

    // Priority 2 — section headings containing hours-related words
    let fromHeadings = "";
    $("h1,h2,h3,h4,h5,h6").each((_, el) => {
        const $el = $(el);
        if (/\bhours?\b|\bopen\b|\bschedule\b|\btiming\b|\bwhen\b/i.test($el.text())) {
            const text = siblingsText($, $el);
            if (text) fromHeadings += " " + text;
        }
    });
    if (fromHeadings.trim()) return fromHeadings.trim();

    // Priority 3 — regex scan for day + time patterns in raw body text
    const DAY_TIME =
        /(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)[^.\n]{0,60}\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi;
    const matches = unique((bodyText.match(DAY_TIME) || []));
    return matches.slice(0, 10).join("\n");
}

function extractServices($) {
    const services = new Set();

    // Class/id heuristic
    const SEL =
        "[class*='service'],[id*='service'],[class*='offering'],[id*='offering']," +
        "[class*='what-we'],[id*='what-we']";

    $(SEL).each((_, el) => {
        const $el = $(el);
        const heading = $el.find("h2,h3,h4,h5").first().text().trim();
        if (heading && heading.length < 120) services.add(heading);
        $el.find("li").each((_, li) => {
            const t = $(li).text().trim();
            if (t.length > 3 && t.length < 120) services.add(t);
        });
    });

    // Heading heuristic
    $("h1,h2,h3,h4").each((_, el) => {
        const $el = $(el);
        if (/service|what we (do|offer|provide)|our (offer|work|solution)/i.test($el.text())) {
            let $sib  = $el.next();
            let steps = 0;
            while ($sib.length && !$sib.is("h1,h2,h3,h4") && steps < 8) {
                $sib.find("li").each((_, li) => {
                    const t = $(li).text().trim();
                    if (t.length > 3 && t.length < 120) services.add(t);
                });
                $sib = $sib.next();
                steps++;
            }
        }
    });

    return unique([...services]);
}

function extractPrograms($) {
    const programs = new Set();

    const SEL =
        "[class*='program'],[id*='program'],[class*='course'],[id*='course']," +
        "[class*='curriculum'],[id*='curriculum'],[class*='class'],[id*='class']";

    $(SEL).each((_, el) => {
        const $el = $(el);
        const heading = $el.find("h2,h3,h4,h5").first().text().trim();
        if (heading && heading.length < 120) programs.add(heading);
        $el.find("li").each((_, li) => {
            const t = $(li).text().trim();
            if (t.length > 3 && t.length < 120) programs.add(t);
        });
    });

    $("h1,h2,h3,h4").each((_, el) => {
        const $el = $(el);
        if (/program|class(?:es)?|course|curriculum|what we teach|our training/i.test($el.text())) {
            let $sib  = $el.next();
            let steps = 0;
            while ($sib.length && !$sib.is("h1,h2,h3,h4") && steps < 8) {
                $sib.find("li").each((_, li) => {
                    const t = $(li).text().trim();
                    if (t.length > 3 && t.length < 120) programs.add(t);
                });
                $sib = $sib.next();
                steps++;
            }
        }
    });

    return unique([...programs]);
}

function extractAgeGroups($, bodyText) {
    const groups = new Set();

    // Class/id heuristic
    $("[class*='age'],[id*='age'],[class*='group'],[id*='group'],[class*='level'],[id*='level']")
        .each((_, el) => {
            const text = clean($(el).text());
            if (
                /\d+.*(?:year|month|age)|\b(?:infant|toddler|preschool|teen|adult)\b/i.test(text) &&
                text.length < 200
            ) {
                groups.add(text);
            }
        });

    // Regex patterns on raw body text
    const PATTERNS = [
        /\bages?\s+\d+\s*[-–to]+\s*\d+\b/gi,
        /\b\d+\s*[-–]\s*\d+\s*years?\s*(?:old)?\b/gi,
        /\b\d+\+\s*years?\s*(?:old)?\b/gi,
        /\b(?:infant|toddler|preschool(?:er)?|kindergarten|junior|teen(?:ager)?|adult)s?\b/gi,
        /\b\d+\s*months?\s*(?:to|[-–])\s*\d+\s*(?:months?|years?)\b/gi,
    ];

    for (const pattern of PATTERNS) {
        (bodyText.match(pattern) || []).forEach((m) => groups.add(m.trim()));
    }

    return unique([...groups]);
}

function extractFAQs($) {
    const faqs = [];
    const seen = new Set();

    const add = (q, a) => {
        q = clean(q);
        a = clean(a);
        if (!q || seen.has(q.toLowerCase())) return;
        seen.add(q.toLowerCase());
        faqs.push({ question: q, answer: a });
    };

    // <details> / <summary> — semantic HTML FAQs
    $("details").each((_, el) => {
        const $el = $(el);
        const q   = $el.find("summary").text().trim();
        const a   = $el.find("p,div").not("summary").first().text().trim();
        if (q) add(q, a);
    });

    // Class/id heuristic
    const SEL =
        "[class*='faq'],[id*='faq'],[class*='accordion'],[id*='accordion']," +
        "[class*='question-answer'],[id*='question-answer']";

    $(SEL).each((_, el) => {
        const $el = $(el);
        const q   = $el
            .find("[class*='question'],[class*='title'],summary,h3,h4,h5")
            .first()
            .text()
            .trim();
        const a   = $el
            .find("[class*='answer'],[class*='content'],[class*='body'],p")
            .first()
            .text()
            .trim();
        if (q) add(q, a);
    });

    // FAQ section heading → nested h3/h4 + next <p> pattern
    $("h1,h2,h3").each((_, el) => {
        const $el = $(el);
        if (/\bfaq\b|frequently asked|common question/i.test($el.text())) {
            $el.parent()
                .find("h3,h4,h5")
                .each((_, sub) => {
                    const q = $(sub).text().trim();
                    const a = $(sub).next("p").text().trim();
                    if (q) add(q, a);
                });
        }
    });

    return faqs;
}

// ── content blob ──────────────────────────────────────────────────────────────
// Removes structural chrome and returns clean paragraph text.
// Called LAST because it mutates the cheerio tree.

function extractBodyText($) {
    $("noscript,svg,iframe,canvas").remove();
    $("nav,header,footer").remove();
    $("[role='navigation'],[role='banner'],[role='contentinfo']").remove();
    $("[data-elementor-type='popup']").remove();
    $(".elementor-invisible,.elementor-hidden").remove();
    $("[aria-hidden='true']").remove();

    // Insert newlines at block boundaries so output reads as paragraphs
    $("p,h1,h2,h3,h4,h5,h6,li,br,section,article,blockquote").each((_, el) => {
        $(el).prepend("\n");
    });

    return $("body")
        .clone()
        .find("script,style,template,noscript,svg,iframe,canvas")
        .remove()
        .end()
        .text()
        .replace(/[ \t]+/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// Prepend labelled summary sections to the body text so the paragraph scorer
// in ai.service.js can match structured fields directly without a schema change.
function buildContent({ title, description, services, programs, ageGroups, contactInfo, businessHours, faqs, bodyText }) {
    const lines = [];

    if (title)             lines.push(`Business name: ${title}.`);
    if (description)       lines.push(`About: ${description}.`);
    if (services.length)   lines.push(`Services offered: ${services.join(", ")}.`);
    if (programs.length)   lines.push(`Programs and classes: ${programs.join(", ")}.`);
    if (ageGroups.length)  lines.push(`Age groups served: ${ageGroups.join(", ")}.`);
    if (contactInfo)       lines.push(`Contact information:\n${contactInfo}.`);
    if (businessHours)     lines.push(`Business hours:\n${businessHours}.`);

    if (faqs?.length) {
        lines.push("\nFrequently Asked Questions:");
        for (const { question, answer } of faqs) {
            lines.push(`Q: ${question}`);
            if (answer) lines.push(`A: ${answer}`);
        }
    }

    if (lines.length) lines.push("");   // blank line before body
    lines.push(bodyText);

    return lines.join("\n");
}

// ── multi-page crawler ────────────────────────────────────────────────────────

async function crawlPages(startUrl) {
    const origin = new URL(startUrl).origin;

    // `visited` prevents re-fetching; `queued` prevents duplicate queue entries.
    const visited = new Set();
    const queued  = new Set();
    const queue   = [];
    const pages   = [];

    const seedUrl = normalizeUrl(startUrl, startUrl) ?? startUrl;
    queue.push({ url: seedUrl, score: 100 });
    queued.add(seedUrl);

    while (queue.length > 0 && pages.length < MAX_PAGES) {
        // Always process the highest-priority URL next.
        queue.sort((a, b) => b.score - a.score);
        const { url } = queue.shift();

        if (visited.has(url)) continue;
        visited.add(url);

        try {
            const html = await fetchHtml(url);
            const $    = cheerio.load(html);

            // Discover more links while we still have page budget.
            if (pages.length < MAX_PAGES - 1) {
                for (const link of extractInternalLinks($, url, origin)) {
                    if (!visited.has(link.url) && !queued.has(link.url)) {
                        queue.push(link);
                        queued.add(link.url);
                    }
                }
            }

            // Capture title + description before any DOM mutation.
            const pageTitle       = $("title").text().trim();
            const pageDescription = pages.length === 0
                ? ($('meta[name="description"]').attr("content")?.trim() ?? "")
                : "";

            // Extractors that need the full DOM (including footer) run first.
            const rawBodyText   = $("body").text();
            const contactInfo   = extractContactInfo($);
            const businessHours = extractBusinessHours($, rawBodyText);
            const ageGroups     = extractAgeGroups($, rawBodyText);
            const services      = extractServices($);
            const programs      = extractPrograms($);
            const faqs          = extractFAQs($);

            // extractBodyText mutates the DOM — must run last.
            const bodyText = extractBodyText($);

            pages.push({
                url,
                title:       pageTitle,
                description: pageDescription,
                contactInfo,
                businessHours,
                ageGroups,
                services,
                programs,
                faqs,
                bodyText,
            });

            if (process.env.NODE_ENV !== "production") {
                console.log(`[CRAWLER] ✓ (${pages.length}/${MAX_PAGES}) ${url}`);
            }
        } catch (err) {
            if (process.env.NODE_ENV !== "production") {
                console.warn(`[CRAWLER] ✗ Skipping ${url} — ${err.message}`);
            }
        }
    }

    return pages;
}

// ── public API ────────────────────────────────────────────────────────────────

export const extractWebsiteMetadata = async (websiteUrl) => {
    if (!websiteUrl.startsWith("http")) {
        websiteUrl = `https://${websiteUrl}`;
    }

    await validatePublicUrl(websiteUrl);

    // Firecrawl handles JS-rendered (React/Next.js/etc.) sites that cheerio cannot.
    // Used automatically when FIRECRAWL_API_KEY is present in the environment.
    const firecrawlResult = await scrapeWebsiteWithFirecrawl(websiteUrl);
    if (firecrawlResult) {
        console.log("[SCRAPER] Firecrawl succeeded. content length:", firecrawlResult.content.length);
        return firecrawlResult;
    }

    console.log("[SCRAPER] Using cheerio crawler (Firecrawl unavailable or failed)");

    const pages = await crawlPages(websiteUrl);

    if (pages.length === 0) {
        throw new Error("Could not retrieve any content from the provided URL.");
    }

    // Merge structured data across all crawled pages.
    const servicesSet  = new Set();
    const programsSet  = new Set();
    const ageGroupsSet = new Set();
    const allFaqs      = [];
    const seenFaqQs    = new Set();
    const contactParts = new Set();
    let   businessHours = "";
    const bodyParts    = [];

    for (const page of pages) {
        page.services.forEach((s)  => servicesSet.add(s));
        page.programs.forEach((p)  => programsSet.add(p));
        page.ageGroups.forEach((a) => ageGroupsSet.add(a));

        for (const faq of page.faqs) {
            const key = faq.question.toLowerCase().trim();
            if (!seenFaqQs.has(key)) {
                seenFaqQs.add(key);
                allFaqs.push(faq);
            }
        }

        if (page.contactInfo) {
            page.contactInfo
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .forEach((l) => contactParts.add(l));
        }

        // Use the first page that has business hours.
        if (!businessHours && page.businessHours) {
            businessHours = page.businessHours;
        }

        if (page.bodyText.trim()) bodyParts.push(page.bodyText);
    }

    const title       = pages[0].title;
    const description = pages[0].description;
    const services    = [...servicesSet];
    const programs    = [...programsSet];
    const ageGroups   = [...ageGroupsSet];
    const faqs        = allFaqs;
    const contactInfo = [...contactParts].join("\n");
    const bodyText    = bodyParts.join("\n\n");

    const content = buildContent({
        title,
        description,
        services,
        programs,
        ageGroups,
        contactInfo,
        businessHours,
        faqs,
        bodyText,
    });

    const crawledPages = pages.map((p) => p.url);

    if (process.env.NODE_ENV !== "production") {
        console.log("\n[CRAWLER AUDIT] ─────────────────────────────────");
        console.log("[crawledPages]  ", crawledPages);
        console.log("[services]      ", services.length      ? services      : "(empty)");
        console.log("[programs]      ", programs.length      ? programs      : "(empty)");
        console.log("[ageGroups]     ", ageGroups.length     ? ageGroups     : "(empty)");
        console.log("[contactInfo]   ", contactInfo          ? contactInfo   : "(empty)");
        console.log("[businessHours] ", businessHours        ? businessHours : "(empty)");
        console.log("[faqs]          ", faqs.length          ? faqs          : "(empty)");
        console.log("[CRAWLER AUDIT END] ───────────────────────────────\n");
    }

    return {
        title,
        description,
        services,
        programs,
        ageGroups,
        faqs,
        contactInfo,
        businessHours,
        content,
        crawledPages,
    };
};
