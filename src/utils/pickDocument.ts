/* neka ovo za sada bude helper funkcija ali mislim da ima 
potencijala da se pretvori u custom hook */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import JSZip from 'jszip';
import { showToast } from '../shared/toastHelper';
import { getSeparationById, getSeparationFolderPath } from './separationStorage';
import { getClientId } from './clientStorage';
import { SeparationOption } from '../models/separations-jobs/SeparationOption';
import { requestSeparation } from '../services/separationService';
import type { SeparationStatusResponse } from '../models/separations-jobs/SeparationStatusResponse';

//potencijalno napraviti da moze odabrati vise fajlova za editor
// ne moze sa expo-document-picker, on omogucava odabit vise fajlova samo za Web, ali ne i
// iOS i Android. Zapravo, nekada radi, nekada ne - treba setovati i copyToCacheDirectory na true
export async function pickAudioFile(): Promise<DocumentPicker.DocumentPickerAsset | null> {
    const pick = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
    });
    if(pick.canceled)
        return null;
    return pick.assets[0];
}

export async function pickMultipleAudioFiles(): Promise<DocumentPicker.DocumentPickerAsset[] | null> {
    console.log('test');
    const picks = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
    });
    console.log('test1');
    if(picks.canceled)
        return null;
    console.log('test2');
    console.log(picks.assets.length);
    return picks.assets;
}

type SeparationUploadFile = {
    uri: string;
    name: string;
    mimeType?: string | null;
};

function inferMimeType(fileName: string, fallback?: string | null) {
    if (fallback) {
        return fallback;
    }

    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'wav':
            return 'audio/wav';
        case 'm4a':
        case 'mp4':
            return 'audio/mp4';
        case 'aac':
            return 'audio/aac';
        case 'ogg':
            return 'audio/ogg';
        case 'opus':
            return 'audio/opus';
        case 'mp3':
        default:
            return 'audio/mpeg';
    }
}

async function makeSeparationFormData(
    clientId: number,
    option: SeparationOption,
    file: SeparationUploadFile
): Promise<FormData> {
    const formData = new FormData();

    formData.append('clientId', clientId.toString());
    formData.append('file', {
        uri: file.uri,
        type: inferMimeType(file.name, file.mimeType),
        name: file.name,
    } as any);
    formData.append('option', option);

    return formData;
}

export async function submitSeparationRequest(
    file: SeparationUploadFile,
    option: SeparationOption
): Promise<SeparationStatusResponse | null> {
    try {
        const client = await getClientId();
        if (!client) {
            showToast('error', 'Missing client', 'You need to sign in before uploading audio.');
            return null;
        }

        const formData = await makeSeparationFormData(client, option, file);
        const response = await requestSeparation(formData);
        showToast('success', 'Separation started', 'Your audio file is being processed.');
        return response;
    } catch (error) {
        console.error('Upload error:', error);
        showToast('error', 'Upload failed', 'Could not start source separation.');
        return null;
    }
}
function sanitizeFileName(fileName: string) {
    return fileName.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'export';
}

function getDefaultExportDirectory() {
    if (!FileSystem.documentDirectory) {
        throw new Error('Document directory is not available');
    }

    return `${FileSystem.documentDirectory}exports`;
}

async function ensureDefaultExportDirectory() {
    const directory = getDefaultExportDirectory();
    const info = await FileSystem.getInfoAsync(directory);

    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }

    return directory;
}

async function buildStemArchive(separationId: string) {
    const sourceUri = await getSeparationFolderPath(separationId);
    const separation = await getSeparationById(separationId);

    if (separation === null) {
        throw new Error('Separation not found');
    }

    const stemsNames = await FileSystem.readDirectoryAsync(sourceUri);
    const zip = new JSZip();

    for (const stemName of stemsNames) {
        const stemPath = `${sourceUri}/${stemName}`;
        const stemContent = await FileSystem.readAsStringAsync(stemPath, {
            encoding: FileSystem.EncodingType.Base64,
        });

        zip.file(stemName, stemContent, { base64: true });
    }

    const archiveBaseName = sanitizeFileName(separation.title);
    const archiveName = `${archiveBaseName}_stems.zip`;
    const archiveBase64 = await zip.generateAsync({ type: 'base64' });

    return { archiveBaseName, archiveName, archiveBase64 };
}

async function writeArchiveToDefaultLocation(archiveName: string, archiveBase64: string) {
    const defaultDirectory = await ensureDefaultExportDirectory();
    const targetPath = `${defaultDirectory}/${archiveName}`;

    await FileSystem.writeAsStringAsync(targetPath, archiveBase64, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return targetPath;
}

export async function exportSeparation(separationId: string) {
    try {
        const { archiveName, archiveBase64 } = await buildStemArchive(separationId);

        if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
            const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');

            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);

            if (permissions.granted) {
                const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    archiveName.replace(/\.zip$/i, ''),
                    'application/zip'
                );

                await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, archiveBase64, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                showToast('success', 'Export complete', 'Choose folder was used for the stem archive.');
                return fileUri;
            }
        }

        const defaultPath = await writeArchiveToDefaultLocation(archiveName, archiveBase64);
        showToast('info', 'Export saved locally', `Stems were saved to ${defaultPath}`);
        return defaultPath;
    } catch (error) {
        console.log('Export stems failed:', error);
        showToast('error', 'Export failed', 'Could not export the stem archive.');
        return null;
    }
}