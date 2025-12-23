import axios from "axios";

const stopDetectionApi = async () => {
  try {
    const baseUrl = import.meta.env.VITE_RASPBERRY_PI_API_URL || 
      "https://historically-conditional-kelley.ngrok-free.dev";
    const response = await axios.post(
      `${baseUrl}/stop`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error stopping detection:", error);
    throw error;
  }
};

export default stopDetectionApi;

