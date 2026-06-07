import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system/legacy';
import { SeparationJob } from "../models/separations-jobs/SeparationJob";
import { deleteSeparation } from "../services/separationService";

const SEPARATIONS_KEYS = "separations";
export const SEPARATIONS_PATH = FileSystem.documentDirectory + "separations";

export async function setSeparations(separations: SeparationJob[]) {
    await AsyncStorage.setItem(SEPARATIONS_KEYS, JSON.stringify(separations));
}

export async function getSeparations() {
  try {
    const raw = await AsyncStorage.getItem(SEPARATIONS_KEYS);
    return raw ? JSON.parse(raw) as SeparationJob[] : [];
  } catch (err) {
    console.error("Error parsing separations:", err);
    return [];
  }
}

export async function getSeparationById(id: string) {
    const separations = await getSeparations();
    return separations.find(s => s.id === id) ?? null;
};

export async function deleteSeparationById(id: string) {
    try {
        await deleteSeparation(id);

        const separations = await getSeparations();
        const filtered = separations.filter(s => s.id !== id);
        await setSeparations(filtered);

        const folderPath = `${SEPARATIONS_PATH}/${id}`;
        await FileSystem.deleteAsync(folderPath, { idempotent: true });
    } catch (error) {
        console.error("Error deleting separation:", error);
        throw error;
    }
}

export async function addSeparation(job: SeparationJob) {
  const separations = await getSeparations();
  separations.push(job);
  await setSeparations(separations);
}

export async function createSeparationDirectory(separationId: string) {
    const destPath = `${SEPARATIONS_PATH}/${separationId}`;
    const folderInfo = await FileSystem.getInfoAsync(destPath);
    
    if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(destPath, { intermediates: true });
    }
  return destPath;
}