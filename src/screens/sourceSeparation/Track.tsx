import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Sound } from 'expo-av/build/Audio';
import { Waveform, type IWaveformRef } from '@simform_solutions/react-native-audio-waveform';
import Slider from '@react-native-community/slider';

type TrackProps = {
  name: string;
  sound: Sound;
  index: number;
  volume: number;
  audioPath: string;
  onVolumeChange: (index: number, volume: number) => void;
};

export default function Track({ name, sound, index, volume, audioPath, onVolumeChange }: TrackProps) {
  const [volumeValue, setVolumeValue] = useState<number>(volume);
  const [muteButton, setMuteButton] = useState<string>("Mute");
  const [sliderValue, setSliderValue] = useState<number>(volume * 100);

  const lastVolumeRef = useRef<number>(volume);
  const waveformRef = useRef<IWaveformRef>(null);

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
      setSliderValue(0);
    }
    else {
      setMuteButton("Mute");
      setVolumeValue(lastVolumeRef.current);
      setSliderValue(lastVolumeRef.current * 100);
    }
  }

   const handleSliderChange = (val: number) => {
    setSliderValue(val);
    const normalized = val / 100;
    setVolume(normalized);
  };

  return (
    <View style={styles.track}>
      <Text style={styles.trackName}>{name}</Text>
      <Text style={styles.volumeText}>Vol: {Math.round(volumeValue * 100)}%</Text>

      <View style={styles.inputRow}>
        <Slider
          style={{width: 250, height: 10}}
          minimumValue={0}
          maximumValue={100}
          value={sliderValue}
          onValueChange={handleSliderChange}
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#ccc"
        />
        <TouchableOpacity style={styles.muteButton} onPress={() => muteVolume()}>
          <Text style={styles.muteText}>{ muteButton }</Text>
        </TouchableOpacity>
      </View>

      <Waveform
        mode="static"
        ref={waveformRef}
        path={audioPath}
        candleWidth={3}
        candleSpace={2}
        waveColor="#fff"
        scrubColor="red"
        containerStyle={styles.waveformContainer}
        onCurrentProgressChange={(current, duration) => {
            // console.log('Current:', current, 'Duration:', duration);
        }}
      />
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
    marginLeft: 10,
    paddingHorizontal: 15,
  },
  muteText: {
    color: '#fff',
    fontWeight: '600',
  },
  waveformContainer: {
    height: 100,
    width: '100%',
    marginTop: 10,
  },
});