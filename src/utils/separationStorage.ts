import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system/legacy';
import { SeparationJob } from "../models/separations-jobs/SeparationJob";
import { deleteSeparation } from "../services/separationService";
import { downloadAndStoreSeparation } from "../services/fileService";
import { SeparationOption } from "../models/separations-jobs/SeparationOption";
import { getAllSeparations } from "../services/clientService";
import { getClientId } from "./clientStorage";

const SEPARATIONS_KEYS = "separations";
const LOCAL_STORING_KEY = "localSeparationsStoring";

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

/**
 * Deletes all separations from sandbox (FileSystem.documentDirectory/separations)
 */
export async function deleteAllLocalSeparations() {
  const filesPaths = await FileSystem.readDirectoryAsync(SEPARATIONS_PATH);
  for(const path of filesPaths)
    FileSystem.deleteAsync(`${SEPARATIONS_PATH}/${path}`, { idempotent: true });
}

/**
 * Delete separation from sandbox (FileSystem.documentDirectory/separations/sep-id)
 */
export async function deleteLocalSeparationById(id: string) {
    FileSystem.deleteAsync(`${SEPARATIONS_PATH}/${id}`, { idempotent: true });
}

/**
 * Deletes separation by id from app's sandbox, separation metadata and backend server.
 * @param id 
 */
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
  const updated = [...separations, job].sort(
    (s1, s2) => new Date(s2.finishedAt).getTime() - new Date(s1.finishedAt).getTime()
  );
  await setSeparations(updated);
}

export async function setLocalSeparationStoring(isEnabled: boolean) {
  await AsyncStorage.setItem(LOCAL_STORING_KEY, JSON.stringify(isEnabled));
}

export async function isLocalSeparationsStoringEnabled() { 
  const raw = await AsyncStorage.getItem(LOCAL_STORING_KEY);
  return raw ? JSON.parse(raw) : true;  // makes local storing enabled by default
}

export async function createSeparationDirectory(separationId: string) {
    const destPath = `${SEPARATIONS_PATH}/${separationId}`;
    const folderInfo = await FileSystem.getInfoAsync(destPath);
    
    if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(destPath, { intermediates: true });
    }
  return destPath;
}

/**
 * Prepares separation for player - checking are stems in storage or they have to be downloaded
 * from server.
 * @param separationId 
 * @returns folder uri in sandbox which contains stems
 */
export async function prepareSeparationForPlayer(separationId: string) {
  const folderPath = `${SEPARATIONS_PATH}/${separationId}`;
  const info = await FileSystem.getInfoAsync(folderPath);

  if (!info.exists) {
    await downloadAndStoreSeparation(separationId);
  }

  return folderPath;
}

export async function getSeparationFolderPath(separationId: string) {
  return `${SEPARATIONS_PATH}/${separationId}`;
}

export async function getSeparationOptionType(separationId: string): Promise<SeparationOption> {
  const separation = await getSeparationById(separationId);
  return separation?.option ?? SeparationOption.FOUR_STEMS;
}

export async function fetchSeparationMetaData(): Promise<SeparationJob[]> {
  const clientId = await getClientId();
  if(!clientId) return [];
  try {
    const separations = await getAllSeparations(clientId);
    const sorted = separations.sort(
      (s1, s2) => new Date(s2.finishedAt).getTime() - new Date(s1.finishedAt).getTime()
    );
    await setSeparations(sorted);  
    return sorted;
  } catch(err) {
    console.error("Error ocurred while fetching separations meta data: ", err);
    return [];
  }
}