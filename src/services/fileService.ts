import { Buffer } from "buffer";
import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from 'expo-media-library';
import { createSeparationDirectory } from "../utils/separationStorage";
import { downloadSeparation } from "./separationService";

async function ensureDirectory(path: string) {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    }
}

async function ensureExternalDirectory() {
    console.log("A80");
    let album = await MediaLibrary.getAlbumAsync("Sound Flow");
    console.log("A81");
    if (!album) {
        const filePath = FileSystem.documentDirectory + "song1.mp3";

        console.log("A82");
        const asset = await MediaLibrary.createAssetAsync(filePath);
        album = await MediaLibrary.createAlbumAsync("Sound Flow", asset, false);
        await MediaLibrary.deleteAssetsAsync([asset.id]);
    }
    console.log("A83");
}

export async function downloadAndStoreSeparation(separationId: string) {
    try {
        console.log("POCINJE");
        console.log("Id: " + separationId);
        const archive = await downloadSeparation(separationId);
        console.log("Izvrsen downloadSeparation");
        const targetDirectory = await createSeparationDirectory(separationId);
        console.log("Izvrsen createSeparationDirectory");
        const zip = await JSZip.loadAsync(archive);
        console.log("Izvrseno loadAsync");

        for (const entry of Object.values(zip.files)) {
            const entryPath = entry.name.replace(/\\/g, "/");

            if (entry.dir) {
                const directoryPath = `${targetDirectory}/${entryPath}`.replace(/\/$/, "");
                await ensureDirectory(directoryPath);
                continue;
            }

            const outputPath = `${targetDirectory}/${entryPath}`;
            const parentDirectory = outputPath.substring(0, outputPath.lastIndexOf("/"));

            if (parentDirectory) {
                await ensureDirectory(parentDirectory);
            }

            const fileContent = await entry.async("uint8array");
            const base64Content = Buffer.from(fileContent).toString("base64");
            await FileSystem.writeAsStringAsync(outputPath, base64Content, {
                encoding: FileSystem.EncodingType.Base64,
            });
        }
        console.log("Kraj downloadAndStoreSeparation");
        return targetDirectory;
    } catch(err) {
        console.log("Error downloading and storing separation:", err);
        return null;
    }
}

// ne radi... Brisat ako ne bude ispravljeno
/**
 * Makes folder in Androind memory outside the sandbox, '/storage/emulated/0/Sound Flow'
 * @param separationTitle song title which will be fodler's name
 */
export async function makeExternalStorageFolder() {
    console.log("A9");
    const { status } = await MediaLibrary.requestPermissionsAsync();
    console.log("A91");
    if(status !== 'granted') {
        console.log('Permission not granted');
        return;
    }
    console.log("A92");
    await ensureExternalDirectory();
    console.log("A93");
}