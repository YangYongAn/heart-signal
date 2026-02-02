import type { WaveParams, ModeConfig } from '../types';
import { ECGMode } from '../types';

/**
 * 模式配置
 */
export const MODE_CONFIGS: Record<ECGMode, ModeConfig> = {
  [ECGMode.NORMAL]: {
    color: '#2ed573',
    shadowColor: '#2ed573',
    lineWidth: 3,
    name: '💓',
    background: '#111'
  },
  [ECGMode.EXCITED]: {
    color: '#ff6b6b',
    shadowColor: '#ff0000',
    lineWidth: 4,
    name: '⚡',
    background: '#1a0000'
  },
  [ECGMode.DEATH]: {
    color: '#999',
    shadowColor: '#222',
    lineWidth: 4,
    name: '💀',
    background: '#000'
  },
  [ECGMode.MUSIC]: {
    color: '#ffffff',
    shadowColor: '#ffffff',
    lineWidth: 3,
    name: '🎵',
    background: '#0a0a0a',
    opacity: 0.3
  }
};

/**
 * 波形参数预设
 */
export const WAVE_PRESETS: Record<string, Omit<WaveParams, 'amplitude'>> = {
  normal: {
    phaseStep: 0.067,
    targetAmplitude: 1.0,
    noise: 0.03,
    qrsGain: 0.8,
    harmonics: false
  },
  excited: {
    phaseStep: 0.12,
    targetAmplitude: 1.0,
    noise: 0.25,
    qrsGain: 1.1,
    harmonics: true
  },
  death: {
    phaseStep: 0.04,
    targetAmplitude: 0,
    noise: 0,
    qrsGain: 1.0,
    harmonics: false
  }
};

/**
 * Canvas 渲染参数
 */
export const CANVAS_CONFIG = {
  GRID_SPACING: 10,
  GRID_COLOR: 'rgba(100, 200, 100, 0.1)',
  BPM_UPDATE_INTERVAL: 100,
  ECG_LOOP_INTERVAL: 30,
  MUSIC_LOOP_INTERVAL: 30,
};

/**
 * 音频分析参数
 */
export const AUDIO_CONFIG = {
  FFT_SIZE: 2048,
  SMOOTHING: 0.8,
};

/**
 * 歌词加载文件路径
 */
export const LYRICS_FILE_PATH = '/music_lyric.txt';

/**
 * 最大 ECG 数据点数
 */
export const MAX_ECG_POINTS = 200;

/**
 * 模式对应的 QQ emoji 图片 URL
 */
export const MODE_EMOJI_URLS: Record<ECGMode, string> = {
  [ECGMode.NORMAL]: 'https://koishi.js.org/QFace/assets/qq_emoji/8/apng/8.png',
  [ECGMode.EXCITED]: 'https://koishi.js.org/QFace/assets/qq_emoji/312/apng/312.png',
  [ECGMode.DEATH]: 'https://koishi.js.org/QFace/assets/qq_emoji/284/apng/284.png',
  [ECGMode.MUSIC]: 'https://koishi.js.org/QFace/assets/qq_emoji/332/apng/332.png'
};
