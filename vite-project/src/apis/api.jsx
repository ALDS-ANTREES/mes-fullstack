import axios from "axios";
import { toApiError } from "../utils/apiError";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(toApiError(err))
);

export default api;
