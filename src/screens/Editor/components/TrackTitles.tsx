import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AXIS_GUTTER, TIME_AXIS_AREA, TrackLayout } from '../types';

type Props = {
  trackLayouts: TrackLayout[];
  canvasHeight: number;
};

// Diskretni naslovi pesama - obične RN Text komponente, van horizontalnog
// ScrollView-a, pa ostaju vidljivi bez obzira na scroll poziciju signala.
export default function TrackTitles({ trackLayouts, canvasHeight }: Props) {
  return (
    <View pointerEvents="none" style={[styles.overlay, { left: AXIS_GUTTER, height: canvasHeight }]}>
      {trackLayouts.map((tl) => (
        <Text key={`${tl.id}-title`} style={[styles.title, { top: TIME_AXIS_AREA + tl.titleY }]} numberOfLines={1}>
          {tl.title}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0 },
  title: { position: 'absolute', left: 4, fontSize: 11, fontWeight: '500', color: '#8a94a6' },
});