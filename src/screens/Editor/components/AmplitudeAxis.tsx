import React from 'react';
import { Path, Text as SkiaText, Skia, SkFont } from '@shopify/react-native-skia';
import { AXIS_GUTTER, TrackLayout } from '../types';

type Props = {
  trackLayouts: TrackLayout[];
  channelHeight: number;
  font: SkFont | null;
};

const AMP_TICKS = [1, 0.5, 0, -0.5, -1];

// Fiksna amplitudna osa (leva strana) za SVE kanale svih trackova - renderuje
// se u posebnom Canvas-u van horizontalnog ScrollView-a, pa ostaje nepomična
// pri horizontalnom skrolovanju signala.
export default function AmplitudeAxis({ trackLayouts, channelHeight, font }: Props) {
  return (
    <>
      {trackLayouts.map((tl) =>
        tl.channels.map((row) => {
          const yOffset = row.yTop;
          const axisPath = Skia.Path.Make();
          axisPath.moveTo(AXIS_GUTTER, yOffset);
          axisPath.lineTo(AXIS_GUTTER, yOffset + channelHeight);

          return (
            <React.Fragment key={`${row.key}-axis`}>
              <Path path={axisPath} color="#9ca3af" style="stroke" strokeWidth={1} />
              {AMP_TICKS.map((amp) => {
                const y = yOffset + ((1 - amp) * channelHeight) / 2;
                const tickPath = Skia.Path.Make();
                tickPath.moveTo(AXIS_GUTTER - 5, y);
                tickPath.lineTo(AXIS_GUTTER, y);

                const label = amp.toFixed(1);
                const labelWidth = font?.measureText(label).width ?? 0;

                return (
                  <React.Fragment key={`${row.key}-tick-${amp}`}>
                    <Path path={tickPath} color="#9ca3af" style="stroke" strokeWidth={1} />
                    {font && (
                      <SkiaText text={label} x={AXIS_GUTTER - 8 - labelWidth} y={y + 4} font={font} color="#111827" />
                    )}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })
      )}
    </>
  );
}