import api from "../utils/api";

export const getAnalytics = () => api.get("/analytics").then((r) => r.data.data);
export const getAnalyticsDashboard = (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/analytics/dashboard?${params}`).then((r) => r.data.data);
};
