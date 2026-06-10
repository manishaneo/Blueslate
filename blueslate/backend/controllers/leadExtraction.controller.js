import { extractLeadData } from "../services/leadExtraction.service.js";

export const extractLeadHandler = async (req, res) => {
    try {
        const { message } = req.body;

        const extractedLead = extractLeadData(message);

        res.json({
            success: true,
            data: extractedLead,
        });
    } catch (error) {
        console.error("Extract lead error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
