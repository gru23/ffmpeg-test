import axios, { InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

export const api = axios.create();

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync("jwt");
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});