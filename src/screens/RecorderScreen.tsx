import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Audio } from 'expo-av'
import { useAudioRecorder, RecordingConfig, AudioAnalysis } from '@siteed/expo-audio-studio'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { RootStackParamList } from '../../App'
import { submitSeparationRequest } from '../utils/pickDocument'
import { useSeparationWatcherController } from '../utils/SeparationWatcherProvider'
import { SeparationOption } from '../models/separations-jobs/SeparationOption'

type PendingUpload = {
  uri: string
  mimeType: string
  defaultName: string
}

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
  const route = useRoute<RouteProp<RootStackParamList, 'Recorder'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { setWatchJobId } = useSeparationWatcherController()

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
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)
  const [recordingName, setRecordingName] = useState<string>('')
  const [nameModalVisible, setNameModalVisible] = useState<boolean>(false)

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
    setPendingUpload(null)
    setRecordingName('')
    setNameModalVisible(false)
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

    if (result?.fileUri && route.params?.nextScreen === 'separation') {
      const defaultName = result.filename || `rec_${Date.now()}.wav`
      setPendingUpload({
        uri: result.fileUri,
        mimeType: result.mimeType,
        defaultName,
      })
      setRecordingName(defaultName)
      setNameModalVisible(true)
    }
  }, [route.params?.nextScreen, stopRecording])

  const handleConfirmUpload = useCallback(async () => {
    if (!pendingUpload) {
      return
    }

    const uploadResult = await submitSeparationRequest(
      {
        uri: pendingUpload.uri,
        name: recordingName.trim() || pendingUpload.defaultName,
        mimeType: pendingUpload.mimeType,
      },
      route.params?.separationType ?? SeparationOption.FOUR_STEMS
    )

    if (uploadResult) {
      setWatchJobId(uploadResult.jobId)
      setNameModalVisible(false)
      setPendingUpload(null)
      navigation.navigate('Initial')
    }
  }, [navigation, pendingUpload, recordingName, route.params?.separationType, setWatchJobId])

  const handleCancelUpload = useCallback(() => {
    setNameModalVisible(false)
  }, [])

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

      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelUpload}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Name the recording</Text>
            <Text style={styles.modalDescription}>
              Default name is prefilled. You can keep it or type your own before sending to source separation.
            </Text>
            <TextInput
              value={recordingName}
              onChangeText={setRecordingName}
              placeholder="rec_123456"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={handleCancelUpload}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSaveButton]} onPress={handleConfirmUpload}>
                <Text style={styles.modalSaveText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    color: '#bdbdbd',
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#3c3c3c',
    backgroundColor: '#121212',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  modalButton: {
    minWidth: 96,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#2f2f2f',
  },
  modalSaveButton: {
    backgroundColor: '#1db954',
  },
  modalCancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalSaveText: {
    color: '#08130c',
    fontWeight: '700',
  },
})