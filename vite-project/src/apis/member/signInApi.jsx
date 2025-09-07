import api from "../api";

const signInApi = async (body) => {
  const res = await api.post(`member/sign-in`, body);
  return res.data;
};

export default signInApi;
