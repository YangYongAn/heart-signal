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
   * 死亡模式：持续长鸣音（flatline），音量从 0 渐入
   */
  startFlatline() {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 500;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

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
