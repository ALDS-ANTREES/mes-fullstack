import api from "../api";

const checkAuthApi = async (body) => {
  const res = await api.get(`member/check-auth`, body);
  return res.data;
};

export default checkAuthApi;
