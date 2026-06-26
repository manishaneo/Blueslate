import api from "../utils/api";

export const getRequests = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/requests?${params}`);
    return response.data;
};

export const getRequestById = async (id) => {
    const response = await api.get(`/requests/${id}`);
    return response.data;
};

export const updateRequestStatus = async (id, status) => {
    const response = await api.patch(`/requests/${id}/status`, { status });
    return response.data;
};

export const assignRequest = async (id, assigneeId) => {
    const response = await api.patch(`/requests/${id}/assign`, { assigneeId });
    return response.data;
};

export const addInternalNote = async (id, content) => {
    const response = await api.post(`/requests/${id}/notes`, { content });
    return response.data;
};

export const getInternalNotes = async (id) => {
    const response = await api.get(`/requests/${id}/notes`);
    return response.data;
};
