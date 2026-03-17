import { StyleSheet, View } from 'react-native'
import React, { useState } from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Card from './Card';

export default function InitialScreen() {
  const [expandedCard, setExpandedCard] = useState<"EDITOR" | "SEPARATION" | null>(null);

  return (
    <View style={styles.container}>
      <Card
        color="#4f90ff"
        title="EDITOR"
        description="Trim, volume, EQ, delay..."
        icon={<MaterialCommunityIcons name="waveform" style={styles.optionTitleIcon} />}
        expanded={expandedCard === 'EDITOR'}
        onPress={() => setExpandedCard(expandedCard === 'EDITOR' ? null : 'EDITOR')}
      />

      <Card
        color="#FF903C"
        title="SOURCE SEPARATION"
        description="Separate song into vocals, drums, bass and other"
        icon={<MaterialIcons name="call-split" style={styles.optionTitleIcon} />}
        expanded={expandedCard === 'SEPARATION'}
        onPress={() => setExpandedCard(expandedCard === 'SEPARATION' ? null : 'SEPARATION')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
    backgroundColor: '#f5f5f5',
  },
  optionTitleIcon: {
    fontSize: 34,
    color: 'white',
  },
});
