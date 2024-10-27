import axios from "axios";

axios.interceptors.request.use((config) => {
    config.headers["Content-Type"] = "application/json";
    config.headers["signature"] = localStorage.getItem("signature");
    return config;
})

export const getUserInfo = async () => {
    try {
        const response = await axios.get("http://localhost:3008/user-info");
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getFunds = async () => {
    try {
        const response = await axios.get<Fund[]>("http://localhost:3008/funds");
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const investFund = async (fundId: string, amount: number) => {
    try {
        const response = await axios.post("http://localhost:3008/invest", {
            fundId,
            amount
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getInvests = async () => {
    try {
        const response = await axios.get<Investment[]>("http://localhost:3008/investments");
        return response.data;
    } catch (error) {
        throw error;
    }
}