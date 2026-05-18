import { Canvas, Group, Path, Skia, Text as SkiaText, useFont } from "@shopify/react-native-skia";
import { StyleSheet, View, Text, Button, PanResponder } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RouteProp } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit, FFprobeKit } from "ffmpeg-kit-react-native";
import { Buffer } from "buffer";
import { Dimensions } from "react-native";

type SkiaStackParamList = {
  SkiaVisual: { path: string };
};

type SkiaRouteProp = RouteProp<SkiaStackParamList, 'SkiaVisual'> | RouteProp<SkiaStackParamList, 'SkiaVisual'>;

type SkiaVisualScreenProps = {
  route: SkiaRouteProp;
};

export default function SkiaVisualScreen({ route }: SkiaVisualScreenProps) {
  const path = route?.params?.path;
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const [waveformPath, setWaveformPath] = useState<any>(null);
  const [rightWaveformPath, setRightWaveformPath] = useState<any>(null);
  const [durationInSeconds, setDurationInSeconds] = useState<number>(0);

  const [zoomFactor, setZoomFactor] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const panStartRef = useRef(0);
  const panOffsetRef = useRef(0);
  const maxPanOffsetRef = useRef(0);
  const zoomFactorRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const pendingPanRef = useRef(0);
  

  const width = screenWidth - 40;//350;
  const height = screenHeight / 6;//150;
  const axisGutter = 34;
  const plotWidth = Math.max(1, width - axisGutter - 2);
  const channelGap = 22;
  const topChannelOffset = 0;
  const bottomChannelOffset = height + channelGap;
  const waveformBottom = bottomChannelOffset + height;
  const plotClipRect = Skia.XYWHRect(axisGutter, 0, plotWidth, waveformBottom);
  const maxPanOffset = Math.max(0, plotWidth * zoomFactor - plotWidth);
  const waveformTranslateX = axisGutter * (1 - zoomFactor) - panOffset;

  const clampPan = (value: number) => Math.max(0, Math.min(value, maxPanOffsetRef.current));

  const flushPanOnFrame = () => {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = clampPan(pendingPanRef.current);

      if (next !== panOffsetRef.current) {
        panOffsetRef.current = next;
        setPanOffset(next);
      }
    });
  };

  // učitaj font iz assets foldera
  const font = useFont(require("../../assets/Roboto-Regular.ttf"), 12);

  function percentile(values: number[], ratio: number) {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(ratio * (sorted.length - 1))));
    return sorted[index];
  }

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
    const magnitudes: number[] = [];

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
      magnitudes.push(Math.max(Math.abs(minV), Math.abs(maxV)));
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
    const isFloat32 = codecName.includes("f32");
    const isFloat64 = codecName.includes("f64");
    const isSigned = codecName.includes("_s") || isFloat32 || isFloat64;
    const isBigEndian = codecName.endsWith("be");
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
        const fallbackPath = FileSystem.documentDirectory + "inputBD_degraded.wav";
        const pathInfo = path ? await FileSystem.getInfoAsync(path) : { exists: false };
        const inputPath = pathInfo.exists ? path : fallbackPath;
        //const inputPath = FileSystem.documentDirectory + "inputBD_degraded.wav";//"input.wav";//"choosen";//"inputBD_degraded.wav"
        const pcmPath = FileSystem.documentDirectory + "outputBD_degraded.wav";//"output.pcm";// "outputBD_degraded.wav";

        const infoCommand = `-i ${inputPath} -select_streams a:0 -show_entries stream=channels,sample_rate,duration,codec_name,bits_per_sample -of default=noprint_wrappers=1`;
        const session = await FFprobeKit.execute(infoCommand);
        const infoOutput = await session.getOutput();

        const channelsMatch = infoOutput.match(/channels=(\d+)/);
        const sampleRateMatch = infoOutput.match(/sample_rate=(\d+)/);
        const durationMatch = infoOutput.match(/duration=([\d.]+)/);
        const codecNameMatch = infoOutput.match(/codec_name=(\S+)/);
        const bitsPerSampleMatch = infoOutput.match(/bits_per_sample=(\d+)/);

        const channels = channelsMatch ? parseInt(channelsMatch[1], 10) : 1;
        const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 44100;
        const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;
        const codecName = codecNameMatch ? codecNameMatch[1] : "pcm_s16le";
        const codecShort = codecName.replace("pcm_", "");
        const bitsPerSample = bitsPerSampleMatch ? parseInt(bitsPerSampleMatch[1], 10) : 16;

        const pcmCommand = `-y -i ${inputPath} -f ${codecShort} -acodec ${codecName} ${pcmPath}`;
        // console.log('Ispis komande: ', `-i ${inputPath} -f ${codecShort} -acodec ${codecName} ${pcmPath}`);
        console.log(`${channels} ${sampleRate} ${duration} ${codecName} ${codecShort} ${bitsPerSample}`);
        // console.log(`Is null?! ${channelsMatch}`);

        await FFmpegKit.execute(pcmCommand);

        const pcmData = await FileSystem.readAsStringAsync(pcmPath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const buffer = Buffer.from(pcmData, "base64");
        // samples = binarni sadrzaj audio fajla
        const samples = createNormalizedSamples(buffer, codecName, bitsPerSample);

        setDurationInSeconds(duration);

        const leftChannel: number[] = [];
        const rightChannel: number[] = [];

        for (let i = 0; i < samples.length; i += channels) {
          leftChannel.push(samples[i]);
          if (channels > 1 && i + 1 < samples.length) {
            rightChannel.push(samples[i + 1]);
          }
        }

        const leftPeaks = collectBucketPeaks(leftChannel, plotWidth);
        const rightPeaks = channels === 2 ? collectBucketPeaks(rightChannel, plotWidth) : [];
        const maxPeak = Math.max(0, ...leftPeaks, ...rightPeaks);

        // Fixed full-scale reference keeps axis numerically correct: -1..1 in PCM maps to -1..1 on screen.
        // We still keep measured maxPeak for optional diagnostics/logging.
        const sharedReference = 1;
        console.log(`Waveform peak=${maxPeak.toFixed(4)} ref=${sharedReference.toFixed(4)}`);

        const leftPath = createWaveformEnvelopePath(leftChannel, plotWidth, height, 0, sharedReference, axisGutter);
        setWaveformPath(leftPath);

        leftChannel.length = 0;

        if (channels == 2) {
          const rightPath = createWaveformEnvelopePath(rightChannel, plotWidth, height, bottomChannelOffset, sharedReference, axisGutter);
          setRightWaveformPath(rightPath);

          rightChannel.length = 0;
        }
        console.log('################');
        console.log(`Primljen path parametar: ${path}`);
        console.log(`Koriscen inputPath: ${inputPath}`);
        console.log('################');
      } catch (err) {
        console.error("Greška pri ekstrakciji PCM:", err);
      }
    }

  useEffect(() => {
    extractPCM();
  }, []);

  useEffect(() => {
    maxPanOffsetRef.current = maxPanOffset;
    zoomFactorRef.current = zoomFactor;
    const clamped = Math.max(0, Math.min(panOffsetRef.current, maxPanOffset));
    pendingPanRef.current = clamped;

    if (clamped !== panOffsetRef.current) {
      panOffsetRef.current = clamped;
      setPanOffset(clamped);
    }
  }, [maxPanOffset]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => zoomFactorRef.current > 1,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          zoomFactorRef.current > 1 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          panStartRef.current = panOffsetRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const next = panStartRef.current - gestureState.dx;
          pendingPanRef.current = next;
          flushPanOnFrame();
        },
        onPanResponderRelease: () => {
          flushPanOnFrame();
        },
        onPanResponderTerminate: () => {
          flushPanOnFrame();
        },
      }),
    []
  );

  return (
    <View style={styles.container}>
      {waveformPath && font ? (
        <>
          <Canvas style={{ width: width, height: waveformBottom + 60 }} {...panResponder.panHandlers}>
            {(() => {
              const ampTicks = [1, 0.5, 0, -0.5, -1];
              const axisX = axisGutter;

              const drawChannelAxis = (yOffset: number, keyPrefix: string) => {
                const axisPath = Skia.Path.Make();
                axisPath.moveTo(axisX, yOffset);
                axisPath.lineTo(axisX, yOffset + height);

                return (
                  <React.Fragment key={`${keyPrefix}-axis`}>
                    <Path path={axisPath} color="#374151" style="stroke" strokeWidth={1} />
                    {ampTicks.map((amp) => {
                      const y = yOffset + ((1 - amp) * height) / 2;
                      const tickPath = Skia.Path.Make();
                      tickPath.moveTo(axisX - 5, y);
                      tickPath.lineTo(axisX, y);

                      const label = amp.toFixed(1);
                      const labelWidth = font?.measureText(label).width ?? 0;
                      return (
                        <React.Fragment key={`${keyPrefix}-tick-${amp}`}>
                          <Path path={tickPath} color="#374151" style="stroke" strokeWidth={1} />
                          <SkiaText
                            text={label}
                            x={axisX - 8 - labelWidth}
                            y={y + 4}
                            font={font}
                            color="#111827"
                          />
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              };

              return (
                <>
                  {drawChannelAxis(topChannelOffset, "top")}
                  {rightWaveformPath && drawChannelAxis(bottomChannelOffset, "bottom")}
                </>
              );
            })()}
            <Group clip={plotClipRect}>
              <Path
                path={createCenterLinePath(plotWidth, height, topChannelOffset, axisGutter)}
                color="#9ca3af"
                style="stroke"
                strokeWidth={0.8}
                transform={[{ scaleX: zoomFactor }, { translateX: waveformTranslateX }]}
              />
              {rightWaveformPath && (
                <Path
                  path={createCenterLinePath(plotWidth, height, bottomChannelOffset, axisGutter)}
                  color="#9ca3af"
                  style="stroke"
                  strokeWidth={0.8}
                  transform={[{ scaleX: zoomFactor }, { translateX: waveformTranslateX }]}
                />
              )}
              <Path
                path={waveformPath}
                color="rgba(37, 99, 235, 0.64)"
                style="fill"
                transform={[{ scaleX: zoomFactor }, { translateX: waveformTranslateX }]}
              />
              <Path
                path={waveformPath}
                color="rgba(29, 78, 216, 0.98)"
                style="stroke"
                strokeWidth={0.9}
                transform={[{ scaleX: zoomFactor }, { translateX: waveformTranslateX }]}
              />
              {rightWaveformPath && (
                <>
                  <Path
                    path={rightWaveformPath}
                    color="rgba(239, 68, 68, 0.64)"
                    style="fill"
                    transform={[{ scaleX: zoomFactor }, { translateX: waveformTranslateX }]}
                  />
                  <Path
                    path={rightWaveformPath}
                    color="rgba(220, 38, 38, 0.98)"
                    style="stroke"
                    strokeWidth={0.9}
                    transform={[{ scaleX: zoomFactor }, { translateX: waveformTranslateX }]}
                  />
                </>
              )}
            </Group>

            {/* X osa sa oznakama vremena */}
            {(() => {
              const desiredTickSpacingPx = 50; // razmak u pikselima
              const pixelsPerSecond = plotWidth / durationInSeconds;

              // odredi korak u sekundama tako da bude uredan broj
              // npr. 1s, 2s, 5s, 10s – zavisi od širine i trajanja
              let step = Math.ceil(durationInSeconds / (plotWidth / desiredTickSpacingPx));

              // za zoom možeš smanjiti korak
              if (zoomFactor >= 2) step = Math.max(0.5, step / 2);
              if (zoomFactor >= 4) step = Math.max(0.25, step / 4);

              const axisEndSeconds = Math.ceil(durationInSeconds);
              const ticks = Array.from({ length: Math.floor(axisEndSeconds / step) + 1 });

              return ticks.map((_, s) => {
                const time = s * step;
                const x = axisGutter + time * pixelsPerSecond * zoomFactor - panOffset;

                const tickPath = Skia.Path.Make();
                tickPath.moveTo(x, waveformBottom + 10);
                tickPath.lineTo(x, waveformBottom + 15);

                // zaokruženi brojevi
                const label = time.toFixed(2);

                const textWidth = font?.measureText(label).width ?? 0;
                const textX = Math.max(0, x - textWidth / 2);

                return (
                  <React.Fragment key={`tick-${s}`}>
                    <Path path={tickPath} color="black" style="stroke" strokeWidth={1} />
                    <SkiaText text={label} x={textX} y={waveformBottom + 30} font={font} color="black" />
                  </React.Fragment>
                );
              });
            })()}

          </Canvas>
          {/* Dugmad za zoom */}
          <View style={{ flexDirection: "row", marginTop: 5 }}>
            <Button title="+" onPress={() => setZoomFactor((z) => z * 1.2)} />
            <View style={{ width: 10 }} />
            <Button title="-" onPress={() => setZoomFactor((z) => Math.max(1, z / 1.2))} />
          </View>
        </>
      ) : (
        <View>
          <Text>Učitavam waveform...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
