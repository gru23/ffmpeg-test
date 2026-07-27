/* neka ovo za sada bude helper funkcija ali mislim da ima 
potencijala da se pretvori u custom hook */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import JSZip from 'jszip';
import { showToast } from '../shared/toastHelper';
import { getSeparationById, getSeparationFolderPath } from './separationStorage';

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