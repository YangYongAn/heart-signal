import { AUDIO_CONFIG } from '../constants';

/**
 * 音频分析器
 */
export class AudioAnalyzer {
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private freqArray?: Uint8Array;
  private waveArray?: Uint8Array;
  private source?: MediaElementAudioSourceNode;
  private audio?: HTMLAudioElement;
  private onEnded?: () => void;

  async init(audioUrl: string, onEnded?: () => void) {
    try {
      this.onEnded = onEnded;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = AUDIO_CONFIG.FFT_SIZE;
      this.analyser.smoothingTimeConstant = AUDIO_CONFIG.SMOOTHING;

      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveArray = new Uint8Array(this.analyser.fftSize);

      this.audio = new Audio(audioUrl);
      this.audio.crossOrigin = 'anonymous';
      this.audio.loop = false;

      this.audio.addEventListener('ended', () => {
        if (this.onEnded) {
          this.onEnded();
        }
      });

      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      await this.audio.play();
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
    }
  }

  /**
   * 获取时域波形数据（归一化到 -1 ~ 1）
   */
  getWaveformData(): number[] {
    if (!this.analyser || !this.waveArray) return [];
    // @ts-expect-error - Uint8Array 类型兼容性问题
    this.analyser.getByteTimeDomainData(this.waveArray);
    const result: number[] = [];
    for (let i = 0; i < this.waveArray.length; i++) {
      result.push((this.waveArray[i] / 128) - 1);
    }
    return result;
  }

  /**
   * 获取低/中/高频段能量
   */
  getBandEnergy(): { bass: number; mid: number; treble: number } {
    if (!this.analyser || !this.freqArray) return { bass: 0, mid: 0, treble: 0 };
    // @ts-expect-error - Uint8Array 类型兼容性问题
    this.analyser.getByteFrequencyData(this.freqArray);

    const len = this.freqArray.length;
    const third = Math.floor(len / 3);
    let bass = 0, mid = 0, treble = 0;

    for (let i = 0; i < third; i++) bass += this.freqArray[i];
    for (let i = third; i < third * 2; i++) mid += this.freqArray[i];
    for (let i = third * 2; i < len; i++) treble += this.freqArray[i];

    return {
      bass: bass / (third * 255),
      mid: mid / (third * 255),
      treble: treble / (third * 255)
    };
  }

  getAverageVolume(): number {
    if (!this.analyser || !this.freqArray) return 0;
    // @ts-expect-error - Uint8Array 类型兼容性问题
    this.analyser.getByteFrequencyData(this.freqArray);
    let sum = 0;
    for (let i = 0; i < this.freqArray.length; i++) {
      sum += this.freqArray[i];
    }
    return (sum / this.freqArray.length) / 255;
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }
}
