import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import Track from './Track';
import { ICONS } from '../../constants';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';

export default function SourceSeparationPlayerScreen() {
  const [stems, setStems] = useState<Sound[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const names = ['Vocals', 'Drums', 'Other', 'Bass'];

  useEffect(() => {
    copyStems();
    async function loadStems() {
      const files = [
        require("../../../assets/vocals.wav"),
        require("../../../assets/drums.wav"),
        require("../../../assets/other.wav"),
        require("../../../assets/bass.wav"),
      ];
      const loaded: Sound[] = [];
      for (const file of files) {
        const sound = new Audio.Sound();
        await sound.loadAsync(file, { shouldPlay: false });
        loaded.push(sound);
      }
      setStems(loaded);

      const status = await loaded[0].getStatusAsync();
      if(status.isLoaded){
        setDuration(status.durationMillis || 0);
      }
    }
    loadStems();

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

  const copyStems = useCallback(async () => {
    const assets = [
      Asset.fromModule(require('../../../assets/vocals.wav')),
      Asset.fromModule(require('../../../assets/drums.wav')),
      Asset.fromModule(require('../../../assets/other.wav')),
      Asset.fromModule(require('../../../assets/bass.wav')),
    ];
    await Promise.all(assets.map(a => a.downloadAsync()));
  }, []);

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
    <View style={styles.container}>
      <ScrollView style={styles.scrollArea}>
        {stems.map((stem, i) => (
            <Track
            key={i}
            name={names[i]}
            sound={stem}
            index={i}
            volume={1}
            audioPath={(FileSystem.documentDirectory + names[i].toLowerCase() + '.wav').replace('file://', '')}
            onVolumeChange={setVolume}
            icon={ICONS[names[i].toLowerCase()].normal}
            muteIcon={ICONS[names[i].toLowerCase()].mute}
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

      
    </View>
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
});