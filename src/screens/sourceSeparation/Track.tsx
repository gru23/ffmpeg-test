import { StyleSheet, Text, View, TouchableOpacity, Image, Animated } from 'react-native';
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
  icon: any;
  muteIcon: any;
  currentPosition: number;
};

export default function Track({ name, sound, index, volume, audioPath, onVolumeChange, icon, muteIcon, currentPosition }: TrackProps) {
  const [volumeValue, setVolumeValue] = useState<number>(volume);
  const [muteButton, setMuteButton] = useState<string>("Mute");
  const [sliderValue, setSliderValue] = useState<number>(volume * 100);
  const [duration, setDuration] = useState<number>(0);

  const lastVolumeRef = useRef<number>(volume);
  const waveformRef = useRef<IWaveformRef>(null);
  const animatedProgressRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onVolumeChange(index, volumeValue);
  }, [volumeValue]);

  useEffect(() => {
    const getDuration = async () => {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
      }
    };
    getDuration();
  }, [sound]);

  useEffect(() => {
    if (duration > 0) {
      const percentage = (currentPosition / duration) * 100;
      Animated.timing(animatedProgressRef, {
        toValue: percentage,
        duration: 50,
        useNativeDriver: false,
      }).start();
    }
  }, [currentPosition, duration]);

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
      // waveformRef.current?.resumePlayer();
      setMuteButton("Unmute");
      lastVolumeRef.current = volumeValue;
      setVolumeValue(0);
      setSliderValue(0);
    }
    else {
      // waveformRef.current?.pausePlayer();
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
        <TouchableOpacity onPress={() => muteVolume()}>
          <Image 
          source={volumeValue === 0 ? muteIcon : icon} 
          // style={{ width: 36, height: 36, marginRight: 10 }} 
          style={{ marginRight: 0 }} //original icon size
        />
        </TouchableOpacity>
        
        <Slider
          style={{ flex:1, height: 10, marginHorizontal: 10}}
          minimumValue={0}
          maximumValue={100}
          value={sliderValue}
          onValueChange={handleSliderChange}  // makes a problem for lastVolumeRef because calls handleSliderChange many times
          //onSlidingComplete={handleSliderChange}  // no problem with lastVolumeRef, but does not change volume during a slide, just on release
          minimumTrackTintColor="#1DB954"
          maximumTrackTintColor="#ccc"
          thumbTintColor='red'
        />
      </View>

      <View style={styles.waveformWrapper}>
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
            // Ovdje možeš obraditi progress
            // npr. promijeniti boju dijela waveforma
            // waveformRef.current?.resumePlayer();
            console.log('Current:', current, 'Duration:', duration);
          }}
        />
        {duration > 0 && (
          <Animated.View
            style={[
              styles.progressIndicator,
              {
                left: animatedProgressRef.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        )}
      </View>
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
  muteText: {
    color: '#fff',
    fontWeight: '600',
  },
  waveformContainer: {
    height: 100,
    width: '100%',
    marginTop: 10,
  },
  waveformWrapper: {
    position: 'relative',
    marginTop: 10,
  },
  progressIndicator: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 100,
    backgroundColor: '#FF1744',
    zIndex: 10,
  },
});