import api from "../api";

const sendDefectData = async () => {
  const device_id = `device-${Math.floor(Math.random() * 1000)}`;
  const value = Math.floor(Math.random() * 126); // Random value between 0 and 125

  try {
    const response = await api.post("defects", {
      device_id,
      value,
    });

    const result = response.data;
    console.log(`Sent data for ${device_id} with value ${value}:`, result);
  } catch (error) {
    console.error("Error sending defect data:", error);
  }
};

const startSendingDefectData = () => {
  console.log("Starting to send defect data every 3 seconds...");
  setInterval(sendDefectData, 3000);
};

export default startSendingDefectData;
