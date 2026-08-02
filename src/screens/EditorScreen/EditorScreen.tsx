import { Canvas, Group, Path, Skia, Text as SkiaText, useFont } from '@shopify/react-native-skia';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit, FFprobeKit } from 'ffmpeg-kit-react-native';
import { Buffer } from 'buffer';

import { RootStackParamList } from '../../../App';

type EditorRouteProp = RouteProp<RootStackParamList, 'EditorScreen'>;

export default function EditorScreen() {
  const route = useRoute<EditorRouteProp>();
  const path = route.params?.path;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const [waveformPath, setWaveformPath] = useState<any>(null);
  const [rightWaveformPath, setRightWaveformPath] = useState<any>(null);
  const [durationInSeconds, setDurationInSeconds] = useState<number>(0);
  const [canvasWidth, setCanvasWidth] = useState<number>(Math.max(320, screenWidth - 40));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const height = Math.max(150, Math.floor((screenHeight - 280) / 2));
  const axisGutter = 34;
  const plotWidth = Math.max(1, canvasWidth - axisGutter - 2);
  const channelGap = 30;
  const bottomChannelOffset = height + channelGap;
  const waveformBottom = bottomChannelOffset + height;
  const plotClipRect = Skia.XYWHRect(axisGutter, 0, plotWidth, waveformBottom);

  useFocusEffect(
    React.useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );

  const font = useFont(require('../../../assets/Roboto-Regular.ttf'), 12);
  function smoothSeries(values: number[]) {
    if (values.length < 3) {
      return values;
    }

    const out = [...values];
    for (let i = 1; i < values.length - 1; i++) {
      out[i] = values[i - 1] * 0.12 + values[i] * 0.76 + values[i + 1] * 0.12;
    }
    return out;
  }

  function collectBucketPeaks(samples: number[], width: number) {
    const columns = Math.max(1, Math.floor(width));
    const peaks: number[] = [];

    for (let col = 0; col < columns; col++) {
      const start = Math.floor((col * samples.length) / columns);
      const end = Math.floor(((col + 1) * samples.length) / columns);

      if (end <= start) {
        continue;
      }

      let peak = 0;
      for (let i = start; i < end; i++) {
        const abs = Math.abs(samples[i]);
        if (abs > peak) {
          peak = abs;
        }
      }

      peaks.push(peak);
    }

    return peaks;
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

    if (samples.length === 0) {
      return path;
    }

    const xValues: number[] = [];
    const maxValues: number[] = [];
    const minValues: number[] = [];

    for (let col = 0; col < columns; col++) {
      const start = Math.floor((col * samples.length) / columns);
      const end = Math.floor(((col + 1) * samples.length) / columns);

      if (end <= start) {
        continue;
      }

      let minV = 1;
      let maxV = -1;

      for (let i = start; i < end; i++) {
        const v = samples[i];
        if (v < minV) {
          minV = v;
        }
        if (v > maxV) {
          maxV = v;
        }
      }

      xValues.push(xOffset + col);
      minValues.push(minV);
      maxValues.push(maxV);
    }

    if (xValues.length === 0) {
      return path;
    }

    const smoothMin = smoothSeries(minValues);
    const smoothMax = smoothSeries(maxValues);
    const reference = Math.max(1e-6, referenceLevel ?? 1);
    const halfHeight = height / 2;

    const topY = smoothMax.map((v) => {
      const normalized = Math.min(1, Math.max(-1, v / reference));
      return centerY - normalized * halfHeight;
    });

    const bottomY = smoothMin.map((v) => {
      const normalized = Math.min(1, Math.max(-1, v / reference));
      return centerY - normalized * halfHeight;
    });

    path.moveTo(xValues[0], topY[0]);
    for (let i = 1; i < xValues.length; i++) {
      path.lineTo(xValues[i], topY[i]);
    }

    for (let i = xValues.length - 1; i >= 0; i--) {
      path.lineTo(xValues[i], bottomY[i]);
    }

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

      for (let i = 0; i < sampleCount; i++) {
        out[i] = view.getFloat32(i * bytesPerSample, littleEndian);
      }

      return out;
    }

    if (isFloat64) {
      const bytesPerSample = 8;
      const sampleCount = Math.floor(buffer.length / bytesPerSample);
      const out = new Array<number>(sampleCount);
      const view = new DataView(buffer.buffer, buffer.byteOffset, sampleCount * bytesPerSample);

      for (let i = 0; i < sampleCount; i++) {
        out[i] = view.getFloat64(i * bytesPerSample, littleEndian);
      }

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
        if (isSigned && (value & 0x800000)) {
          value |= 0xff000000;
        }
        raw = isSigned ? (value << 8) >> 8 : value - 0x800000;
      } else {
        raw = isSigned ? view.getInt32(offset, littleEndian) : view.getUint32(offset, littleEndian) - 2147483648;
      }

      const pcmRange = Math.pow(2, bitsPerSample - 1);
      out[i] = Math.max(-1, Math.min(1, raw / pcmRange));
    }

    return out;
  }

  async function extractPCM() {
    try {
      if (!path) {
        setErrorText('Nije izabran audio fajl.');
        setIsLoading(false);
        return;
      }

      const pathInfo = await FileSystem.getInfoAsync(path);
      if (!pathInfo.exists) {
        setErrorText('Audio fajl ne postoji na putanji.');
        setIsLoading(false);
        return;
      }

      const pcmPath = FileSystem.documentDirectory + 'editor_waveform.pcm';
      const ffmpegInputPath = path.replace('file://', '');
      const ffmpegPcmPath = pcmPath.replace('file://', '');

      await FileSystem.deleteAsync(pcmPath, { idempotent: true });

      // Info o originalnom fajlu - samo channels i duration su nam potrebni,
      // format uvek forsiramo na fiksni raw PCM ispod
      const infoCommand = `-i "${ffmpegInputPath}" -select_streams a:0 -show_entries stream=channels,sample_rate,duration -of default=noprint_wrappers=1`;
      const session = await FFprobeKit.execute(infoCommand);
      const infoOutput = await session.getOutput();

      const channelsMatch = infoOutput.match(/channels=(\d+)/);
      const durationMatch = infoOutput.match(/duration=([\d.]+)/);

      const channels = channelsMatch ? parseInt(channelsMatch[1], 10) : 1;
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

      const bitsPerSample = 16;
      const dynamicCanvasWidth = Math.max(Math.max(320, screenWidth - 40), Math.min(4000, Math.ceil(duration * 70) + axisGutter + 2));
      const dynamicPlotWidth = Math.max(1, dynamicCanvasWidth - axisGutter - 2);

      // Uvek dekodiraj u fiksni raw PCM format (s16le), bez obzira na originalni kodek.
      // Sniženi sample rate jer nam za waveform overview ne treba puna rezolucija -
      // sprečava OutOfMemoryError kod dužih pesama.
      const WAVEFORM_SAMPLE_RATE = 8000;
      const pcmCommand = `-y -i "${ffmpegInputPath}" -vn -f s16le -acodec pcm_s16le -ar ${WAVEFORM_SAMPLE_RATE} "${ffmpegPcmPath}"`;
      await FFmpegKit.execute(pcmCommand);

      const pcmData = await FileSystem.readAsStringAsync(pcmPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let buffer: Buffer | null = Buffer.from(pcmData, 'base64');
      const samples = createNormalizedSamples(buffer, 'pcm_s16le', bitsPerSample);

      // Oslobodi base64 string i buffer čim su nam semplovi izvučeni -
      // ovo su najveći potrošači memorije u celoj funkciji
      buffer = null;

      setDurationInSeconds(duration);

      const leftChannel: number[] = [];
      const rightChannel: number[] = [];

      for (let i = 0; i < samples.length; i += channels) {
        leftChannel.push(samples[i]);
        if (channels > 1 && i + 1 < samples.length) {
          rightChannel.push(samples[i + 1]);
        }
      }

      const leftPath = createWaveformEnvelopePath(leftChannel, dynamicPlotWidth, height, 0, 1, axisGutter);
      setWaveformPath(leftPath);

      const leftPeaks = collectBucketPeaks(leftChannel, dynamicPlotWidth);
      const rightPeaks = channels === 2 ? collectBucketPeaks(rightChannel, dynamicPlotWidth) : [];
      const maxPeak = Math.max(0, ...leftPeaks, ...rightPeaks);
      console.log(`Waveform peak=${maxPeak.toFixed(4)} ref=1.0000`);

      if (channels === 2 || rightChannel.length > 0) {
        const rightPath = createWaveformEnvelopePath(rightChannel, dynamicPlotWidth, height, bottomChannelOffset, 1, axisGutter);
        setRightWaveformPath(rightPath);
      } else {
        setRightWaveformPath(null);
      }

      setCanvasWidth(dynamicCanvasWidth);

      setErrorText(null);
    } catch (err) {
      console.error('Greška pri ekstrakciji PCM:', err);
      setErrorText('Greška pri učitavanju audio signala.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void extractPCM();
  }, [path]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1561bd" />
        <Text style={styles.loadingText}>Učitavam signal...</Text>
      </View>
    );
  }

  if (errorText) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>Editor</Text> */}
      {/* <Text style={styles.subtitle}>Signal izabranog pjesme</Text> */}

      <View style={styles.waveformStage}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <Canvas style={{ width: canvasWidth, height: waveformBottom + 70 }}>
          {(() => {
            const ampTicks = [1, 0.5, 0, -0.5, -1];

            const drawChannelAxis = (yOffset: number, keyPrefix: string) => {
              const axisPath = Skia.Path.Make();
              axisPath.moveTo(axisGutter, yOffset);
              axisPath.lineTo(axisGutter, yOffset + height);

              return (
                <React.Fragment key={`${keyPrefix}-axis`}>
                  <Path path={axisPath} color="#9ca3af" style="stroke" strokeWidth={1} />
                  {ampTicks.map((amp) => {
                    const y = yOffset + ((1 - amp) * height) / 2;
                    const tickPath = Skia.Path.Make();
                    tickPath.moveTo(axisGutter - 5, y);
                    tickPath.lineTo(axisGutter, y);

                    const label = amp.toFixed(1);
                    const labelWidth = font?.measureText(label).width ?? 0;

                    return (
                      <React.Fragment key={`${keyPrefix}-tick-${amp}`}>
                        <Path path={tickPath} color="#9ca3af" style="stroke" strokeWidth={1} />
                        {font && (
                          <SkiaText
                            text={label}
                            x={axisGutter - 8 - labelWidth}
                            y={y + 4}
                            font={font}
                            color="#111827"
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            };

            return (
              <>
                {drawChannelAxis(0, 'top')}
                {rightWaveformPath && drawChannelAxis(bottomChannelOffset, 'bottom')}
                <Group clip={plotClipRect}>
                  <Path
                    path={createCenterLinePath(plotWidth, height, 0, axisGutter)}
                    color="#9ca3af"
                    style="stroke"
                    strokeWidth={0.8}
                  />
                  {rightWaveformPath && (
                    <Path
                      path={createCenterLinePath(plotWidth, height, bottomChannelOffset, axisGutter)}
                      color="#9ca3af"
                      style="stroke"
                      strokeWidth={0.8}
                    />
                  )}
                  <Path path={waveformPath} color="rgba(37, 99, 235, 0.40)" style="fill" />
                  <Path path={waveformPath} color="rgba(29, 78, 216, 0.98)" style="stroke" strokeWidth={0.9} />
                  {rightWaveformPath && (
                    <>
                      <Path path={rightWaveformPath} color="rgba(239, 68, 68, 0.40)" style="fill" />
                      <Path path={rightWaveformPath} color="rgba(220, 38, 38, 0.98)" style="stroke" strokeWidth={0.9} />
                    </>
                  )}
                </Group>

                {durationInSeconds > 0 && font && (() => {
                  const desiredTickSpacingPx = 50;
                  const pixelsPerSecond = plotWidth / durationInSeconds;
                  let step = Math.ceil(durationInSeconds / (plotWidth / desiredTickSpacingPx));
                  const axisEndSeconds = Math.ceil(durationInSeconds);

                  if (step < 1) {
                    step = 1;
                  }

                  const tickColor = '#6b7280';
                  const labelColor = '#111827';
                  const axisY = waveformBottom + 18;

                  return (
                    <Group>
                      <Path
                        path={(() => {
                          const axis = Skia.Path.Make();
                          axis.moveTo(axisGutter, axisY);
                          axis.lineTo(axisGutter + plotWidth, axisY);
                          return axis;
                        })()}
                        color={tickColor}
                        style="stroke"
                        strokeWidth={1}
                      />
                      {Array.from({ length: axisEndSeconds + 1 }).map((_, idx) => {
                        const sec = idx;
                        if (sec % step !== 0) {
                          return null;
                        }

                        const x = axisGutter + sec * pixelsPerSecond;
                        const tick = Skia.Path.Make();
                        tick.moveTo(x, axisY);
                        tick.lineTo(x, axisY + 5);

                        const label = `${sec}s`;
                        const labelWidth = font.measureText(label).width;

                        return (
                          <React.Fragment key={`time-${sec}`}>
                            <Path path={tick} color={tickColor} style="stroke" strokeWidth={1} />
                            <SkiaText text={label} x={x - labelWidth / 2} y={axisY + 18} font={font} color={labelColor} />
                          </React.Fragment>
                        );
                      })}
                    </Group>
                  );
                })()}
              </>
            );
          })()}
          </Canvas>
        </ScrollView>
      </View>

      <Text style={styles.meta}>Trajanje: {durationInSeconds.toFixed(2)} s</Text>
      <Text style={styles.meta} numberOfLines={2}>Putanja: {path ?? '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17324d',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    color: '#6b7a90',
    fontSize: 14,
  },
  waveformStage: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  meta: {
    marginTop: 14,
    color: '#46607c',
    fontSize: 13,
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