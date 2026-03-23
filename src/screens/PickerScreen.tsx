import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { uploadAudio } from '../services/audioService';
import { pickAudioFile, pickMultipleAudioFiles } from '../utils/pickDocument';

export default function PickerScreen() {
  const [files, setFiles] = useState<string[]>([]);
  const [value, setValue] = useState<string>('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
        try {
            const directory = FileSystem.documentDirectory;
            if (!directory) {
              setFiles([]);
              return;
            }

            const fileList = await FileSystem.readDirectoryAsync(directory);
            setFiles(fileList);
            console.log("Fajlovi u sandboxu:", fileList);
        } catch (err) {
        console.error("Greška pri čitanju sandboxa:", err);
      }
    }

  function deleteFile(uri: string) {
    FileSystem.deleteAsync(FileSystem.documentDirectory + uri);
    setValue('');
    loadFiles();
  }

  const chooseFile = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({type: 'audio/*'});
        console.log(result);
        if(!result.canceled) {
            const file = result.assets[0];
            console.log(`Izabrani fajl je ${file.name}, putanja ${file.uri}`);
            const dest = FileSystem.documentDirectory + file.name;
            setValue(file.name);
            // const dest = FileSystem.documentDirectory + "choosen";
            await FileSystem.copyAsync({
                from: file.uri,
                to: dest,
            });
            loadFiles();
        } else {
        console.log("Korisnik je odustao od izbora fajla.");
        }
    }
    catch(err) {
        console.error("Greska pri odabiru fajla", err);
    }
  };

  async function playChoosen() {
    if(sound === null) {
      const { sound } = await Audio.Sound.createAsync(
        // { uri: FileSystem.documentDirectory + 'choosen' }
        { uri: FileSystem.documentDirectory + value }
      );
      setSound(sound);
      await sound.playAsync();
    }
    else sound.playAsync();
  }

  async function pauseChoosen() {
    if(sound){
      await sound.pauseAsync();
    }
  }

  const handleUpload = async () => {
    const file = await pickAudioFile();
    if(file) {
      const dest = FileSystem.documentDirectory + file.name;
      await FileSystem.copyAsync({
        from: file.uri,
        to: dest
      });
      try {
        const response = await uploadAudio(dest, file.name);
        console.log("Upload response: ", response);
      } catch(err) {
        console.error("Upload error: ", err);
      }
    }
  }

  const pickAudios = async () => {
    const files = await pickMultipleAudioFiles();
    if(files) {
      console.log("Naslovi ucitanih fajlova: ");
      files.forEach(file => console.log(file.name));
    }
    else console.log("Doslo je do greske izbora veceg broja fajlova");
  }

  return (
    <View style={styles.container}>
      <Button title='Choose' onPress={chooseFile} />
      <Text>Fajlovi u sandbox-u:</Text>
      <FlatList 
        data={files}
        keyExtractor={(item) => item}
        renderItem={({item}) => (
            <Text>{item}</Text>
        )}
      />
      <TextInput 
        style={ styles.input }
        placeholder='File to delete'
        value={value}
        onChangeText={setValue}
      />
      <Button title='Submit' onPress={() => deleteFile(value)} />
      <Button title="Play" onPress={playChoosen} />
      <Button title="Pause" onPress={pauseChoosen} />
      <Button title="Upload" onPress={handleUpload} />
      <Button title='Picks' onPress={pickAudios} />
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
      margin: 12,
    },
    input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    margin: 20,
    borderRadius: 5,
  }
})