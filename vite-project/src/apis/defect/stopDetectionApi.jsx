import api from "../api";

const stopDetectionApi = async () => {
  try {
    // 백엔드 서버를 통해 프록시 요청 (CORS 문제 해결)
    const response = await api.post("raspberry/stop");
    return response.data;
  } catch (error) {
    console.error("Error stopping detection:", error);
    throw error;
  }
};

export default stopDetectionApi;

