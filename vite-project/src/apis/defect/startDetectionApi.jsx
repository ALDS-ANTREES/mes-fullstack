import api from "../api";

const startDetectionApi = async () => {
  try {
    // 백엔드 서버를 통해 프록시 요청 (CORS 문제 해결)
    const response = await api.post("raspberry/start");
    return response.data;
  } catch (error) {
    console.error("Error starting detection:", error);
    throw error;
  }
};

export default startDetectionApi;
