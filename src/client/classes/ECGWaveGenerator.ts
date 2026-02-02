import type { ECGMode, WaveParams } from '../types';
import { WAVE_PRESETS } from '../constants';

/**
 * 统一的 ECG 波形生成器
 * 正常/激动/死亡三种模式共用一条时间线
 */
export class ECGWaveGenerator {
  private phase = 0;
  private params: WaveParams = {
    phaseStep: 0.067,
    amplitude: 1.0,
    targetAmplitude: 1.0,
    noise: 0,
    qrsGain: 1.0,
    harmonics: false
  };
  private beeped = false;
  private lastBeatTime = 0;

  /**
   * 切换模式参数（波形连续不中断）
   */
  setMode(mode: ECGMode) {
    if (mode === 'music') return;

    const preset = WAVE_PRESETS[mode];
    this.params.phaseStep = preset.phaseStep;
    this.params.targetAmplitude = preset.targetAmplitude;
    this.params.noise = preset.noise;
    this.params.qrsGain = preset.qrsGain;
    this.params.harmonics = preset.harmonics;
  }

  /**
   * 生成下一个数据点，返回 { value, beat } beat=true 表示刚好在 QRS 峰
   */
  tick(): { value: number; beat: boolean } {
    const ampDiff = this.params.targetAmplitude - this.params.amplitude;
    this.params.amplitude += ampDiff * 0.02;
    if (this.params.amplitude < 0.01 && this.params.targetAmplitude === 0) {
      this.params.amplitude = 0;
    }

    this.phase += this.params.phaseStep;
    const cyclePos = this.phase % (Math.PI * 2);
    const amp = this.params.amplitude;
    let beat = false;

    let value = 0;

    // ---- 基础 PQRST 波形 ----
    // P 波 (0 ~ 0.3)
    if (cyclePos < 0.3) {
      value = Math.sin(cyclePos * 10.5) * 0.15;
      this.beeped = false;
    }
    // QRS 波群 (0.3 ~ 0.55)
    else if (cyclePos < 0.55) {
      const t = cyclePos - 0.3;
      // Q 下降
      if (t < 0.05) {
        value = -0.3 * (t / 0.05);
      }
      // R 尖峰
      else if (t < 0.12) {
        value = -0.3 + 1.8 * ((t - 0.05) / 0.07);
      }
      // S 下降
      else if (t < 0.18) {
        value = 1.5 - 1.9 * ((t - 0.12) / 0.06);
      }
      // S 回归
      else {
        value = -0.4 * (1 - (t - 0.18) / 0.07);
      }

      value *= this.params.qrsGain;

      if (!this.beeped) {
        this.beeped = true;
        beat = true;
      }
    }
    // T 波 (0.55 ~ 0.9)
    else if (cyclePos < 0.9) {
      const t = (cyclePos - 0.55) / 0.35;
      value = Math.sin(t * Math.PI) * 0.25;
    }
    // 基线 (0.9 ~ 2PI)
    // value stays 0

    // ---- 激动模式额外谐波 ----
    if (this.params.harmonics) {
      // ST 段抬高（心肌缺血感）
      if (cyclePos >= 0.55 && cyclePos < 0.9) {
        value += 0.15;
      }
      // 叠加多层高频颤动，增加起伏丰富度
      value += Math.sin(this.phase * 5) * 0.08;
      value += Math.sin(this.phase * 9) * 0.06;
      value += Math.sin(this.phase * 13) * 0.05;
      value += Math.sin(this.phase * 17) * 0.04;
      // 增加低频波动
      value += Math.sin(this.phase * 2.3) * 0.1;
      // 偶尔出现室性早搏 (PVC)，增加概率
      if (Math.random() < 0.008 && cyclePos > 1.0) {
        value += (Math.random() - 0.5) * 1.2;
      }
    }

    // ---- 噪声 ----
    if (this.params.noise > 0) {
      value += (Math.random() - 0.5) * this.params.noise;
    }

    // 应用振幅
    value *= amp;

    // 计算实际 BPM
    let bpm = 0;
    if (beat) {
      const now = Date.now();
      if (this.lastBeatTime > 0) {
        const interval = now - this.lastBeatTime;
        bpm = 60000 / interval;
      }
      this.lastBeatTime = now;
    }

    return { value, beat };
  }

  getLastBPM(): number {
    if (this.lastBeatTime === 0) return 0;
    const msPerCycle = (Math.PI * 2) / this.params.phaseStep * 20;
    return Math.round(60000 / msPerCycle);
  }
}
