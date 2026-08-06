import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AXIS_GUTTER, TrackLayout } from '../types';

type Props = {
  trackLayouts: TrackLayout[];
  canvasHeight: number;
  isPlaying: (id: string) => boolean;
  onTogglePlay: (id: string) => void;
};

// Diskretni naslovi pesama - obične RN Text komponente, van horizontalnog
// ScrollView-a, pa ostaju vidljivi bez obzira na scroll poziciju signala.
export default function TrackTitles({ trackLayouts, canvasHeight, isPlaying, onTogglePlay }: Props) {
  return (
    <View pointerEvents="box-none" style={[styles.overlay, { left: AXIS_GUTTER, height: canvasHeight }]}>
      {trackLayouts.map((tl) => (
        <View key={`${tl.id}-header`} style={[styles.headerRow, { top: tl.titleY }]}>
          <TouchableOpacity
            onPress={() => onTogglePlay(tl.id)}
            style={styles.playButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.playIcon}>{isPlaying(tl.id) ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {tl.title}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0 },
  headerRow: { position: 'absolute', left: 4, flexDirection: 'row', alignItems: 'center' },
  playButton: { paddingHorizontal: 4, paddingVertical: 2 },
  playIcon: { fontSize: 11, color: '#1561bd' },
  title: { fontSize: 11, fontWeight: '500', color: '#8a94a6', marginLeft: 4 },
});