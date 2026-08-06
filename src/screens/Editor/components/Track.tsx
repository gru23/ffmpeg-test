import React from 'react';
import { Group, Path, Skia } from '@shopify/react-native-skia';
import { TrackLayout } from '../types';
import { createCenterLinePath } from '../audioMath';

type Props = {
  layout: TrackLayout;
  plotWidth: number;
  channelHeight: number;
  isLast: boolean;
};

// Jedan track: 1 ili 2 kanala (mono/stereo) + linija razdvajanja ispod, ako
// track nije poslednji u nizu. Renderuje se unutar scrolujućeg Canvas-a.
export default function Track({ layout, plotWidth, channelHeight, isLast }: Props) {
  return (
    <>
      {layout.channels.map((row) => {
        const yOffset = row.yTop;
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
      })}

      {!isLast && layout.separatorY !== null && (
        <Path
          path={(() => {
            const p = Skia.Path.Make();
            const y = layout.separatorY!;
            p.moveTo(0, y);
            p.lineTo(plotWidth, y);
            return p;
          })()}
          color="#c7cfdb"
          style="stroke"
          strokeWidth={1}
        />
      )}
    </>
  );
}