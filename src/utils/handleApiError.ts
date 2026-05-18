import axios from "axios";

export interface ApiError {
    status: number;
    message: string;
}

export function handleApiError(error: unknown): ApiError {
    if(axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message =
        (error.response.data as any)?.message ??
        (status === 404
            ? "Resource not found"
            : status === 409
            ? "Conflict occurred"
            : "Unexpected error");

        return { status, message };
    }
    return { status: 0, message: "Network error" };
}