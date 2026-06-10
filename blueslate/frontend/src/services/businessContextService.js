import api from "../utils/api";

export const createBusinessContext = async (websiteUrl) => {
    const response = await api.post("/business-context", { websiteUrl });
    return response.data;
};
