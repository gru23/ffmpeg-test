import { SeparationStatus } from "./SeparationStatus";

export interface SeparationStatusResponse {
    jobId: string;
    status: SeparationStatus;
    resultURL: string;
};