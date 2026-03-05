import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import React, { useRef, useEffect, useState } from 'react';
import { Waveform, type IWaveformRef } from '@simform_solutions/react-native-audio-waveform';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';


export default function VisualScreen() {
  const waveformRef = useRef<IWaveformRef>(null);
  const [audioPath, setAudioPath] = useState<string>('');
  const [isFileReady, setIsFileReady] = useState(false);

  useEffect(() => {
    const prepareAudioFile = async () => {
      try {
        const destPath = FileSystem.documentDirectory + 'input.wav';
        
        // Check if file already exists
        const fileInfo = await FileSystem.getInfoAsync(destPath);
        
        if (!fileInfo.exists) {
          // Copy the asset to the file system
          const asset = Asset.fromModule(require('../../assets/input.wav'));
          await asset.downloadAsync();
          
          const sourceUri = asset.localUri ?? asset.uri;
          await FileSystem.copyAsync({ from: sourceUri, to: destPath });
        }
        
        // Remove file:// prefix for native module
        const pathForWaveform = destPath.replace('file://', '');
        
        setAudioPath(pathForWaveform);
        setIsFileReady(true);
      } catch (error) {
        console.error('Error preparing audio file:', error);
      }
    };

    prepareAudioFile();
  }, []);

  if (!isFileReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#888" />
        <Text style={styles.loadingText}>Loading audio file...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Waveform
        mode="static"
        ref={waveformRef}
        path={audioPath}
        candleWidth={4}
        candleSpace={2}
        waveColor="#888"
        scrubColor="red"
        containerStyle={styles.waveformContainer}
        onPlayerStateChange={(playerState) => {
          console.log('Player state:', playerState);
        }}
        onCurrentProgressChange={(current, duration) => {
          console.log('Current:', current, 'Duration:', duration);
        }}
        onChangeWaveformLoadState={(state) => {
          console.log('Waveform loading:', state);
        }}
        onError={(error) => {
          console.error('Waveform error:', error);
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 16,
  },
  waveformContainer: {
    height: 200,
    width: '100%',
  },
  loadingText: {
    marginTop: 10,
    color: '#888',
  },
})