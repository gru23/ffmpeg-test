import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';
import * as FileSystem from 'expo-file-system/legacy';
import Track from './Track';
import { ICON_KEYS, ICONS } from '../../constants';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { getSeparationFolderPath, getSeparationOptionType, prepareSeparationForPlayer } from '../../utils/separationStorage';
import { SeparationOption } from '../../models/separations-jobs/SeparationOption';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

type SourceSeparationRouteParams = {
  SourceSeparation: { id: string };
};

export default function SourceSeparationPlayerScreen() {
  const route = useRoute<RouteProp<SourceSeparationRouteParams, 'SourceSeparation'>>();
  const separationId = route.params?.id;

  const [stemsLoading, setStemsLoading] = useState<boolean>(true);
  const [loadingText, setLoadingText] = useState<string>("");

  const [stems, setStems] = useState<Sound[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [names, setNames] = useState<string[]>(['Vocals', 'Drums', 'Other', 'Bass']);
  const [stemFiles, setStemFiles] = useState<string[]>(['vocals.wav', 'drums.wav', 'other.wav', 'bass.wav']);
  // const names = ['Vocals', 'Drums', 'Other', 'Bass'];
  // const stemFiles = ['vocals.wav', 'drums.wav', 'other.wav', 'bass.wav'];

  useEffect(() => {
    async function loadStems() {
      console.log("1");
      setStemsLoading(true);
      setLoadingText("Downloading stems...");
      await prepareSeparationForPlayer(separationId);
      setLoadingText("Loading...");
      let currentNames = ['Vocals','Drums','Other','Bass'];
      let currentStemFiles = ['vocals.wav','drums.wav','other.wav','bass.wav'];
      console.log("2 " + separationId);
      const separationOptionType = await getSeparationOptionType(separationId);
      console.log("Type: " + separationOptionType);
      if(separationOptionType === SeparationOption.VOCALS) {
        currentNames = ['Vocals','No vocals'];
        currentStemFiles = ['vocals.wav','no_vocals.wav'];
      }
      console.log("3");
      setNames(currentNames);
      setStemFiles(currentStemFiles);
      const path = await getSeparationFolderPath(separationId);
      console.log("PATH: " + path);
      const files = await Promise.all(
        currentStemFiles.map(async (fileName) => {
          const filePath = `${path}/${fileName}`;
          const info = await FileSystem.getInfoAsync(filePath);
          if (!info.exists) {
            throw new Error(`Missing stem file: ${filePath}`);
          }
          return info.uri;
        })
      );
      console.log("4");
      const loaded: Sound[] = [];
      for (const fileUri of files) {
        const sound = new Audio.Sound();
        await sound.loadAsync({ uri: fileUri }, { shouldPlay: false });
        loaded.push(sound);
      }
      setStems(loaded);
      console.log("5");
      const status = await loaded[0].getStatusAsync();
      if(status.isLoaded){
        setDuration(status.durationMillis || 0);
      }
      console.log("6");
      setStemsLoading(false);
    };
    loadStems();
    console.log("7");
    return () => {
      stems.forEach(s => s.unloadAsync());
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (stems.length > 0) {
        const status = await stems[0].getStatusAsync(); 
        if (status.isLoaded && status.isPlaying) {
          setCurrentPosition(status.positionMillis);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [stems]);

  const playAll = async () => {
    await Promise.all(stems.map(stem => stem.playAsync()));
  };

  const pauseAll = async () => {
    await Promise.all(stems.map(stem => stem.pauseAsync()));
  };

  const stopAll = async () => {
    setIsPlaying(false);
    await Promise.all(stems.map(stem => stem.pauseAsync()));
    await Promise.all(stems.map(stem => stem.setPositionAsync(0)));
    await Promise.all(stems.map(stem => stem.setVolumeAsync(1)));
    setCurrentPosition(0);
  };

  const setVolume = async (index: number, volume: number) => {
    await stems[index].setVolumeAsync(volume);
  };

  const formatTime = (miliseconds: number) => {
    const totalSeconds = Math.floor(miliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const changePlayButton = async () => {
    if(isPlaying) {
      await pauseAll();
      setIsPlaying(false);
    }
    else {
      await playAll();
      setIsPlaying(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.menuContainer}>
        <Menu>
          <MenuTrigger>
            <SimpleLineIcons name="menu" size={24} color="#efefef" />
          </MenuTrigger>
          <MenuOptions customStyles={optionsStyles}>
            <MenuOption onSelect={() => console.log("Export stems")}>
              <Text style={optionsStyles.optionText}>Export stems</Text>
            </MenuOption>
            <MenuOption onSelect={() => console.log("Initial screen")}>
              <Text style={optionsStyles.optionText}>Home</Text>
            </MenuOption>
            <MenuOption onSelect={() => console.log("Cancel")}>
              <Text style={optionsStyles.optionText}>Cancel</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
    </View>
      <ScrollView style={styles.scrollArea}>
        {stems.map((stem, i) => (
            <Track
            key={i}
            name={names[i]}
            sound={stem}
            index={i}
            volume={1}
            // audioPath={(FileSystem.documentDirectory + names[i].toLowerCase() + '.wav').replace('file://', '')}
            audioPath={(FileSystem.documentDirectory + stemFiles[i]).replace('file://', '')}
            onVolumeChange={setVolume}
            icon={ICONS[ICON_KEYS[names[i]]].normal}
            muteIcon={ICONS[ICON_KEYS[names[i]]].mute}
            currentPosition={currentPosition}
            />
        ))}
      </ScrollView>

      <View style={ styles.progressBarContainer }>
        <Slider
          style={ styles.progressBarSlider }
          minimumValue={0}
          maximumValue={stems.length > 0 ? duration : 0} // trajanje u ms
          value={currentPosition}
          onSlidingComplete={async (val) => {
            // premotaj sve stemove na novu poziciju
            await Promise.all(stems.map(stem => stem.setPositionAsync(val)));
            setCurrentPosition(val);
          }}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#ccc"
          thumbTintColor="red"
        />
        <View style={ styles.timeContainer }>
          <Text style={ styles.time }>{formatTime(currentPosition)}</Text>
          <Text style={ styles.time }>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={changePlayButton}>
          {isPlaying ? (
            <MaterialIcons name="pause" size={52} color="white" />
          ) : (
            <MaterialIcons name="play-arrow" size={52} color="white" />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={stopAll}>
          <MaterialIcons name='stop' size={52} color="white" />
        </TouchableOpacity>
      </View>
      
      {stemsLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#376994',
    padding: 20,
  },
  progressBarContainer: {
    marginVertical: 2
  },
  progressBarSlider: {
    width: '100%', 
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  time: {
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    // marginBottom: 30,
  },
  controlButton: {
    // paddingVertical: 10,
    paddingHorizontal: 20,
  },
  scrollArea: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(189, 200, 206, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 10,
  },
});

const optionsStyles = {
  optionsContainer: {
    backgroundColor: '#376994',   // boja pozadine menija
    padding: 10,
    borderRadius: 8,
    width: 200,                   // širina menija
  },
  optionWrapper: {
    margin: 5,
  },
  optionText: {
    fontSize: 18,                 // veličina slova
    color: '#fff',                // boja teksta
    fontWeight: 'bold' as 'bold',
  },
};