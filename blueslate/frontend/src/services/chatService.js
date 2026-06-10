import api from "../utils/api";

export const sendMessage = async (question, conversationId = null, source = "business_chat") => {
    const response = await api.post("/chat", { question, conversationId, source });
    return response.data;
};

// Calls /api/chat/test — no persistence, no lead creation, no analytics impact.
export const sendTestMessage = async (question) => {
    const response = await api.post("/chat/test", { question });
    return response.data;
};

export const finalizeConversation = async (conversationId, metadata) => {
    const response = await api.patch(`/conversations/${conversationId}`, { metadata });
    return response.data;
};
