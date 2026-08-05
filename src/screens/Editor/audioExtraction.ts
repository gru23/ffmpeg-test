import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit, FFprobeKit } from 'ffmpeg-kit-react-native';
import { Buffer } from 'buffer';
import { createNormalizedSamples } from './audioMath';
import { WAVEFORM_SAMPLE_RATE } from './types';

export type ExtractedTrack = {
  id: string;
  title: string;
  duration: number;
  leftChannel: number[];
  rightChannel: number[] | null;
};

// displayName: ORIGINALNO ime fajla. Bitno za fajlove dodate preko document
// pickera - picker kopira fajl u cache pod generisanim imenom (npr. UUID.mp3),
// pa se pravo ime gubi ako se izvlači iz same putanje (filePath).
export async function extractTrackData(filePath: string, displayName?: string): Promise<ExtractedTrack> {
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

  const rawName = displayName ?? filePath.split('/').pop() ?? 'Audio';
  const title = rawName.replace(/\.[^/.]+$/, '');

  return {
    id: `track-${Date.now()}`,
    title,
    duration,
    leftChannel,
    rightChannel: rightChannel.length > 0 ? rightChannel : null,
  };
}