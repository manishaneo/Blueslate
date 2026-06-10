import {
    getConversations,
    getConversationById,
    finalizeConversation,
} from "../services/conversations.service.js";

const VALID_SORTS   = ["newest", "oldest", "messages"];
const VALID_SOURCES = ["customer_portal", "customer_portal_chat", "customer_portal_voice", "business_chat", "receptionist"];

const isValidDate = (d) =>
    typeof d === "string" && d.length > 0 && !isNaN(new Date(d).getTime());

// ── GET /api/conversations ────────────────────────────────────────────────────

export const getConversationsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;

        const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

        // Allowlist: supports comma-separated values e.g. "customer_portal_chat,business_chat"
        const rawSource = typeof req.query.source === "string" ? req.query.source : "";
        const sourceArr = rawSource.split(",").map((s) => s.trim()).filter((s) => VALID_SOURCES.includes(s));
        const source    = sourceArr.length > 0 ? sourceArr : null;
        const sort   = VALID_SORTS.includes(req.query.sort)     ? req.query.sort   : "newest";

        // "true" → true, "false" → false, anything else → null (no filter).
        const hasLead = req.query.hasLead === "true"  ? true
                      : req.query.hasLead === "false" ? false
                      : null;

        // Trim and cap search string to prevent excessively long patterns.
        const rawSearch = typeof req.query.search === "string" ? req.query.search.trim() : "";
        const search    = rawSearch.length > 0 ? rawSearch.slice(0, 200) : null;

        const dateFrom  = isValidDate(req.query.dateFrom) ? req.query.dateFrom : null;
        const dateTo    = isValidDate(req.query.dateTo)   ? req.query.dateTo   : null;
        const escalated = req.query.escalated === "true" ? true : null;

        const data = await getConversations(req.user.id, activeBusinessId, {
            page, limit, source, sort, hasLead, search, dateFrom, dateTo, escalated,
        });

        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/conversations/:id ────────────────────────────────────────────────

export const getConversationByIdHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const data = await getConversationById(
            req.user.id,
            activeBusinessId,
            req.params.id,
        );
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/conversations/:id ─────────────────────────────────────────────

export const finalizeConversationHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const { metadata } = req.body;

        const data = await finalizeConversation(
            req.user.id,
            activeBusinessId,
            req.params.id,
            { metadata: typeof metadata === "object" && metadata !== null ? metadata : {} },
        );
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};
