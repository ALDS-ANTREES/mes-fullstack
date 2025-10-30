import api from "../api";

const getDefectStatsApi = async () => {
  const res = await api.get(`defects/stats`);
  return res.data; // will return { totalCount, normalCount }
};

export default getDefectStatsApi;
