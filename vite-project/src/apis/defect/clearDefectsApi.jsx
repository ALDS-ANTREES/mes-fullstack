import api from "../api";

const clearDefectsApi = async () => {
  const res = await api.post(`defects/clear`);
  return res.data;
};

export default clearDefectsApi;
