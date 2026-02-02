/**
 * 心电图音效生成器
 */
export class SoundEffects {
  private audioContext?: AudioContext;
  private alarmOsc?: OscillatorNode;
  private alarmGain?: GainNode;
  private flatlineOsc?: OscillatorNode;
  private flatlineGain?: GainNode;

  private ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  playBeep(frequency: number, duration: number, volume: number) {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  /**
   * 激动模式：播放 4 次快速的滴声（滴滴滴滴）
   */
  playExcitedBeeps() {
    const interval = 0.15;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playBeep(1000, 0.15, 0.5);
      }, i * interval * 1000);
    }
  }

  startAlarm() {
    const ctx = this.ensureContext();
    const alarmOsc = ctx.createOscillator();
    const alarmGain = ctx.createGain();

    alarmOsc.type = 'square';
    alarmOsc.frequency.value = 440;
    alarmGain.gain.value = 0.08;

    const now = ctx.currentTime;
    for (let i = 0; i < 600; i++) {
      alarmOsc.frequency.setValueAtTime(440, now + i * 0.5);
      alarmOsc.frequency.setValueAtTime(660, now + i * 0.5 + 0.25);
    }

    alarmOsc.connect(alarmGain);
    alarmGain.connect(ctx.destination);
    alarmOsc.start();

    this.alarmOsc = alarmOsc;
    this.alarmGain = alarmGain;
  }

  stopAlarm() {
    if (this.alarmOsc) {
      try { this.alarmOsc.stop(); } catch {}
      this.alarmOsc = undefined;
    }
    this.alarmGain = undefined;
  }

  /**
   * 死亡模式：持续长鸣音（flatline）
   * BI----- 声先响亮 2 秒，然后逐渐衰减到无声
   */
  startFlatline() {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880;

    // 前 2 秒保持响亮
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime + 2);
    // 之后 6 秒逐渐衰减
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 8);

    this.flatlineOsc = osc;
    this.flatlineGain = gain;
  }

  stopFlatline() {
    if (this.flatlineOsc) {
      try { this.flatlineOsc.stop(); } catch {}
      this.flatlineOsc = undefined;
    }
    this.flatlineGain = undefined;
  }
}
