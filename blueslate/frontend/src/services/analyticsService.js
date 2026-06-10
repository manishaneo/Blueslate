import api from "../utils/api";

export const getAnalytics = () => api.get("/analytics").then((r) => r.data.data);
