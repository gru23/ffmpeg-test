/* neka ovo za sada bude helper funkcija ali mislim da ima 
potencijala da se pretvori u custom hook */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { getSeparationById, getSeparationFolderPath, SEPARATIONS_PATH } from './separationStorage';
import { makeExternalStorageFolder } from '../services/fileService';

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
// vidi da li brisati jer ne radi 
export async function exportSeparation(separationId: string) {
    console.log("A0");
    await makeExternalStorageFolder();
    console.log("A00");
    const sourceUri = await getSeparationFolderPath(separationId);
    console.log("A01");
    const separation = await getSeparationById(separationId); 
    console.log("A02");
    if(separation === null) return;
    console.log("A1");
    const stemsNames = await FileSystem.readDirectoryAsync(sourceUri);
    const album = await MediaLibrary.getAlbumAsync("Sound Flow");
    for(const stemName of stemsNames) {
        const sourceFile = `${sourceUri}/${stemName}`;
        const newFileName = `${separation.title}_${stemName}`;
        const destFile = FileSystem.documentDirectory + newFileName;

        await FileSystem.copyAsync({
            from: sourceFile,
            to: destFile,
        });

        const asset = await MediaLibrary.createAssetAsync(destFile);
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        await FileSystem.deleteAsync(destFile);
    }
    console.log("A2");
  }