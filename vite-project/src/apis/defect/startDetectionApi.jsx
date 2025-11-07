import api from "../api";

const startDetectionApi = async () => {
  try {
    const response = await api.post("start-detection");
    return response.data;
  } catch (error) {
    console.error("Error starting detection:", error);
    throw error;
  }
};

export default startDetectionApi;
