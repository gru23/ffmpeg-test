import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Sound } from 'expo-av/build/Audio';

type TrackProps = {
  name: string;
  sound: Sound;
  index: number;
  volume: number;
  onVolumeChange: (index: number, volume: number) => void;
};

export default function Track({ name, sound, index, volume, onVolumeChange }: TrackProps) {
  const [volumeValue, setVolumeValue] = useState<number>(volume);
  const [muteButton, setMuteButton] = useState<string>("Mute");
  const [inputValue, setInputValue] = useState<string>(String(volume * 100));

  const lastVolumeRef = useRef<number>(volume);

  useEffect(() => {
    onVolumeChange(index, volumeValue);
  }, [volumeValue]);

  const setVolume = async (value: number) => {
    if(value === 0)
      muteVolume();
    else {
      lastVolumeRef.current = value;
      setVolumeValue(value);
      setMuteButton("Mute");
    }   
  };

  const muteVolume = async () => {
    if("Mute" === muteButton) {
      setMuteButton("Unmute");
      lastVolumeRef.current = volumeValue;
      setVolumeValue(0);
    }
    else {
      setMuteButton("Mute");
      setVolumeValue(lastVolumeRef.current);
    }
  }

  const confirmInput = () => {
    let num = parseInt(inputValue, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    setVolume(num / 100);
  };

  return (
    <View style={styles.track}>
      <Text style={styles.trackName}>{name}</Text>
      <Text style={styles.volumeText}>Vol: {Math.round(volumeValue * 100)}%</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={inputValue}
          onChangeText={setInputValue}
          maxLength={3}
        />
        <TouchableOpacity style={styles.confirmButton} onPress={confirmInput}>
          <Text style={styles.confirmText}>Set</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.muteButton} onPress={() => muteVolume()}>
        <Text style={styles.muteText}>{ muteButton }</Text>
      </TouchableOpacity>
      </View>

      {/* <TouchableOpacity style={styles.muteButton} onPress={() => muteVolume()}>
        <Text style={styles.muteText}>{ muteButton }</Text>
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#4784b9d4',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  trackName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  volumeText: {
    color: '#aaa',
    marginVertical: 5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 10,
    width: 60,
    marginRight: 10,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  muteButton: {
    backgroundColor: '#e53935',
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  muteText: {
    color: '#fff',
    fontWeight: '600',
  },
});
