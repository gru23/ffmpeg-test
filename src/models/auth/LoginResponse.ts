import { Client } from "../clients/Client";

export interface LoginResponse extends Client {
    accessToken: string;
    refreshToken: string;
};