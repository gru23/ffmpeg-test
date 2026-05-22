import { DocumentPickerAsset } from "expo-document-picker";
import { SeparationOption } from "./SeparationOption";

export interface SeparationRequest {
    clientId: number;
    file: DocumentPickerAsset;
    option: SeparationOption;
};