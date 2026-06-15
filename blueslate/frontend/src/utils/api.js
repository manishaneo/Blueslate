import axios from "axios";
import { getToken, getActiveBusinessId } from "./auth";

export const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const activeBusinessId = getActiveBusinessId();
    if (activeBusinessId) {
        config.headers["X-Active-Business-Id"] = activeBusinessId;
    }

    return config;
});

export default api;
