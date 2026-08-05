import { Skia } from '@shopify/react-native-skia';
import { Buffer } from 'buffer';

export function smoothSeries(values: number[]) {
  if (values.length < 3) return values;
  const out = [...values];
  for (let i = 1; i < values.length - 1; i++) {
    out[i] = values[i - 1] * 0.12 + values[i] * 0.76 + values[i + 1] * 0.12;
  }
  return out;
}

export function createWaveformEnvelopePath(
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

export function createCenterLinePath(width: number, height: number, yOffset: number = 0, xOffset: number = 0) {
  const path = Skia.Path.Make();
  const y = yOffset + height / 2;
  path.moveTo(xOffset, y);
  path.lineTo(xOffset + width, y);
  return path;
}

export function createNormalizedSamples(buffer: Buffer, codecName: string, bitsPerSample: number): number[] {
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