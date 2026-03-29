/* neka ovo za sada bude helper funkcija ali mislim da ima 
potencijala da se pretvori u custom hook */

import * as DocumentPicker from 'expo-document-picker';

//potencijalno napraviti da moze odabrati vise fajlova za editor
// ne moze sa expo-document-picker, on omogucava odabit vise fajlova samo za Web, ali ne i
// iOS i Android. Zapravo, nekada radi, nekada ne - treba setovati i copyToCacheDirectory na true
export async function pickAudioFile(): Promise<DocumentPicker.DocumentPickerAsset | null> {
    const pick = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
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