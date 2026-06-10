import { addBusiness } from "../services/addBusiness.service.js";

export const addBusinessHandler = async (req, res, next) => {
    try {
        const { businessName, website } = req.body;

        const result = await addBusiness({
            userId: req.user.id,
            businessName,
            website,
        });

        return res.status(201).json({
            success: true,
            data:    result,
        });
    } catch (err) {
        next(err);
    }
};
