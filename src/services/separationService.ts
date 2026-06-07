import { SeparationJob } from "../models/separations-jobs/SeparationJob";
import { SeparationOption } from "../models/separations-jobs/SeparationOption";
import { SeparationRequest } from "../models/separations-jobs/SeparationRequest";
import { SeparationStatusResponse } from "../models/separations-jobs/SeparationStatusResponse";
import { API_SEPARATIONS_ENDPOINTS } from "../shared/api-endpoints";
import { handleApiError } from "../utils/handleApiError";
import { api } from "./api";
import { DocumentPickerAsset } from "expo-document-picker";

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

export async function requestSeparation(
    // clientId: number, option: SeparationOption, file: DocumentPickerAsset
    formData: FormData
): Promise<SeparationStatusResponse> {
    try {
        // const formData = new FormData();
        // formData.append("clientId", clientId.toString());
        // formData.append("file", {
        //     uri: file.uri,
        //     type: file.mimeType || "audio/mpeg", // obavezno MIME type
        //     name: file.name || "song.mp3",       // ime fajla
        // } as any);
        // formData.append("option", option);
        const response = await api.post<SeparationStatusResponse>(
            API_SEPARATIONS_ENDPOINTS.separate, 
            formData,
            { 
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 2 * 60 * 1000,
            }
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

export async function downloadSeparation(jobId: string): Promise<ArrayBuffer> {
    try {
        const response = await api.get<ArrayBuffer>(
            API_SEPARATIONS_ENDPOINTS.downloadSeparation(jobId),
            { responseType: "arraybuffer" }
        );
        return response.data;
    } catch(error: any) {
        throw handleApiError(error);
    }
};