import * as FileSystem from 'expo-file-system/legacy';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';

export type EchoParams = {
  delayMs: number; // 50-1000
  decay: number; // 0.1-0.9
};

// Primenjuje echo/delay efekat SAMO na segment [startSeconds, endSeconds] zapisa,
// dok ostatak (pre i posle selekcije) ostaje nepromenjen. Sve se odrađuje u JEDNOM
// ffmpeg pozivu preko filter_complex grafa: isečemo do 3 segmenta (pre/selekcija/posle),
// primenimo aecho SAMO na srednji, pa ih ponovo spojimo (concat) u jedan fajl.
export async function applyEchoToSelection(
  sourcePath: string,
  startSeconds: number,
  endSeconds: number,
  totalDuration: number,
  params: EchoParams
): Promise<string> {
  const outputPath = FileSystem.documentDirectory + `edited_${Date.now()}.wav`;
  const ffmpegInputPath = sourcePath.replace('file://', '');
  const ffmpegOutputPath = outputPath.replace('file://', '');

  // Segmenti pre/posle selekcije se izostavljaju ako je selekcija na samom
  // početku/kraju zapisa (izbegava se nulti/negativan atrim opseg).
  const hasPre = startSeconds > 0.01;
  const hasPost = endSeconds < totalDuration - 0.01;

  const filterParts: string[] = [];
  const segments: string[] = [];

  if (hasPre) {
    filterParts.push(`[0:a]atrim=0:${startSeconds.toFixed(3)},asetpts=PTS-STARTPTS[a0]`);
    segments.push('[a0]');
  }

  // in_gain:out_gain su fiksni (0.8:0.9) - standardne, "sigurne" vrednosti za
  // aecho koje ne izazivaju klipovanje; delay i decay dolaze od korisnika.
  filterParts.push(
    `[0:a]atrim=${startSeconds.toFixed(3)}:${endSeconds.toFixed(3)},asetpts=PTS-STARTPTS,` +
      `aecho=0.8:0.9:${Math.round(params.delayMs)}:${params.decay.toFixed(2)}[a1]`
  );
  segments.push('[a1]');

  if (hasPost) {
    filterParts.push(`[0:a]atrim=${endSeconds.toFixed(3)},asetpts=PTS-STARTPTS[a2]`);
    segments.push('[a2]');
  }

  filterParts.push(`${segments.join('')}concat=n=${segments.length}:v=0:a=1[aout]`);
  const filterComplex = filterParts.join(';');

  const command =
    `-y -i "${ffmpegInputPath}" -filter_complex "${filterComplex}" ` +
    `-map "[aout]" -ar 44100 "${ffmpegOutputPath}"`;

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (!ReturnCode.isSuccess(returnCode)) {
    const logs = await session.getAllLogsAsString();
    console.error('FFmpeg efekat nije uspeo:', logs);
    throw new Error('Primena efekta nije uspela.');
  }

  return outputPath;
}


// Utišava (postavlja na nulu) segment [startSeconds, endSeconds], dok ostatak
// zapisa ostaje nepromenjen. Za razliku od echo efekta, ovde nije potrebno
// sečenje na segmente - "volume" filter sa "enable" izrazom sam prepoznaje
// vremenski opseg unutar jednog neisečenog audio toka.
export async function applySilenceToSelection(
  sourcePath: string,
  startSeconds: number,
  endSeconds: number
): Promise<string> {
  const outputPath = FileSystem.documentDirectory + `edited_${Date.now()}.wav`;
  const ffmpegInputPath = sourcePath.replace('file://', '');
  const ffmpegOutputPath = outputPath.replace('file://', '');

  const filter = `volume=enable='between(t,${startSeconds.toFixed(3)},${endSeconds.toFixed(3)})':volume=0`;
  const command = `-y -i "${ffmpegInputPath}" -af "${filter}" -ar 44100 "${ffmpegOutputPath}"`;

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (!ReturnCode.isSuccess(returnCode)) {
    const logs = await session.getAllLogsAsString();
    console.error('FFmpeg silence efekat nije uspeo:', logs);
    throw new Error('Primena silence efekta nije uspela.');
  }

  return outputPath;
}