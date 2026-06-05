import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const sendMessage = async (businessContextId, question) => {
    const response = await axios.post(`${API_URL}/chat`, {
        businessContextId,
        question,
    });

    return response.data;
};
