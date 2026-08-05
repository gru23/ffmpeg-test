import { Canvas, Group, Path, Skia, Text as SkiaText, useFont } from '@shopify/react-native-skia';
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
import React, { useEffect, useMemo, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit, FFprobeKit } from 'ffmpeg-kit-react-native';
import { Buffer } from 'buffer';

import { RootStackParamList } from '../../../App';

type EditorRouteProp = RouteProp<RootStackParamList, 'EditorScreen'>;

// Sirovi podaci jedne učitane pesme - čuvamo kanale (ne Skia Path), da bismo
// mogli da ih ponovo iscrtamo u ispravnoj širini kad se doda duža/kraća pesma.
type TrackData = {
  id: string;
  title: string;
  duration: number;
  leftChannel: number[];
  rightChannel: number[] | null;
  fillColorL: string;
  strokeColorL: string;
  fillColorR: string;
  strokeColorR: string;
};

type ChannelRow = {
  key: string;
  path: any;
  fillColor: string;
  strokeColor: string;
  yTop: number;
};

type TrackLayout = {
  id: string;
  title: string;
  titleY: number;
  channels: ChannelRow[];
  separatorY: number | null;
};

const AXIS_GUTTER = 34;
const CHANNEL_GAP = 20;
const TIME_AXIS_AREA = 40;
const TRACK_TITLE_HEIGHT = 18;
const TRACK_SEPARATOR_GAP = 16;
const META_AREA = 56;
const CONTAINER_VERTICAL_PADDING = 28 + 20;
const MIN_CHANNEL_HEIGHT = 70;
const WAVEFORM_SAMPLE_RATE = 8000;
const TRACK_COLORS = [
  { fillColorL: 'rgba(37, 99, 235, 0.40)', strokeColorL: 'rgba(29, 78, 216, 0.98)', fillColorR: 'rgba(239, 68, 68, 0.40)', strokeColorR: 'rgba(220, 38, 38, 0.98)' },
  { fillColorL: 'rgba(16, 185, 129, 0.40)', strokeColorL: 'rgba(5, 150, 105, 0.98)', fillColorR: 'rgba(245, 158, 11, 0.40)', strokeColorR: 'rgba(217, 119, 6, 0.98)' },
  { fillColorL: 'rgba(139, 92, 246, 0.40)', strokeColorL: 'rgba(109, 40, 217, 0.98)', fillColorR: 'rgba(236, 72, 153, 0.40)', strokeColorR: 'rgba(219, 39, 119, 0.98)' },
];

export default function EditorScreen() {
  const route = useRoute<EditorRouteProp>();
  const initialPath = route.params?.path;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // samo za PRVO učitavanje
  const [isAddingTrack, setIsAddingTrack] = useState<boolean>(false); // za dodavanje sledećih
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

  // Trajanje najduže pesme diktira širinu celog platna - sve pesme dele istu
  // vremensku osu, pa se svaka kraća pesma proporcionalno "steže" u tu širinu.
  const maxDuration = tracks.length ? Math.max(...tracks.map((t) => t.duration)) : 0;
  const canvasWidth = Math.max(
    Math.max(320, screenWidth - 40),
    Math.min(4000, Math.ceil(maxDuration * 70) + AXIS_GUTTER + 2)
  );
  const plotWidth = Math.max(1, canvasWidth - AXIS_GUTTER - 2);

  // Fiksna visina po kanalu, računata za JEDNU stereo pesmu koliko-toliko
  // ispuni ekran - ne smanjuje se kad se doda još pesama; umesto toga se
  // ceo sadržaj produžava i postaje vertikalno skrolabilan.
  const availableForOneTrack = Math.max(
    MIN_CHANNEL_HEIGHT * 2,
    screenHeight - CONTAINER_VERTICAL_PADDING - META_AREA - TIME_AXIS_AREA - TRACK_TITLE_HEIGHT - CHANNEL_GAP
  );
  const channelHeight = Math.max(MIN_CHANNEL_HEIGHT, Math.floor(availableForOneTrack / 2));

  function smoothSeries(values: number[]) {
    if (values.length < 3) return values;
    const out = [...values];
    for (let i = 1; i < values.length - 1; i++) {
      out[i] = values[i - 1] * 0.12 + values[i] * 0.76 + values[i + 1] * 0.12;
    }
    return out;
  }

  function createWaveformEnvelopePath(
    samples: number[],
    width: number,
    height: number,
    yOffset: number = 0,
    referenceLevel?: number,
    xOffset: number = 0
  ) {
    const path = Skia.Path.Make();
    const centerY = yOffset + height / 2;
    const columns = Math.max(1, Math.floor(width));

    if (samples.length === 0) return path;

    const xValues: number[] = [];
    const maxValues: number[] = [];
    const minValues: number[] = [];

    for (let col = 0; col < columns; col++) {
      const start = Math.floor((col * samples.length) / columns);
      const end = Math.floor(((col + 1) * samples.length) / columns);
      if (end <= start) continue;

      let minV = 1;
      let maxV = -1;
      for (let i = start; i < end; i++) {
        const v = samples[i];
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }

      xValues.push(xOffset + col);
      minValues.push(minV);
      maxValues.push(maxV);
    }

    if (xValues.length === 0) return path;

    const smoothMin = smoothSeries(minValues);
    const smoothMax = smoothSeries(maxValues);
    const reference = Math.max(1e-6, referenceLevel ?? 1);
    const halfHeight = height / 2;

    const topY = smoothMax.map((v) => centerY - Math.min(1, Math.max(-1, v / reference)) * halfHeight);
    const bottomY = smoothMin.map((v) => centerY - Math.min(1, Math.max(-1, v / reference)) * halfHeight);

    path.moveTo(xValues[0], topY[0]);
    for (let i = 1; i < xValues.length; i++) path.lineTo(xValues[i], topY[i]);
    for (let i = xValues.length - 1; i >= 0; i--) path.lineTo(xValues[i], bottomY[i]);
    path.close();
    return path;
  }

  function createCenterLinePath(width: number, height: number, yOffset: number = 0, xOffset: number = 0) {
    const path = Skia.Path.Make();
    const y = yOffset + height / 2;
    path.moveTo(xOffset, y);
    path.lineTo(xOffset + width, y);
    return path;
  }

  function createNormalizedSamples(buffer: Buffer, codecName: string, bitsPerSample: number): number[] {
    const isFloat32 = codecName.includes('f32');
    const isFloat64 = codecName.includes('f64');
    const isSigned = codecName.includes('_s') || isFloat32 || isFloat64;
    const isBigEndian = codecName.endsWith('be');
    const littleEndian = !isBigEndian;

    if (isFloat32) {
      const bytesPerSample = 4;
      const sampleCount = Math.floor(buffer.length / bytesPerSample);
      const out = new Array<number>(sampleCount);
      const view = new DataView(buffer.buffer, buffer.byteOffset, sampleCount * bytesPerSample);
      for (let i = 0; i < sampleCount; i++) out[i] = view.getFloat32(i * bytesPerSample, littleEndian);
      return out;
    }

    if (isFloat64) {
      const bytesPerSample = 8;
      const sampleCount = Math.floor(buffer.length / bytesPerSample);
      const out = new Array<number>(sampleCount);
      const view = new DataView(buffer.buffer, buffer.byteOffset, sampleCount * bytesPerSample);
      for (let i = 0; i < sampleCount; i++) out[i] = view.getFloat64(i * bytesPerSample, littleEndian);
      return out;
    }

    const bytesPerSample = Math.max(1, Math.floor(bitsPerSample / 8));
    const sampleCount = Math.floor(buffer.length / bytesPerSample);
    const out = new Array<number>(sampleCount);
    const view = new DataView(buffer.buffer, buffer.byteOffset, sampleCount * bytesPerSample);

    for (let i = 0; i < sampleCount; i++) {
      const offset = i * bytesPerSample;
      let raw = 0;

      if (bytesPerSample === 1) {
        raw = isSigned ? view.getInt8(offset) : view.getUint8(offset) - 128;
      } else if (bytesPerSample === 2) {
        raw = isSigned ? view.getInt16(offset, littleEndian) : view.getUint16(offset, littleEndian) - 32768;
      } else if (bytesPerSample === 3) {
        const b0 = view.getUint8(offset + (littleEndian ? 0 : 2));
        const b1 = view.getUint8(offset + 1);
        const b2 = view.getUint8(offset + (littleEndian ? 2 : 0));
        let value = b0 | (b1 << 8) | (b2 << 16);
        if (isSigned && (value & 0x800000)) value |= 0xff000000;
        raw = isSigned ? (value << 8) >> 8 : value - 0x800000;
      } else {
        raw = isSigned ? view.getInt32(offset, littleEndian) : view.getUint32(offset, littleEndian) - 2147483648;
      }

      const pcmRange = Math.pow(2, bitsPerSample - 1);
      out[i] = Math.max(-1, Math.min(1, raw / pcmRange));
    }

    return out;
  }

  // Izvlači kanale + trajanje iz bilo kog audio fajla. Ne pravi Skia Path ovde -
  // to se radi u derivedTracks memou, jer širina zavisi od trajanja SVIH pesama.
  async function extractTrackData(filePath: string): Promise<Omit<TrackData, 'fillColorL' | 'strokeColorL' | 'fillColorR' | 'strokeColorR'>> {
    const pathInfo = await FileSystem.getInfoAsync(filePath);
    if (!pathInfo.exists) {
      throw new Error('Audio fajl ne postoji na putanji.');
    }

    const pcmPath = FileSystem.documentDirectory + `editor_waveform_${Date.now()}.pcm`;
    const ffmpegInputPath = filePath.replace('file://', '');
    const ffmpegPcmPath = pcmPath.replace('file://', '');

    const infoCommand = `-i "${ffmpegInputPath}" -select_streams a:0 -show_entries stream=channels,duration -of default=noprint_wrappers=1`;
    const session = await FFprobeKit.execute(infoCommand);
    const infoOutput = await session.getOutput();

    const channelsMatch = infoOutput.match(/channels=(\d+)/);
    const durationMatch = infoOutput.match(/duration=([\d.]+)/);
    const channels = channelsMatch ? parseInt(channelsMatch[1], 10) : 1;
    const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

    const pcmCommand = `-y -i "${ffmpegInputPath}" -vn -f s16le -acodec pcm_s16le -ar ${WAVEFORM_SAMPLE_RATE} "${ffmpegPcmPath}"`;
    await FFmpegKit.execute(pcmCommand);

    const pcmData = await FileSystem.readAsStringAsync(pcmPath, { encoding: FileSystem.EncodingType.Base64 });
    let buffer: Buffer | null = Buffer.from(pcmData, 'base64');
    const samples = createNormalizedSamples(buffer, 'pcm_s16le', 16);
    buffer = null;
    await FileSystem.deleteAsync(pcmPath, { idempotent: true });

    const leftChannel: number[] = [];
    const rightChannel: number[] = [];
    for (let i = 0; i < samples.length; i += channels) {
      leftChannel.push(samples[i]);
      if (channels > 1 && i + 1 < samples.length) rightChannel.push(samples[i + 1]);
    }

    const fileName = filePath.split('/').pop() ?? 'Audio';
    const displayTitle = fileName.replace(/\.[^/.]+$/, '');

    return {
      id: `track-${Date.now()}`,
      title: displayTitle,
      duration,
      leftChannel,
      rightChannel: rightChannel.length > 0 ? rightChannel : null,
    };
  }

  async function loadInitialTrack(filePath: string) {
    try {
      const data = await extractTrackData(filePath);
      const colors = TRACK_COLORS[0];
      setTracks([{ ...data, ...colors }]);
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

      setIsAddingTrack(true);
      const data = await extractTrackData(result.assets[0].uri);
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

  // Skia Path-ovi se prave OVDE, zavisno od trenutne plotWidth (koja zavisi od
  // trajanja najduže pesme) - kad se doda duža pesma, sve prethodne pesme se
  // ponovo iscrtaju u novoj (užoj) razmeri, jer im se menja proporcionalna širina.
  const derivedTracks = useMemo(() => {
    return tracks.map((t) => {
      const trackPlotWidth = maxDuration > 0 ? Math.max(1, Math.round(plotWidth * (t.duration / maxDuration))) : plotWidth;
      const leftPath = createWaveformEnvelopePath(t.leftChannel, trackPlotWidth, 1, 0, 1, 0);
      const rightPath = t.rightChannel
        ? createWaveformEnvelopePath(t.rightChannel, trackPlotWidth, 1, 0, 1, 0)
        : null;
      return { ...t, leftPath, rightPath };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, plotWidth, maxDuration]);

  let cursor = 0;
  const trackLayouts: TrackLayout[] = derivedTracks.map((t, ti) => {
    const titleY = cursor;
    cursor += TRACK_TITLE_HEIGHT;

    const rows = t.rightPath
      ? [
          { path: t.leftPath, fillColor: t.fillColorL, strokeColor: t.strokeColorL, key: `${t.id}-L` },
          { path: t.rightPath, fillColor: t.fillColorR, strokeColor: t.strokeColorR, key: `${t.id}-R` },
        ]
      : [{ path: t.leftPath, fillColor: t.fillColorL, strokeColor: t.strokeColorL, key: `${t.id}-L` }];

    const channels: ChannelRow[] = rows.map((r, ri) => {
      const yTop = cursor;
      cursor += channelHeight;
      if (ri < rows.length - 1) cursor += CHANNEL_GAP;
      return { ...r, yTop };
    });

    let separatorY: number | null = null;
    if (ti < derivedTracks.length - 1) {
      separatorY = cursor + TRACK_SEPARATOR_GAP / 2;
      cursor += TRACK_SEPARATOR_GAP;
    }

    return { id: t.id, title: t.title, titleY, channels, separatorY };
  });

  const waveformContentHeight = cursor;
  const canvasHeight = TIME_AXIS_AREA + waveformContentHeight;
  const plotClipRect = Skia.XYWHRect(0, 0, plotWidth, canvasHeight);

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
      {/* Vertikalni scroll oko celog sadržaja - waveform + dugme za dodavanje */}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.waveformStage}>
          <View style={{ flexDirection: 'row', position: 'relative' }}>
            <Canvas style={{ width: AXIS_GUTTER, height: canvasHeight }}>
              {(() => {
                const ampTicks = [1, 0.5, 0, -0.5, -1];

                const drawChannelAxis = (yOffset: number, keyPrefix: string) => {
                  const axisPath = Skia.Path.Make();
                  axisPath.moveTo(AXIS_GUTTER, yOffset);
                  axisPath.lineTo(AXIS_GUTTER, yOffset + channelHeight);

                  return (
                    <React.Fragment key={`${keyPrefix}-axis`}>
                      <Path path={axisPath} color="#9ca3af" style="stroke" strokeWidth={1} />
                      {ampTicks.map((amp) => {
                        const y = yOffset + ((1 - amp) * channelHeight) / 2;
                        const tickPath = Skia.Path.Make();
                        tickPath.moveTo(AXIS_GUTTER - 5, y);
                        tickPath.lineTo(AXIS_GUTTER, y);
                        const label = amp.toFixed(1);
                        const labelWidth = font?.measureText(label).width ?? 0;

                        return (
                          <React.Fragment key={`${keyPrefix}-tick-${amp}`}>
                            <Path path={tickPath} color="#9ca3af" style="stroke" strokeWidth={1} />
                            {font && (
                              <SkiaText text={label} x={AXIS_GUTTER - 8 - labelWidth} y={y + 4} font={font} color="#111827" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                };

                return (
                  <>
                    {trackLayouts.map((tl) =>
                      tl.channels.map((row) => drawChannelAxis(TIME_AXIS_AREA + row.yTop, row.key))
                    )}
                  </>
                );
              })()}
            </Canvas>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
              <Canvas style={{ width: canvasWidth - AXIS_GUTTER, height: canvasHeight }}>
                {(() => (
                  <>
                    {maxDuration > 0 && font && (() => {
                      const desiredTickSpacingPx = 50;
                      const pixelsPerSecond = plotWidth / maxDuration;
                      let step = Math.ceil(maxDuration / (plotWidth / desiredTickSpacingPx));
                      const axisEndSeconds = Math.ceil(maxDuration);
                      if (step < 1) step = 1;

                      const tickColor = '#6b7280';
                      const labelColor = '#111827';
                      const axisY = TIME_AXIS_AREA - 18;

                      return (
                        <Group>
                          <Path
                            path={(() => {
                              const axis = Skia.Path.Make();
                              axis.moveTo(0, axisY);
                              axis.lineTo(plotWidth, axisY);
                              return axis;
                            })()}
                            color={tickColor}
                            style="stroke"
                            strokeWidth={1}
                          />
                          {Array.from({ length: axisEndSeconds + 1 }).map((_, idx) => {
                            const sec = idx;
                            if (sec % step !== 0) return null;
                            const x = sec * pixelsPerSecond;
                            const tick = Skia.Path.Make();
                            tick.moveTo(x, axisY);
                            tick.lineTo(x, axisY - 5);
                            const label = `${sec}s`;
                            const labelWidth = font.measureText(label).width;

                            return (
                              <React.Fragment key={`time-${sec}`}>
                                <Path path={tick} color={tickColor} style="stroke" strokeWidth={1} />
                                <SkiaText text={label} x={x - labelWidth / 2} y={axisY - 8} font={font} color={labelColor} />
                              </React.Fragment>
                            );
                          })}
                        </Group>
                      );
                    })()}

                    <Group clip={plotClipRect}>
                      {trackLayouts.map((tl) =>
                        tl.channels.map((row) => {
                          const yOffset = TIME_AXIS_AREA + row.yTop;
                          return (
                            <React.Fragment key={row.key}>
                              <Path
                                path={createCenterLinePath(plotWidth, channelHeight, yOffset, 0)}
                                color="#9ca3af"
                                style="stroke"
                                strokeWidth={0.8}
                              />
                              <Group transform={[{ translateY: yOffset }, { scaleY: channelHeight }]}>
                                <Path path={row.path} color={row.fillColor} style="fill" />
                              </Group>
                              <Group transform={[{ translateY: yOffset }, { scaleY: channelHeight }]}>
                                <Path path={row.path} color={row.strokeColor} style="stroke" strokeWidth={0.9 / channelHeight} />
                              </Group>
                            </React.Fragment>
                          );
                        })
                      )}

                      {trackLayouts.map(
                        (tl) =>
                          tl.separatorY !== null && (
                            <Path
                              key={`${tl.id}-separator`}
                              path={(() => {
                                const p = Skia.Path.Make();
                                const y = TIME_AXIS_AREA + tl.separatorY!;
                                p.moveTo(0, y);
                                p.lineTo(plotWidth, y);
                                return p;
                              })()}
                              color="#c7cfdb"
                              style="stroke"
                              strokeWidth={1}
                            />
                          )
                      )}
                    </Group>
                  </>
                ))()}
              </Canvas>
            </ScrollView>

            <View pointerEvents="none" style={[styles.titleOverlay, { left: AXIS_GUTTER, height: canvasHeight }]}>
              {trackLayouts.map((tl) => (
                <Text key={`${tl.id}-title`} style={[styles.trackTitle, { top: TIME_AXIS_AREA + tl.titleY }]} numberOfLines={1}>
                  {tl.title}
                </Text>
              ))}
            </View>
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
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    paddingTop: 28,
    paddingHorizontal: 5,
  },
  waveformStage: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  titleOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  trackTitle: {
    position: 'absolute',
    left: 4,
    fontSize: 11,
    fontWeight: '500',
    color: '#8a94a6',
  },
  meta: {
    marginTop: 14,
    marginHorizontal: 15,
    color: '#46607c',
    fontSize: 13,
  },
  addButton: {
    marginTop: 20,
    marginHorizontal: 15,
    backgroundColor: '#1561bd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#17324d',
    fontSize: 15,
  },
  errorText: {
    color: '#b42318',
    fontSize: 16,
    textAlign: 'center',
  },
});