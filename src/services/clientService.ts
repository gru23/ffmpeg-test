import axios from "axios";
import { api } from "./api";
import { Client } from "../models/clients/Client";
import { API_CLIENTS_ENDPOINTS } from "../shared/api-endpoints";
import { ClientUpdateRequest } from "../models/clients/ClientUpdateRequest";
import { handleApiError } from "../utils/handleApiError";
import { ChangePasswordRequest } from "../models/clients/ChangePasswordRequest";
import { SeparationJob } from "../models/separations-jobs/SeparationJob";

export async function getById(id: number): Promise<Client> {
    try {
        const response = await api.get<Client>(API_CLIENTS_ENDPOINTS.clientById(id));
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function update(id: number, client: ClientUpdateRequest): Promise<Client> {
    try {
        const response = await api.put<Client>(API_CLIENTS_ENDPOINTS.clientById(id), client);
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function deleteClient(id: number): Promise<void> {
    try{
        await api.delete(API_CLIENTS_ENDPOINTS.clientById(id));
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function changePassword(newPassword: ChangePasswordRequest): Promise<string> {
    try {
        const response = await api.post<string>(API_CLIENTS_ENDPOINTS.changePassword, newPassword);
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function usernameAvailable(username: string): Promise<boolean> {
    try {
        const response = await axios.get<boolean>(
            API_CLIENTS_ENDPOINTS.usernameAvailable,
            { params: { username } }
        );
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function getAllSeparations(clientId: number): Promise<SeparationJob[]> {
    try {
        const response = await api.get<SeparationJob[]>
            (API_CLIENTS_ENDPOINTS.clientsSeparations(clientId));
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};