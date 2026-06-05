import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const getLeads = async () => {
    const response = await axios.get(`${API_URL}/leads`);
    return response.data;
};

export const getDashboardStats = async () => {
    const response = await axios.get(`${API_URL}/dashboard/stats`);
    return response.data;
};

export const updateLeadStatus = async (id, status) => {
    const response = await axios.patch(`${API_URL}/leads/${id}/status`, { status });
    return response.data;
};
