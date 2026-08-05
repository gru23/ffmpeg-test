import { Canvas, Group, useFont } from '@shopify/react-native-skia';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';

import { RootStackParamList } from '../../../App';
import { AXIS_GUTTER, TrackData, TRACK_COLORS } from './types';
import { extractTrackData } from './audioExtraction';
import { useEditorLayout } from './useEditorLayout';
import TimeAxis from './components/TimeAxis';
import AmplitudeAxis from './components/AmplitudeAxis';
import Track from './components/Track';
import TrackTitles from './components/TrackTitles';

type EditorRouteProp = RouteProp<RootStackParamList, 'EditorScreen'>;

export default function EditorScreen() {
  const route = useRoute<EditorRouteProp>();
  const initialPath = route.params?.path;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddingTrack, setIsAddingTrack] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );

  const font = useFont(require('../../../assets/Roboto-Regular.ttf'), 12);
  const { maxDuration, canvasWidth, plotWidth, channelHeight, trackLayouts, canvasHeight, plotClipRect } =
    useEditorLayout(tracks, screenWidth, screenHeight);

  async function loadInitialTrack(filePath: string) {
    try {
      const data = await extractTrackData(filePath);
      setTracks([{ ...data, ...TRACK_COLORS[0] }]);
      setErrorText(null);
    } catch (err) {
      console.error('Greška pri ekstrakciji PCM:', err);
      setErrorText('Greška pri učitavanju audio signala.');
    } finally {
      setIsLoading(false);
    }
  }

  async function pickAndAddTrack() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setIsAddingTrack(true);
      // asset.name = originalno ime fajla; asset.uri = putanja do kopije u
      // cache-u sa generisanim imenom - zato ga ne koristimo za naslov.
      const data = await extractTrackData(asset.uri, asset.name);
      const colors = TRACK_COLORS[tracks.length % TRACK_COLORS.length];
      setTracks((prev) => [...prev, { ...data, ...colors }]);
    } catch (err) {
      console.error('Greška pri dodavanju pesme:', err);
      Alert.alert('Greška', 'Nije uspelo dodavanje pesme.');
    } finally {
      setIsAddingTrack(false);
    }
  }

  useEffect(() => {
    if (initialPath) {
      void loadInitialTrack(initialPath);
    } else {
      setErrorText('Nije izabran audio fajl.');
      setIsLoading(false);
    }
  }, [initialPath]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1561bd" />
        <Text style={styles.loadingText}>Učitavam signal...</Text>
      </View>
    );
  }

  if (errorText && tracks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorText}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.waveformStage}>
          <View style={{ flexDirection: 'row', position: 'relative' }}>
            <Canvas style={{ width: AXIS_GUTTER, height: canvasHeight }}>
              <AmplitudeAxis trackLayouts={trackLayouts} channelHeight={channelHeight} font={font} />
            </Canvas>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
              <Canvas style={{ width: canvasWidth - AXIS_GUTTER, height: canvasHeight }}>
                <TimeAxis plotWidth={plotWidth} durationSeconds={maxDuration} font={font} />

                <Group clip={plotClipRect}>
                  {trackLayouts.map((layout, idx) => (
                    <Track
                      key={layout.id}
                      layout={layout}
                      plotWidth={plotWidth}
                      channelHeight={channelHeight}
                      isLast={idx === trackLayouts.length - 1}
                    />
                  ))}
                </Group>
              </Canvas>
            </ScrollView>

            <TrackTitles trackLayouts={trackLayouts} canvasHeight={canvasHeight} />
          </View>
        </View>

        <Text style={styles.meta}>Trajanje: {maxDuration.toFixed(2)} s</Text>
        <Text style={styles.meta} numberOfLines={2}>Putanja: {initialPath ?? '-'}</Text>

        <TouchableOpacity style={styles.addButton} onPress={pickAndAddTrack} disabled={isAddingTrack}>
          {isAddingTrack ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.addButtonText}>+ Dodaj pjesmu</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb', paddingTop: 28, paddingHorizontal: 5 },
  waveformStage: { backgroundColor: 'transparent', paddingVertical: 8 },
  meta: { marginTop: 14, marginHorizontal: 15, color: '#46607c', fontSize: 13 },
  addButton: {
    marginTop: 20,
    marginHorizontal: 15,
    backgroundColor: '#1561bd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fb', padding: 20 },
  loadingText: { marginTop: 12, color: '#17324d', fontSize: 15 },
  errorText: { color: '#b42318', fontSize: 16, textAlign: 'center' },
});