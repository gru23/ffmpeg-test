import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React, { ReactNode } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type CardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  expanded: boolean;
  onPress: () => void;
};

export default function Card({ 
  title, 
  description, 
  icon, 
  color, 
  expanded, 
  onPress,
}: CardProps) {
  return (
    <TouchableOpacity 
      style={[styles.optionBox, { backgroundColor: color }]}
      onPress={onPress}
    >
      <View style={styles.optionInnerBox}>
        <View style={styles.optionTitleContainer}>
          {icon}
          <Text style={styles.optionTitle}>{title}</Text>
        </View>
        <Text style={styles.optionText}>{description}</Text>

        {expanded && (
          <View style={styles.extraOptions}>
            <TouchableOpacity style={styles.extraButton}>
              <MaterialIcons name="drive-folder-upload" style={styles.extraButtonIcon} />
              <Text style={styles.extraText}>Browse file</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.extraButton}>
              <MaterialIcons name="mic" style={styles.extraButtonIcon} />
              <Text style={styles.extraText}>Record audio</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  optionBox: {
    height: '25%',
    width: '95%',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 20,
    elevation: 6,
  },
  optionInnerBox: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  optionTitleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  optionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 22,
  },
  extraOptions: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  extraButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
  },
  extraButtonIcon: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.65)',
  },
  extraText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 6,
  },
});
