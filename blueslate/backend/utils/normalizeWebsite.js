/**
 * Normalizes a raw website URL into a canonical hostname-only form.
 *
 * Rules applied in order:
 *   1. Prepend https:// if no scheme is present
 *   2. Parse with URL() — throws on invalid input
 *   3. Lowercase the hostname
 *   4. Strip leading www.
 *   5. Return https://<hostname>  (no path, no trailing slash)
 *
 * Examples (all produce "https://xpleague.com"):
 *   xpleague.com
 *   https://xpleague.com
 *   https://www.xpleague.com/
 *   https://xpleague.com/about/pricing
 *
 * Throws a plain Error on unparseable input. Callers that need an HTTP
 * response should catch and convert to AppError.
 */
export function normalizeWebsite(raw) {
    if (!raw || typeof raw !== "string" || !raw.trim()) {
        throw new Error("Website must be a non-empty string.");
    }

    let url = raw.trim();

    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }

    const parsed = new URL(url); // throws TypeError on bad input

    let hostname = parsed.hostname.toLowerCase();

    if (hostname.startsWith("www.")) {
        hostname = hostname.slice(4);
    }

    return "https://" + hostname;
}
