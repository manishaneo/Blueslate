import { createLeadForActiveContext, getLead, getLeads, updateLeadStatus, getLeadConversations } from "../services/lead.service.js";

const VALID_STATUSES = new Set(["NEW", "CONTACTED", "CONVERTED"]);

const escapeCSV = (value) => {
    if (value == null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const createLeadHandler = async (req, res, next) => {
    try {
        const { name, email, phone, interest, notes } = req.body;
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;

        const lead = await createLeadForActiveContext(
            req.user.id,
            activeBusinessId,
            { name, email, phone, interest, notes }
        );

        res.status(201).json({
            success: true,
            data: lead,
        });
    } catch (error) {
        next(error);
    }
};

export const exportLeadsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const leads = await getLeads(req.user.id, activeBusinessId);

        const header = ["Name", "Email", "Phone", "Interest", "Notes", "Source", "Status", "Created At"].join(",");
        const rows = leads.map((lead) =>
            [
                escapeCSV(lead.name),
                escapeCSV(lead.email),
                escapeCSV(lead.phone),
                escapeCSV(lead.interest),
                escapeCSV(lead.notes),
                escapeCSV(lead.source),
                escapeCSV(lead.status),
                escapeCSV(new Date(lead.createdAt).toLocaleString()),
            ].join(",")
        );

        const csv = [header, ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
        res.send(csv);
    } catch (error) {
        next(error);
    }
};

export const getLeadHandler = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid lead ID." });
        }
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const lead = await getLead(id, req.user.id, activeBusinessId);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found." });
        }
        res.json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

export const getLeadsHandler = async (req, res, next) => {
    try {
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const leads = await getLeads(req.user.id, activeBusinessId);

        res.json({
            success: true,
            data: leads,
        });
    } catch (error) {
        next(error);
    }
};

export const getLeadConversationsHandler = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: "Invalid lead ID." });
        }
        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const conversations = await getLeadConversations(id, req.user.id, activeBusinessId);
        res.json({ success: true, data: conversations });
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ success: false, message: "Lead not found." });
        }
        next(error);
    }
};

export const updateLeadStatusHandler = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID.",
            });
        }

        const { status } = req.body;

        if (!status || !VALID_STATUSES.has(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${[...VALID_STATUSES].join(", ")}.`,
            });
        }

        const activeBusinessId = req.headers["x-active-business-id"] ?? null;
        const lead = await updateLeadStatus(id, status, req.user.id, activeBusinessId);

        res.json({
            success: true,
            data: lead,
        });
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Lead not found.",
            });
        }
        next(error);
    }
};
