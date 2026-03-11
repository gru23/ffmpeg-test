import { Canvas, Path, Skia, Text as SkiaText, useFont } from "@shopify/react-native-skia";
import { StyleSheet, View, Text, Button } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit, FFprobeKit } from "ffmpeg-kit-react-native";
import { Buffer } from "buffer";
import { Dimensions } from "react-native";

export default function SkiaVisualScreen() {
  const refWaveScaleY = useRef(1.5);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const [waveformPath, setWaveformPath] = useState<any>(null);
  const [rightWaveformPath, setRightWaveformPath] = useState<any>(null);
  const [durationInSeconds, setDurationInSeconds] = useState<number>(0);

  const [zoomFactor, setZoomFactor] = useState(1);
  

  const width = screenWidth - 40;//350;
  const height = screenHeight / 6;//150;

  // učitaj font iz assets foldera
  const font = useFont(require("../../assets/Roboto-Regular.ttf"), 12);

  function createWaveformPath(amplitudes: number[], width: number, height: number, yOffset: number = 0) {
    const path = Skia.Path.Make();
    const step = width / amplitudes.length;

    amplitudes.forEach((amp, i) => {
      const x = i * step;
      const y = height / 2 - amp * (height / 2) + yOffset;
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    });
    return path;
  }

  function createSampleArray(buffer: Buffer, codecName: string, bitsPerSample: number) {
    let TypedArrayCtor: any;
    let pcmRange: number;

    if (codecName.includes("f32")) {
      // 32-bit float PCM
      TypedArrayCtor = Float32Array;
      pcmRange = 1; // već je u rasponu -1..+1
    } else if (codecName.includes("f64")) {
      // 64-bit float PCM
      TypedArrayCtor = Float64Array;
      pcmRange = 1;
    } else if (bitsPerSample === 16) {
      TypedArrayCtor = Int16Array;
      pcmRange = Math.pow(2, 15); // 32768
    } else if (bitsPerSample === 24 || bitsPerSample === 32) {
      TypedArrayCtor = Int32Array;
      pcmRange = Math.pow(2, bitsPerSample - 1);
    } else if (bitsPerSample === 8) {
      TypedArrayCtor = Int8Array;
      pcmRange = Math.pow(2, 7); // 128
    } else {
      // fallback
      TypedArrayCtor = Int16Array;
      pcmRange = Math.pow(2, 15);
    }

    const samples = new TypedArrayCtor(buffer.buffer, buffer.byteOffset, buffer.length / TypedArrayCtor.BYTES_PER_ELEMENT);
    return { samples, pcmRange };
  }

  async function extractPCM() {
      try {
        const inputPath = FileSystem.documentDirectory + "inputBD_degraded.wav"// "input.wav";
        const pcmPath = FileSystem.documentDirectory + "outputBD_degraded.wav"; // "output.pcm";

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
        const { samples, pcmRange } = createSampleArray(buffer, codecName, bitsPerSample);

        setDurationInSeconds(duration);

        const leftChannel: number[] = [];
        const rightChannel: number[] = [];

        for (let i = 0; i < samples.length; i += channels) {
          leftChannel.push(samples[i] / pcmRange);
          if (channels > 1 && i + 1 < samples.length) {
            rightChannel.push(samples[i + 1] / pcmRange);
          }
        }

        const leftDown = leftChannel.filter((_, i) => i % 5 === 0);
        const rightDown = rightChannel.filter((_, i) => i % 100 === 0);

        const leftPath = createWaveformPath(leftDown, width, height, 0);
        setWaveformPath(leftPath);

        leftChannel.length = 0;
        leftDown.length = 0;

        if (channels == 2) {
          const rightPath = createWaveformPath(rightDown, width, height, height);
          setRightWaveformPath(rightPath);

          rightChannel.length = 0;
          rightDown.length = 0;
        }
      } catch (err) {
        console.error("Greška pri ekstrakciji PCM:", err);
      }
    }

  useEffect(() => {
    extractPCM();
  }, []);

  return (
    <View style={styles.container}>
      {waveformPath && font ? (
        <>
          <Canvas style={{ width: width, height: height * 3 + 60 }}>
            <Path
              path={waveformPath}
              color="blue"
              style="stroke"
              strokeWidth={0.1}
              transform={[{ scaleX: zoomFactor }, { scaleY: refWaveScaleY.current }]}
            />
            {rightWaveformPath && (
              <Path
                path={rightWaveformPath}
                color="red"
                style="stroke"
                strokeWidth={0.1}
                transform={[{ scaleX: zoomFactor }, { scaleY: refWaveScaleY.current }]}
              />
            )}

            {/* X osa sa oznakama vremena */}
            {(() => {
              const desiredTickSpacingPx = 50; // razmak u pikselima
              const pixelsPerSecond = width / durationInSeconds;

              // odredi korak u sekundama tako da bude uredan broj
              // npr. 1s, 2s, 5s, 10s – zavisi od širine i trajanja
              let step = Math.ceil(durationInSeconds / (width / desiredTickSpacingPx));

              // za zoom možeš smanjiti korak
              if (zoomFactor >= 2) step = Math.max(0.5, step / 2);
              if (zoomFactor >= 4) step = Math.max(0.25, step / 4);

              const axisEndSeconds = Math.ceil(durationInSeconds);
              const ticks = Array.from({ length: Math.floor(axisEndSeconds / step) + 1 });

              return ticks.map((_, s) => {
                const time = s * step;
                const x = time * pixelsPerSecond * zoomFactor;

                const tickPath = Skia.Path.Make();
                tickPath.moveTo(x, height * 3 + 10);
                tickPath.lineTo(x, height * 3 + 15);

                // zaokruženi brojevi
                const label = time.toFixed(2);

                const textWidth = font?.measureText(label).width ?? 0;
                const textX = Math.max(0, x - textWidth / 2);

                return (
                  <React.Fragment key={`tick-${s}`}>
                    <Path path={tickPath} color="black" style="stroke" strokeWidth={1} />
                    <SkiaText text={label} x={textX} y={height * 3 + 30} font={font} color="black" />
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
