import { SeparationOption } from "./SeparationOption";

export interface SeparationRequest {
    clientId: number;
    file: Blob;
    option: SeparationOption;
};