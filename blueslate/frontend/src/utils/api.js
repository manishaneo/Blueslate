import axios from "axios";
import { getToken, getActiveBusinessId } from "./auth";

const api = axios.create({
    baseURL: "http://localhost:5000/api",
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
