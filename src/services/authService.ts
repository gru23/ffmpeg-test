import axios from "axios";
import { ClientRequest } from "../models/auth/ClientRequest";
import { ConfirmResetPasswordRequest } from "../models/auth/ConfirmResetPasswordRequest";
import { LoginRequest } from "../models/auth/LoginRequest";
import { LoginResponse } from "../models/auth/LoginResponse";
import { LogoutRequest } from "../models/auth/LogoutRequest";
import { RefreshRequest } from "../models/auth/RefreshRequest";
import { ResetPasswordRequest } from "../models/auth/ResetPasswordRequest";
import { Client } from "../models/clients/Client";
import { API_AUTH_ENDPOINTS } from "../shared/api-endpoints";
import { handleApiError } from "../utils/handleApiError";
import { api } from "./api";
import { getAccessToken, saveTokens } from "../utils/authStorage";
import { saveClient } from "../utils/clientStorage";

export async function login(request: LoginRequest): Promise<LoginResponse> {
    try {
        const response = await api.post<LoginResponse>(API_AUTH_ENDPOINTS.login, request);
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function registration(request: ClientRequest): Promise<Client> {
    try {
        const response = await api.post<Client>(API_AUTH_ENDPOINTS.registration, request);
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function logout(request: LogoutRequest): Promise<void> {
    try {
        await api.post<void>(API_AUTH_ENDPOINTS.logout, request);
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function checkJwtValid(): Promise<boolean> {
    const jwt = await getAccessToken();
    if(!jwt)
        return false;
    try {
        const response = await checkSession();
        if(response) {
            await saveClient(response);
            return true;
        }
        return false;
    } catch(err: any) {
        return false;
    }
}

async function checkSession(): Promise<Client> {
    try {
        const response = await api.get<Client>(API_AUTH_ENDPOINTS.checkSession);
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function refreshJwt(request: RefreshRequest): Promise<string> {
    // try {
    //     const response = await api.post<string>(API_AUTH_ENDPOINTS.refreshSession, request);
    //     return response.data;
    // } catch(error: any) {
    //     throw handleApiError(error);
    // }
    const response = await axios.post(API_AUTH_ENDPOINTS.refreshSession, request);
    return response.data;
};

export async function requestPasswordReset(request: ResetPasswordRequest): Promise<string> {
    try {
        const response = await api.post<string>(API_AUTH_ENDPOINTS.requestResetPassword, request);
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function confirmPasswordReset(request: ConfirmResetPasswordRequest): Promise<string> {
    try {
        const response = await api.post<string>(API_AUTH_ENDPOINTS.confirmResetPassword, request);
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};