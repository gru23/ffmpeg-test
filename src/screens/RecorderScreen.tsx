import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Audio } from 'expo-av'
import { useAudioRecorder, RecordingConfig, AudioAnalysis } from '@siteed/expo-audio-studio'

const RECORDING_CONFIG: RecordingConfig = {
  sampleRate: 44100,
  channels: 1,
  encoding: 'pcm_16bit',
  interval: 100,
  intervalAnalysis: 100,
  enableProcessing: true, // required to receive analysisData updates
}

const WAVEFORM_HEIGHT = 120
const MAX_BARS = 80
const BAR_WIDTH = 3
const BAR_GAP = 2

interface WaveformProps {
  analysisData?: AudioAnalysis
}

function Waveform({ analysisData }: WaveformProps) {
  const bars = useMemo(() => {
    const points = analysisData?.dataPoints ?? []
    const slice = points.slice(-MAX_BARS)
    const maxAmp = analysisData?.amplitudeRange.max || 1

    return slice.map((pt, i) => {
      const normalised = Math.min(Math.abs(pt.amplitude) / (maxAmp || 1), 1)
      const barH = Math.max(2, normalised * WAVEFORM_HEIGHT * 0.9)
      return { key: pt.id ?? i, height: barH, silent: pt.silent }
    })
  }, [analysisData])

  return (
    <View style={waveStyles.container}>
      {/* centre line */}
      <View style={waveStyles.centreLine} />

      <View style={waveStyles.barsRow}>
        {bars.map((bar) => (
          <View
            key={bar.key}
            style={[
              waveStyles.bar,
              { height: bar.height },
              bar.silent && waveStyles.barSilent,
            ]}
          />
        ))}
        {/* placeholder bars so the container is never empty */}
        {bars.length === 0 &&
          Array.from({ length: MAX_BARS }).map((_, i) => (
            <View key={i} style={[waveStyles.bar, { height: 2 }, waveStyles.barSilent]} />
          ))}
      </View>
    </View>
  )
}

export default function RecorderScreen() {
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    durationMs,
    analysisData,
  } = useAudioRecorder()

  const [recordingUri, setRecordingUri] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [finalDuration, setFinalDuration] = useState<number>(0)

  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ granted }) => {
      setHasPermission(granted)
      if (!granted) {
        Alert.alert('Permission required', 'Microphone access is needed to record audio.')
      }
    })
  }, [])

  const formatDuration = (ms: number) => {
    if (!ms || isNaN(ms)) return '00:00'
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60).toString().padStart(2, '0')
    const sec = (totalSec % 60).toString().padStart(2, '0')
    return `${min}:${sec}`
  }

  // While recording show live duration; after stop show the final captured duration
  const displayDuration = isRecording || isPaused ? durationMs : finalDuration

  const handleStart = useCallback(async () => {
    if (!hasPermission) {
      const { granted } = await Audio.requestPermissionsAsync()
      setHasPermission(granted)
      if (!granted) {
        Alert.alert('Permission required', 'Microphone access is needed to record audio.')
        return
      }
    }
    setRecordingUri(null)
    setFinalDuration(0)
    // Build a timestamp-based filename — change this to any string you like
    const filename = `rec_${Date.now()}`
    await startRecording({ ...RECORDING_CONFIG, filename })
  }, [startRecording, hasPermission])

  const handlePauseResume = useCallback(async () => {
    if (isPaused) {
      await resumeRecording()
    } else {
      await pauseRecording()
    }
  }, [isPaused, pauseRecording, resumeRecording])

  const handleStop = useCallback(async () => {
    const result = await stopRecording()
    if (result?.durationMs) setFinalDuration(result.durationMs)
    if (result?.fileUri) setRecordingUri(result.fileUri)
  }, [stopRecording])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Recorder</Text>

        {/* Timer */}
        <Text style={styles.timer}>{formatDuration(displayDuration)}</Text>

        {/* Real-time waveform */}
        <Waveform analysisData={analysisData} />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {!isRecording ? (
            <TouchableOpacity style={[styles.btn, styles.btnRecord]} onPress={handleStart}>
              <Text style={styles.btnText}>● REC</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, isPaused ? styles.btnResume : styles.btnPause]}
              onPress={handlePauseResume}
            >
              <Text style={styles.btnText}>{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btn, styles.btnStop, !isRecording && styles.btnDisabled]}
            onPress={handleStop}
            disabled={!isRecording}
          >
            <Text style={styles.btnText}>■ Stop</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <Text style={styles.status}>
          {isRecording ? (isPaused ? 'Paused' : 'Recording…') : 'Idle'}
        </Text>

        {/* Saved file */}
        {recordingUri ? (
          <Text style={styles.savedUri} numberOfLines={3}>
            Saved: {recordingUri}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const waveStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: WAVEFORM_HEIGHT,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
    justifyContent: 'center',
  },
  centreLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WAVEFORM_HEIGHT / 2,
    height: 1,
    backgroundColor: '#333',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: '#7c4dff',
    borderRadius: 2,
  },
  barSilent: {
    backgroundColor: '#444',
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scroll: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  timer: {
    fontSize: 48,
    fontWeight: '300',
    color: '#e0e0e0',
    letterSpacing: 4,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 50,
    minWidth: 120,
    alignItems: 'center',
  },
  btnRecord: {
    backgroundColor: '#e53935',
  },
  btnPause: {
    backgroundColor: '#fb8c00',
  },
  btnResume: {
    backgroundColor: '#43a047',
  },
  btnStop: {
    backgroundColor: '#546e7a',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: '#9e9e9e',
    fontSize: 14,
    marginBottom: 12,
  },
  savedUri: {
    color: '#90caf9',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
})