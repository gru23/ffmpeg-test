import { SeparationOption } from "./SeparationOption";
import { SeparationStatus } from "./SeparationStatus";

export interface SeparationJob {
    id: string;
    option: SeparationOption;
    status: SeparationStatus;
    sourcePath: string;
    separatedPath: string;
    finishedAt: string;
};