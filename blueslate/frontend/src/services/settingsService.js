import api from "../utils/api";

export const getSettings     = ()     => api.get("/settings").then((r) => r.data.data);
export const updateSettings  = (data) => api.patch("/settings", data).then((r) => r.data.data);
export const retrainAI       = ()     => api.post("/settings/retrain").then((r) => r.data);
export const getKnowledgeBase = ()    => api.get("/knowledge-base").then((r) => r.data.data);
