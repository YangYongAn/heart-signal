/**
 * 心电图模式
 */
export enum ECGMode {
  NORMAL = 'normal',      // 正常模式
  EXCITED = 'excited',    // 激动模式（警报）
  DEATH = 'death',        // 死亡模式
  MUSIC = 'music'         // 音乐模式
}

/**
 * 歌词字符数据 - 每个字都有精确时间轴
 */
export interface LyricChar {
  char: string;
  startTime: number; // 开始时间（秒）
  duration: number;  // 持续时间（秒）
}

/**
 * 歌词句子 - 每行是一个句子
 */
export interface LyricSentence {
  chars: LyricChar[];
  startTime: number; // 句子开始时间
  endTime: number;   // 句子结束时间
}

/**
 * 模式配置
 */
export interface ModeConfig {
  color: string;
  shadowColor: string;
  lineWidth: number;
  name: string;
  background: string;
  opacity?: number; // 波形透明度 (0-1)
}

/**
 * 波形参数（用于模式间平滑过渡）
 */
export interface WaveParams {
  /** 每 tick 的相位增量，控制心率 */
  phaseStep: number;
  /** 整体振幅 (0~1)，死亡模式渐降 */
  amplitude: number;
  /** 目标振幅 */
  targetAmplitude: number;
  /** 噪声强度 */
  noise: number;
  /** QRS 尖峰高度倍率 */
  qrsGain: number;
  /** 是否添加额外的谐波丰富度 */
  harmonics: boolean;
}
