import api from "../api";

const signUpApi = async (body) => {
  const res = await api.post(`member/sign-up`, body);
  return res.data;
};

export default signUpApi;
