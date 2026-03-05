declare module '@simform_solutions/react-native-audio-waveform' {
  import React from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export type PlaybackSpeedType = 1.0 | 1.5 | 2.0;

  export interface IWaveformRef {
    startPlayer: (args?: { finishMode?: string }) => Promise<boolean>;
    stopPlayer: () => Promise<boolean>;
    pausePlayer: () => Promise<boolean>;
    resumePlayer: (args?: { finishMode?: string }) => Promise<boolean>;
    startRecord: (args?: any) => Promise<boolean>;
    stopRecord: () => Promise<string>;
    pauseRecord: () => Promise<boolean>;
    resumeRecord: () => Promise<boolean>;
    currentState: string;
    playerKey: string;
  }

  export interface WaveformProps {
    mode: 'static' | 'live';
    path?: string;
    candleSpace?: number;
    candleWidth?: number;
    containerStyle?: StyleProp<ViewStyle>;
    waveColor?: string;
    scrubColor?: string;
    candleHeightScale?: number;
    volume?: number;
    onPlayerStateChange?: (playerState: string) => void;
    onPanStateChange?: (panMoving: boolean) => void;
    onError?: (error: Error) => void;
    onCurrentProgressChange?: (currentProgress: number, songDuration: number) => void;
    onChangeWaveformLoadState?: (state: boolean) => void;
    playbackSpeed?: PlaybackSpeedType;
  }

  export const Waveform: React.ForwardRefExoticComponent<WaveformProps & React.RefAttributes<IWaveformRef>>;
}
