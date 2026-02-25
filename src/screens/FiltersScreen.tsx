import { Button, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useState } from 'react'

import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import { Audio } from 'expo-av';

export default function FiltersScreen() {
  // Flanger parametri
  const [flangerDelay, setFlangerDelay] = useState('');
  const [flangerDepth, setFlangerDepth] = useState('');
  const [flangerRegen, setFlangerRegen] = useState('');
  const [flangerWidth, setFlangerWidth] = useState('');
  const [flangerSpeed, setFlangerSpeed] = useState('');
  const [flangerShape, setFlangerShape] = useState('');
  const [flangerPhase, setFlangerPhase] = useState('');

  // Delay parametri
  const [delayChannel1, setDelayChannel1] = useState('');
  const [delayChannel2, setDelayChannel2] = useState('');
  const [delayAll, setDelayAll] = useState('');

  const path = FileSystem.documentDirectory + "input.wav";

  async function delayPlay() {
    console.log('Delay played');
    try {
        const outputPath = FileSystem.documentDirectory + 'delay.wav';
        const command = `-y -i ${path} -af "adelay=${delayChannel1}|${delayChannel2}" ${outputPath}`;
        await FFmpegKit.execute(command);

        const sound = new Audio.Sound();
        await sound.loadAsync({ uri: outputPath });
        await sound.playAsync();
    } catch(err) {
        console.error('Greska pri provjeri fajla: ', err);
    }
  }

    async function flangerPlay() {
        console.log('Flanger played');
        try {
            const info = await FileSystem.getInfoAsync(path);
            if (info.exists) { 
                console.log('Fajl postoji na putanji:', path); 
                console.log('Detalji:', info); 

                const outputPath = FileSystem.documentDirectory + 'flanger.wav';
                const command = `-y -i ${path} -af "flanger=delay=${flangerDelay}:depth=${flangerDepth}:regen=${flangerRegen}:width=${flangerWidth}:speed=${flangerSpeed}:shape=${flangerShape}:phase=${flangerPhase}" ${outputPath}`;
                await FFmpegKit.execute(command);

                const sound = new Audio.Sound();
                await sound.loadAsync({ uri: outputPath });
                await sound.playAsync();
            } else { 
                console.log('Fajl ne postoji na putanji:', path); 
            } 
        } catch (err) { 
            console.error('Greška pri provjeri fajla:', err); 
        }
    }

  return (
    <View style={styles.container}>
      <View style={styles.effectContainer}>
        <Text>DELAY (adelay)</Text>
        <TextInput
          placeholder="Delay za kanal 1 (ms)"
          value={delayChannel1}
          onChangeText={setDelayChannel1}
          style={styles.input}
        />
        <TextInput
          placeholder="Delay za kanal 2 (ms)"
          value={delayChannel2}
          onChangeText={setDelayChannel2}
          style={styles.input}
        />
        <TextInput
          placeholder="All (0 ili 1)"
          value={delayAll}
          onChangeText={setDelayAll}
          style={styles.input}
        />
        <Button title='Play' onPress={delayPlay} />
      </View>

      <View style={styles.effectContainer}>
        <Text>FLANGER</Text>
        <TextInput
          placeholder="Delay (ms)"
          value={flangerDelay}
          onChangeText={setFlangerDelay}
          style={styles.input}
        />
        <TextInput
          placeholder="Depth (ms)"
          value={flangerDepth}
          onChangeText={setFlangerDepth}
          style={styles.input}
        />
        <TextInput
          placeholder="Regen (-95 do 95)"
          value={flangerRegen}
          onChangeText={setFlangerRegen}
          style={styles.input}
        />
        <TextInput
          placeholder="Width (0-100)"
          value={flangerWidth}
          onChangeText={setFlangerWidth}
          style={styles.input}
        />
        <TextInput
          placeholder="Speed (Hz)"
          value={flangerSpeed}
          onChangeText={setFlangerSpeed}
          style={styles.input}
        />
        <TextInput
          placeholder="Shape (sinusoidal/triangular)"
          value={flangerShape}
          onChangeText={setFlangerShape}
          style={styles.input}
        />
        <TextInput
          placeholder="Phase (0-100)"
          value={flangerPhase}
          onChangeText={setFlangerPhase}
          style={styles.input}
        />
        <Button title='Play' onPress={flangerPlay} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  effectContainer: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 5,
    padding: 8,
    borderRadius: 5,
  },
})
