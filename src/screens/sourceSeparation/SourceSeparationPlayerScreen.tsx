import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import Track from './Track';

export default function SourceSeparationPlayerScreen() {
  const [stems, setStems] = useState<Sound[]>([]);
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
    }
    loadStems();

    return () => {
      stems.forEach(s => s.unloadAsync());
    };
  }, []);

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
    await Promise.all(stems.map(stem => stem.pauseAsync()));
    await Promise.all(stems.map(stem => stem.setPositionAsync(0)));
    await Promise.all(stems.map(stem => stem.setVolumeAsync(0.5)));
  };

  const setVolume = async (index: number, volume: number) => {
    await stems[index].setVolumeAsync(volume);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎶 Player</Text>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={playAll}>
          <Text style={styles.controlText}>▶ Play All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={pauseAll}>
          <Text style={styles.controlText}>⏸ Pause All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={stopAll}>
          <Text style={styles.controlText}>⏹ Stop All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea}>
        {stems.map((stem, i) => (
            <Track
            key={i}
            name={names[i]}
            sound={stem}
            index={i}
            volume={0.5}
            onVolumeChange={setVolume}
            />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#376994',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  controlButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  controlText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
});
