import { Buffer } from "buffer";
import JSZip from "jszip";
import * as FileSystem from "expo-file-system/legacy";
import { createSeparationDirectory } from "../utils/separationStorage";
import { downloadSeparation } from "./separationService";

async function ensureDirectory(path: string) {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    }
}

export async function downloadAndStoreSeparation(separationId: string) {
    try {
        const archive = await downloadSeparation(separationId);
        const targetDirectory = await createSeparationDirectory(separationId);
        const zip = await JSZip.loadAsync(archive);

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

        return targetDirectory;
    } catch(err) {
        console.log("Error downloading and storing separation:", err);
        return null;
    }
}