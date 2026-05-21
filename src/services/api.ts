import axios, { InternalAxiosRequestConfig } from "axios";
import { getAccessToken } from "../utils/authStorage";

export const api = axios.create();

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});