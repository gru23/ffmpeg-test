import { StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Card from './Card';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { pickAudioFile } from '../../utils/pickDocument';
import { uploadAudio } from '../../services/audioService';
import { SeparationOption } from '../../models/separations-jobs/SeparationOption';
import { requestSeparation } from '../../services/separationService';
import { getClientId } from '../../utils/clientStorage';
import { DocumentPickerAsset } from 'expo-document-picker';
import { useSeparationWatcherController } from '../../utils/SeparationWatcherProvider';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Initial'>;


export default function InitialScreen() {
  const [expandedCard, setExpandedCard] = useState<"EDITOR" | "SEPARATION" | null>(null);
  const { setWatchJobId, watchStatus } = useSeparationWatcherController();

  const navigation = useNavigation<NavigationProp>();

  // const chooseFile = async (targetScreen: 'EditorScreen' | 'SeparationScreen') => {
  //     try {
  //         const result = await DocumentPicker.getDocumentAsync({type: 'audio/*'});
  //         console.log(result);
  //         if(!result.canceled) {
  //             const file = result.assets[0];
  //             console.log(`Izabrani fajl je ${file.name}, putanja ${file.uri}`);
  //             // const dest = FileSystem.documentDirectory + file.name;
  //             const dest = FileSystem.documentDirectory + "choosen";
  //             navigation.navigate(targetScreen, { file });
  //             // await FileSystem.copyAsync({
  //             //     from: file.uri,
  //             //     to: dest,
  //             // });
  //         } else {
  //         console.log("Korisnik je odustao od izbora fajla.");
  //         }
  //     }
  //     catch(err) {
  //         console.error("Greska pri odabiru fajla", err);
  //     }
  //   };

  const handleUpload = async () => {
      try {
      const file = await pickAudioFile();
      if(file) {
        const dest = FileSystem.documentDirectory + file.name;
        await FileSystem.copyAsync({
          from: file.uri,
          to: dest
        });
        try {
          const client = await getClientId();
          if(!client)
            return;
          const formData = await makeFormData(client, SeparationOption.FOUR_STEMS, file);
          const response = await requestSeparation(formData);
          setWatchJobId(response.jobId);
          // mozda bez navigacije ako nece GUI biti blokiran tokom separacije
          // navigation.navigate('SourceSeparation', { file });
          console.log("Upload response: ", response);
        } catch(err) {
          console.error("Upload error: ", err);
        }
      }
      } catch(err) {
        console.error("Greška u pickAudioFile:", err); 
      }
    }

    const makeFormData = async (
        clientId: number, option: SeparationOption, file: DocumentPickerAsset
      ): Promise<FormData> => {
        const formData = new FormData();
        formData.append("clientId", clientId.toString());
        formData.append("file", {
          uri: file.uri,
          type: file.mimeType || "audio/mpeg",
          name: file.name || "song.mp3",
        } as any);
        formData.append("option", option);
        return formData;
      }

  return (
    <View style={styles.container}>
      <Card
        color="#4f90ff"
        title="EDITOR"
        description="Trim, volume, EQ, delay..."
        icon={<MaterialCommunityIcons name="waveform" style={styles.optionTitleIcon} />}
        expanded={expandedCard === 'EDITOR'}
        onPress={() => setExpandedCard(expandedCard === 'EDITOR' ? null : 'EDITOR')}
        onBrowseFile={async () => {
          const file = await pickAudioFile();
          if(file) {
            console.log(`Izabrani audio fajl: ${file}`);
            navigation.navigate('Filters');
          }
        }}
      />

      <Card
        color="#FF903C"
        title="SOURCE SEPARATION"
        description="Separate song into vocals, drums, bass and other."
        icon={<MaterialIcons name="call-split" style={styles.optionTitleIcon} />}
        expanded={expandedCard === 'SEPARATION'}
        onPress={() => setExpandedCard(expandedCard === 'SEPARATION' ? null : 'SEPARATION')}
        onBrowseFile={handleUpload}
        isLoading={watchStatus !== null && watchStatus !== 'DONE' && watchStatus !== 'FAILED'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
    backgroundColor: '#f5f5f5',
  },
  optionTitleIcon: {
    fontSize: 34,
    color: 'white',
  },
});
