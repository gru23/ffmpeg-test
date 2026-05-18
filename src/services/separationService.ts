import { SeparationJob } from "../models/separations-jobs/SeparationJob";
import { SeparationRequest } from "../models/separations-jobs/SeparationRequest";
import { SeparationStatusResponse } from "../models/separations-jobs/SeparationStatusResponse";
import { API_SEPARATIONS_ENDPOINTS } from "../shared/api-endpoints";
import { handleApiError } from "../utils/handleApiError";
import { api } from "./api";

export async function getById(id: string): Promise<SeparationJob> {
    try {
        const response = await api.get<SeparationJob>(API_SEPARATIONS_ENDPOINTS.separationById(id));
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function deleteSeparation(id: string): Promise<void> {
    try {
        await api.delete(API_SEPARATIONS_ENDPOINTS.separationById(id));
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function requestSeparation(request: SeparationRequest): Promise<SeparationStatusResponse> {
    try {
        const formData = new FormData();
        formData.append("clientId", request.clientId.toString());
        formData.append("file", request.file);
        formData.append("option", request.option);
        const response = await api.post<SeparationStatusResponse>(
            API_SEPARATIONS_ENDPOINTS.separate, 
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function getStatus(jobId: string): Promise<SeparationStatusResponse> {
    try {
        const response = await api.get<SeparationStatusResponse>(API_SEPARATIONS_ENDPOINTS.status(jobId));
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};

export async function downloadSeparation(jobId: string): Promise<Blob> {
    try {
        const response = await api.get<Blob>(
            API_SEPARATIONS_ENDPOINTS.downloadSeparation(jobId),
            { responseType: "blob" }
        );
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};