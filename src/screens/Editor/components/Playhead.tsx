import React from 'react';
import { Path, Skia } from '@shopify/react-native-skia';

type Props = {
  positionSeconds: number;
  maxDurationSeconds: number;
  plotWidth: number;
  canvasHeight: number;
};

// Vertikalna linija koja pokazuje trenutnu poziciju reprodukcije. Crta se
// unutar SKROLUJUĆEG Canvas-a (ne fiksnog), jer njena x-pozicija mora da
// odgovara istoj vremenskoj razmeri kao i TimeAxis/Track komponente.
export default function Playhead({ positionSeconds, maxDurationSeconds, plotWidth, canvasHeight }: Props) {
  if (!(maxDurationSeconds > 0)) return null;

  const pixelsPerSecond = plotWidth / maxDurationSeconds;
  const x = Math.min(plotWidth, Math.max(0, positionSeconds * pixelsPerSecond));

  const path = Skia.Path.Make();
  path.moveTo(x, 0);
  path.lineTo(x, canvasHeight);

  return <Path path={path} color="#ef4444" style="stroke" strokeWidth={1.5} />;
}