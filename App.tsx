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

const Stack = createNativeStackNavigator();

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
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

    const destPath = FileSystem.documentDirectory + 'input.wav';
    const sourceUri = asset.localUri ?? asset.uri;

    await FileSystem.copyAsync({ from: sourceUri, to: destPath });
    setInputPath(destPath);
    setIsInputReady(true);
    console.log('Asset kopiran u:', destPath);
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

  return(
    <View style={styles.container}>
      <Text>Dobrodošli na početnu stranicu!</Text>
      <Button title='Login' onPress={() => navigation.navigate('Login')} />
      <Text>Open up App.js to start working on your app!</Text>
      <Text>Radi li?</Text>

      <Text>MP3 Player Demo</Text>
      <Button title="▶️ Pusti Original" onPress={playOriginal} />
      <View style={{ marginTop: 20 }} />
      <Button title="✂️ Trimuj i Pusti" onPress={trimAndPlay} />

      <View style={styles.loginContainer} />
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.login}>Sign in</Text>
      </TouchableOpacity>
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
