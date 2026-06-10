import api from "../utils/api";

export const getConversations = (params = {}) =>
    api.get("/conversations", { params }).then((r) => r.data.data);

export const getConversationById = (id) =>
    api.get(`/conversations/${id}`).then((r) => r.data.data);

export const patchConversation = (id, data) =>
    api.patch(`/conversations/${id}`, data).then((r) => r.data.data);
