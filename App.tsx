import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './src/screens/LoginScreen';

import { FFmpegKit } from 'ffmpeg-kit-react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import FiltersScreen from './src/screens/FiltersScreen';
import VisualScreen from './src/screens/VisualScreen';
import SkiaVisualScreen from './src/screens/SkiaVisualScreen';
import SourceSeparationPlayerScreen from './src/screens/sourceSeparation/SourceSeparationPlayerScreen';

const Stack = createNativeStackNavigator();

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Filters: undefined;
  Visual: undefined;
  Skia: undefined;
  SourceSeparation: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

function HomeScreen({ navigation }: HomeScreenProps) {
  const [inputPath, setInputPath] = useState<string>('');
  const [isInputReady, setIsInputReady] = useState(false);

  const copyInputAsset = useCallback(async () => {
    const asset = Asset.fromModule(require('./assets/input.wav'));
    await asset.downloadAsync();
    // inputBD_44.1_16b_5s.wav inputBD_8kHz_8b_5s.wav inputBD.wav
    const fileName = "inputBD_44.1_16b_5s.wav";
    const fileName1 = "inputBD_8kHz_8b_5s.wav";
    const fileName2 = "inputBD.wav";
    const finalFileName = fileName;

    const assetBD = Asset.fromModule(require('./assets/' + finalFileName));
    await assetBD.downloadAsync();

    const destPath = FileSystem.documentDirectory + 'input.wav';
    const sourceUri = asset.localUri ?? asset.uri;

    const destPathBD = FileSystem.documentDirectory + finalFileName;
    const sourceUriBD = assetBD.localUri ?? assetBD.uri;

    // Always replace sandbox copies so selected file is guaranteed to be current.
    await FileSystem.deleteAsync(destPathBD, { idempotent: true });

    await FileSystem.copyAsync({ from: sourceUri, to: destPath });
    setInputPath(destPath);
    setIsInputReady(true);
    console.log('Asset kopiran u:', destPath);

    // await FileSystem.copyAsync({ from: sourceUriBD, to: destPathBD });
    // setInputPath(destPathBD);
    // setIsInputReady(true);
    // console.log('Asset kopiran u:', destPathBD);

    // kopiraj inputBD.wav u sandbox
    await FileSystem.copyAsync({ from: sourceUriBD, to: destPathBD });
    console.log('Asset kopiran u:', destPathBD);

    // odmah ga degradiraj na 8‑bit / 8 kHz
    const degradedPath = FileSystem.documentDirectory + 'inputBD_degraded.wav';
    await FileSystem.deleteAsync(degradedPath, { idempotent: true });
    const ffmpegCommand = `-y -i ${destPathBD} -ac 2 -ar 8000 -acodec pcm_u8 ${degradedPath}`;
    await FFmpegKit.execute(ffmpegCommand);

    // koristi degradirani fajl za vizualizaciju
    setInputPath(degradedPath);
    setIsInputReady(true);
    console.log('Degradirani asset spreman u:', degradedPath);
  }, []);

  useEffect(() => {
    copyInputAsset();
  }, [copyInputAsset]);


  async function playOriginal() {
    try {
      if (!isInputReady || !inputPath) {
        await copyInputAsset();
      }

      if (!inputPath) {
        throw new Error('Input asset nije dostupan.');
      }

      const sound = new Audio.Sound();
      // await sound.loadAsync({ uri: FileSystem.documentDirectory + 'output.mp3' });
      // await sound.loadAsync({ uri: (FileSystem as any).documentDirectory + 'output.wav' });
      await sound.loadAsync({ uri: inputPath });
      await sound.playAsync();
      console.log('Puštam originalni MP3...');
    } catch (err) {
      console.error('Greška pri puštanju originala:', err);
    }
  }

  async function trimAndPlay() {
    try {
      // const inputPath = FileSystem.documentDirectory + 'output.mp3';
      // const trimmedPath = FileSystem.documentDirectory + 'trimmed.mp3';
      const inputPath = FileSystem.documentDirectory + 'input.wav';
      const trimmedPath = FileSystem.documentDirectory + 'trimmed.wav';

      // Trimuj od 1s do 3s
      const command = `-i ${inputPath} -ss 00:00:01 -to 00:00:03 -c copy ${trimmedPath}`;
      await FFmpegKit.execute(command);

      console.log('Trimovanje završeno!');

      const info = await FileSystem.getInfoAsync(trimmedPath);
      console.log('Trimovani fajl info:', info);

      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: trimmedPath });
      await sound.playAsync();
      console.log('Puštam trimovani MP3...');
    } catch (err) {
      console.error('Greška pri trimovanju/puštanju:', err);
    }
  }

  async function listFiles() {
    try {
      const path = FileSystem.documentDirectory === null ? "" : FileSystem.documentDirectory;
      const files = await FileSystem.readDirectoryAsync(path);
      console.log("Sadržaj sandboxa:", files);
    } catch (error) {
      console.log("Greška:", error);
    }
  }

  return(
    <View style={styles.container}>
      <Text>Dobrodošli na početnu stranicu!</Text>
      <Button title='Login' onPress={() => navigation.navigate('Login')} />
      <Text>Open up App.js to start working on your app!</Text>
      <Text>Radi li?</Text>
      <Button title='Filters' onPress={() => navigation.navigate('Filters')} />

      <Text>MP3 Player Demo</Text>
      <Button title="▶️ Pusti Original" onPress={playOriginal} />
      <View style={{ marginTop: 20 }} />
      <Button title="✂️ Trimuj i Pusti" onPress={trimAndPlay} />

      <View style={styles.loginContainer} />
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.login}>Sign in</Text>
      </TouchableOpacity>
      <Button title='Visual' onPress={() => navigation.navigate('Visual')} />
        <Button title='Skia Visual' onPress={() => navigation.navigate('Skia')} />
      <Button title='Sandbox' onPress={listFiles} />
      <Button title='SourceSeparation' onPress={() => navigation.navigate('SourceSeparation')} />
      <StatusBar style='auto' />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name='Home' component={HomeScreen}/>
        <Stack.Screen name='Login' component={LoginScreen} />
        <Stack.Screen name='Filters' component={FiltersScreen} />
        <Stack.Screen name='Visual' component={VisualScreen} />
        <Stack.Screen name='Skia' component={SkiaVisualScreen} />
        <Stack.Screen name='SourceSeparation' component={SourceSeparationPlayerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginContainer: {
    marginTop: 40,
  },
  login: {
    color: '#e3750f',
  }
});
