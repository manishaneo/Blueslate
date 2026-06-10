import api from "../utils/api";

export const getLeads = async () => {
    const response = await api.get("/leads");
    return response.data;
};

export const getDashboardStats = async () => {
    const response = await api.get("/dashboard/stats");
    return response.data;
};

export const updateLeadStatus = async (id, status) => {
    const response = await api.patch(`/leads/${id}/status`, { status });
    return response.data;
};
