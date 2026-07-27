import { Modal, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import Card from './Card';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { pickAudioFile, submitSeparationRequest } from '../../utils/pickDocument';
import { SeparationOption } from '../../models/separations-jobs/SeparationOption';
import { DocumentPickerAsset } from 'expo-document-picker';
import { useSeparationWatcherController } from '../../utils/SeparationWatcherProvider';
import RecentSeparationSection from './RecentSeparationSection';
import { getAllSeparations } from '../../services/clientService';
import { SeparationJob } from '../../models/separations-jobs/SeparationJob';
import { fetchSeparationMetaData, getSeparations } from '../../utils/separationStorage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Initial'>;


export default function InitialScreen() {
  const [expandedCard, setExpandedCard] = useState<"EDITOR" | "SEPARATION" | null>(null);
  const { setWatchJobId, watchStatus } = useSeparationWatcherController();
  const [jobs, setJobs] = useState<SeparationJob[]>([]);

  const [modalOptionVisible, setModalOptionVisible] = useState(false);
  const [separationOption, setSeparationOption] = useState<SeparationOption | null>(null);
  const [separationAction, setSeparationAction] = useState<'browse' | 'record' | null>(null);

  const navigation = useNavigation<NavigationProp>();

  const fetchJobs = async() => {
      const separations = await getSeparations();
      const recent = [...separations].sort(
        (s1, s2) => new Date(s2.finishedAt).getTime() - new Date(s1.finishedAt).getTime()
      ).slice(0, 3);
      setJobs(recent);
    };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (watchStatus === 'DONE') {
      void fetchJobs();
    }
  }, [watchStatus]);

  const handleOptionPress = async () => {
    setSeparationAction('browse');
    setModalOptionVisible(true);
  };

  const handleOptionSelection = async (option: SeparationOption) => {
    setModalOptionVisible(false);
    setSeparationOption(option);

    if (separationAction === 'record') {
      navigation.replace('Recorder', { nextScreen: 'separation', separationType: option })
      return;
    }

    await handleUpload(option);
  };

  const handleRecordForSeparation = async() => {
    setSeparationAction('record');
    setModalOptionVisible(true);
  }

  const handleUpload = async (optionParam?: SeparationOption) => {
      try {
      setWatchJobId(null);
      const file = await pickAudioFile();
      if(file) {
        const safeName = file.name || `song-${Date.now()}.mp3`;
        const dest = FileSystem.documentDirectory + safeName;
        await FileSystem.copyAsync({
          from: file.uri,
          to: dest
        });
        const usedOption = optionParam ?? SeparationOption.FOUR_STEMS;
        console.log("Sending separation request:", { name: safeName, uri: dest, size: file.size, type: file.mimeType });
        const response = await submitSeparationRequest({
          uri: dest,
          name: safeName,
          mimeType: file.mimeType,
        }, usedOption);
        if (response) {
          setWatchJobId(response.jobId);
          console.log("Upload response: ", response);
        }
      }
      } catch(err) {
        console.error("Greška u pickAudioFile:", err); 
      }
    }

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        <TouchableOpacity>
          {/* <MaterialIcons name='menu' size={28} color="black" /> */}
          <SimpleLineIcons name="menu" size={24} color="#1561bd" />
        </TouchableOpacity>
      </View>
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
        onRecord={async () => {
          navigation.replace('Recorder', { nextScreen: 'editor', separationType: SeparationOption.FOUR_STEMS })
        }}
      />

      <Card
        color="#FF903C"
        title="SOURCE SEPARATION"
        description="Separate song into vocals, drums, bass and other."
        icon={<MaterialIcons name="call-split" style={styles.optionTitleIcon} />}
        expanded={expandedCard === 'SEPARATION'}
        onPress={() => setExpandedCard(expandedCard === 'SEPARATION' ? null : 'SEPARATION')}
        onBrowseFile={handleOptionPress}
        onRecord={handleRecordForSeparation}
        isLoading={watchStatus !== null && watchStatus !== 'DONE' && watchStatus !== 'FAILED'}
      />

      <RecentSeparationSection 
        jobs={jobs} 
        onRefresh={fetchJobs}
        onViewAllPress={() => navigation.navigate('AllSeparations')}
      />

      <Modal
        visible={modalOptionVisible}
        transparent={true}
        animationType='slide'
        onRequestClose={() => setModalOptionVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Separation type</Text>
            <TouchableOpacity onPress={() => handleOptionSelection(SeparationOption.VOCALS)}>
              <Text style={styles.option}>VOCALS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleOptionSelection(SeparationOption.FOUR_STEMS)}>
              <Text style={styles.option}>FOUR STEMS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalOptionVisible(false)}>
              <Text style={styles.option}>Zatvori</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  menuContainer: {
    // flexDirection: 'row',
    // justifyContent: 'flex-end',
    // alignItems: 'center',
    position: 'absolute',
    right: 20,
    top: 20,
  },
  optionTitleIcon: {
    fontSize: 34,
    color: 'white',
  },

  item: { padding: 12, borderBottomWidth: 1, borderColor: "#ddd" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    width: "80%",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  option: { fontSize: 16, marginVertical: 8 },
});
