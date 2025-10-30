import api from "../api";

const getDefectsApi = async () => {
  const res = await api.get(`defects/latest`);
  return res.data;
};

export default getDefectsApi;
