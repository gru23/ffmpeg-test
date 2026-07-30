import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';
import * as FileSystem from 'expo-file-system/legacy';
import Track from './Track';
import { ICON_KEYS, ICONS } from '../../constants';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { deleteLocalSeparationById, getSeparationFolderPath, getSeparationOptionType, isLocalSeparationsStoringEnabled, prepareSeparationForPlayer } from '../../utils/separationStorage';
import { SeparationOption } from '../../models/separations-jobs/SeparationOption';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import { exportSeparation } from '../../utils/pickDocument';

type SourceSeparationRouteParams = {
  SourceSeparation: { id: string };
};

export default function SourceSeparationPlayerScreen() {
  const route = useRoute<RouteProp<SourceSeparationRouteParams, 'SourceSeparation'>>();
  const navigation = useNavigation();
  const separationId = route.params?.id;

  const [stemsLoading, setStemsLoading] = useState<boolean>(true);
  const [loadingText, setLoadingText] = useState<string>("");

  const [stems, setStems] = useState<Sound[]>([]);
  const [stemPaths, setStemPaths] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [names, setNames] = useState<string[]>(['Vocals', 'Drums', 'Other', 'Bass']);
  const [stemFiles, setStemFiles] = useState<string[]>(['vocals.wav', 'drums.wav', 'other.wav', 'bass.wav']);
  const [waveformLoadingStates, setWaveformLoadingStates] = useState<boolean[]>([]);
  const stemsRef = useRef<Sound[]>([]);
  const playbackResettingRef = useRef(false);
  // const names = ['Vocals', 'Drums', 'Other', 'Bass'];
  // const stemFiles = ['vocals.wav', 'drums.wav', 'other.wav', 'bass.wav'];

  const stopAndUnloadStems = useCallback(async () => {
    const activeStems = stemsRef.current;

    stemsRef.current = [];
    setIsPlaying(false);

    await Promise.all(
      activeStems.map(async stem => {
        try {
          await stem.stopAsync();
        } catch (error) {
          console.log('Error stopping stem playback:', error);
        }
      })
    );

    await Promise.all(
      activeStems.map(async stem => {
        try {
          const status = await stem.getStatusAsync();
          if (status.isLoaded) {
            await stem.unloadAsync();
          }
        } catch (error) {
          console.log('Error stopping stem playback:', error);
        }
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void stopAndUnloadStems();
      };
    }, [stopAndUnloadStems])
  );

  useEffect(() => {
    const nativeNavigation = navigation as any;

    const removeBlurListener = nativeNavigation.addListener('blur', () => {
      void stopAndUnloadStems();
    });

    const removeTransitionStartListener = nativeNavigation.addListener('transitionStart', (event: any) => {
      if (event?.data?.closing) {
        void stopAndUnloadStems();
      }
    });

    const removeBeforeRemoveListener = nativeNavigation.addListener('beforeRemove', () => {
      void stopAndUnloadStems();
    });

    return () => {
      removeBlurListener();
      removeTransitionStartListener();
      removeBeforeRemoveListener();
    };
  }, [navigation, stopAndUnloadStems]);

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
      setWaveformLoadingStates(new Array(currentStemFiles.length).fill(true));
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
      setStemPaths(files.map((fileUri) => fileUri.replace('file://', '')));
      console.log("4");
      const loaded: Sound[] = [];
      for (const fileUri of files) {
        const sound = new Audio.Sound();
        await sound.loadAsync({ uri: fileUri }, { shouldPlay: false });
        sound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
        loaded.push(sound);
      }
      setStems(loaded);
      stemsRef.current = loaded;
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
      void stopAndUnloadStems();
      (async () => {
        const isEnabled = await isLocalSeparationsStoringEnabled();
        if(!isEnabled) {
          await deleteLocalSeparationById(separationId);
        }
      })();
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

  const handlePlaybackStatusUpdate = useCallback((status: any) => {
    if (!status?.isLoaded) {
      return;
    }

    if (status.isPlaying) {
      setCurrentPosition(status.positionMillis ?? 0);
    }

    if (status.didJustFinish && !playbackResettingRef.current) {
      playbackResettingRef.current = true;
      void (async () => {
        try {
          await Promise.all(
            stemsRef.current.map(async (stem) => {
              try {
                await stem.pauseAsync();
                await stem.setPositionAsync(0);
              } catch (error) {
                console.log('Error resetting stem after finish:', error);
              }
            })
          );
          setCurrentPosition(0);
          setIsPlaying(false);
        } finally {
          playbackResettingRef.current = false;
        }
      })();
    }
  }, []);

  const handleWaveformLoadStateChange = (index: number, isLoading: boolean) => {
    setWaveformLoadingStates((prev) => {
      const next = [...prev];
      next[index] = isLoading;
      return next;
    });
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

  const isAnyWaveformLoading = waveformLoadingStates.length === 0 || waveformLoadingStates.some(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.menuContainer}>
        <Menu>
          <MenuTrigger>
            <SimpleLineIcons name="menu" size={24} color="#efefef" />
          </MenuTrigger>
          <MenuOptions customStyles={optionsStyles}>
            <MenuOption onSelect={async () => {console.log("export"); await exportSeparation(separationId);}}>
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
      <ScrollView style={styles.scrollArea} scrollEnabled={!stemsLoading && !isAnyWaveformLoading}>
        {stems.map((stem, i) => (
            <Track
            key={i}
            name={names[i]}
            sound={stem}
            index={i}
            volume={1}
            // audioPath={(FileSystem.documentDirectory + names[i].toLowerCase() + '.wav').replace('file://', '')}
            // audioPath={(FileSystem.documentDirectory + stemFiles[i]).replace('file://', '')}
            audioPath={stemPaths[i] ?? ''}
            onVolumeChange={setVolume}
            onWaveformLoadStateChange={handleWaveformLoadStateChange}
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
      
      {(stemsLoading || isAnyWaveformLoading) && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{isAnyWaveformLoading ? 'Stems loading...' : loadingText}</Text>
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