import axios, { InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "../utils/authStorage";
import { refreshJwt } from "./authService";

export const api = axios.create({
  //timeout: 7000
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if(error.response?.status === 401 && error.response?.data?.message === "TOKEN_EXPIRED") {
      console.log("Interceptor: TOKEN_EXPIRED, pokušavam refresh...");
      originalRequest._retry = true;

      const refreshToken = await getRefreshToken();
      if(!refreshToken) return Promise.reject(error);

      try {
        const newJwt = await refreshJwt({refreshToken: refreshToken});
        console.log("Interceptor: dobio novi JWT", newJwt);
        await saveTokens(newJwt, refreshToken);
        originalRequest.headers["Authorization"] = `Bearer ${newJwt}`;
        return api(originalRequest);
      } catch(refreshError) {
        console.error("Interceptor: refresh nije uspio", refreshError);
        await clearTokens();
        // preci na stranicu logina
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);