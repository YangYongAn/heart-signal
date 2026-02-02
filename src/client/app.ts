import type { WSMessage, HeartbeatData, InteractionData } from '../shared/types';

/**
 * 心电图模式
 */
enum ECGMode {
  NORMAL = 'normal',      // 正常模式
  EXCITED = 'excited',    // 激动模式（警报）
  DEATH = 'death',        // 死亡模式
  MUSIC = 'music'         // 音乐模式
}

/**
 * 歌词字符数据 - 每个字都有精确时间轴
 */
interface LyricChar {
  char: string;
  startTime: number; // 开始时间（秒）
  duration: number;  // 持续时间（秒）
}

/**
 * 歌词句子 - 每行是一个句子
 */
interface LyricSentence {
  chars: LyricChar[];
  startTime: number; // 句子开始时间
  endTime: number;   // 句子结束时间
}

/**
 * 解析文本格式的歌词
 * 格式: 字(startTime+duration)字(startTime+duration)...
 * 换行表示新句子
 */
function parseLyricsText(text: string): LyricSentence[] {
  const sentences: LyricSentence[] = [];
  const lines = text.trim().split('\n');

  for (const line of lines) {
    const chars: LyricChar[] = [];
    // 匹配 字(time+duration) 格式
    const regex = /(.)\((\d+\.?\d*)\+(\d+\.?\d*)\)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      chars.push({
        char: match[1],
        startTime: parseFloat(match[2]),
        duration: parseFloat(match[3])
      });
    }

    if (chars.length > 0) {
      const startTime = chars[0].startTime;
      const lastChar = chars[chars.length - 1];
      const endTime = lastChar.startTime + lastChar.duration;

      sentences.push({
        chars,
        startTime,
        endTime
      });
    }
  }

  return sentences;
}

/**
 * 从服务器加载歌词文本
 */
async function loadLyricsFromServer(): Promise<string> {
  try {
    const response = await fetch('/music_lyric.txt');
    if (!response.ok) {
      console.warn('歌词文件未找到，请运行: python3 scripts/generate_lyrics.py assets/music.wav');
      return '';
    }
    return await response.text();
  } catch (error) {
    console.error('加载歌词失败:', error);
    return '';
  }
}

/**
 * 模式配置
 */
interface ModeConfig {
  color: string;
  shadowColor: string;
  lineWidth: number;
  name: string;
  background: string;
  opacity?: number; // 波形透明度 (0-1)
}

const MODE_CONFIGS: Record<ECGMode, ModeConfig> = {
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
 * 波形参数（用于模式间平滑过渡）
 */
interface WaveParams {
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

const WAVE_PRESETS: Record<string, Omit<WaveParams, 'amplitude'>> = {
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
 * 音频分析器
 */
class AudioAnalyzer {
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private freqArray?: Uint8Array;
  private waveArray?: Uint8Array;
  private source?: MediaElementAudioSourceNode;
  private audio?: HTMLAudioElement;

  async init(audioUrl: string) {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;

      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveArray = new Uint8Array(this.analyser.fftSize);

      this.audio = new Audio(audioUrl);
      this.audio.crossOrigin = 'anonymous';
      this.audio.loop = true;

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

/**
 * 心电图音效生成器
 */
class SoundEffects {
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

    // 从静音渐入，模拟心跳消失后长鸣渐响
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

/**
 * 歌词管理器 - 处理 KTV 逐字填色
 */
class LyricsManager {
  private startTime = 0;
  private lyricsContainer: HTMLElement | null = null;
  private sentences: LyricSentence[] = [];
  private currentSentenceIndex = -1;

  constructor() {
    this.lyricsContainer = document.getElementById('lyrics-container') as HTMLElement | null;
  }

  /**
   * 加载歌词数据
   */
  async loadLyrics() {
    const text = await loadLyricsFromServer();
    // 将文本按换行符分句
    const lines = text.trim().split('\n');
    this.sentences = [];

    for (const line of lines) {
      const chars: LyricChar[] = [];
      // 匹配 字(time+duration) 格式
      const regex = /(.)\((\d+\.?\d*)\+(\d+\.?\d*)\)/g;
      let match;

      while ((match = regex.exec(line)) !== null) {
        chars.push({
          char: match[1],
          startTime: parseFloat(match[2]),
          duration: parseFloat(match[3])
        });
      }

      if (chars.length > 0) {
        const startTime = chars[0].startTime;
        const lastChar = chars[chars.length - 1];
        const endTime = lastChar.startTime + lastChar.duration;

        this.sentences.push({
          chars,
          startTime,
          endTime
        });
      }
    }

    this.renderAllLyrics();
  }

  start() {
    this.startTime = Date.now() / 1000;
    this.currentSentenceIndex = -1;
    if (this.lyricsContainer) {
      this.lyricsContainer.classList.add('show');
    }
  }

  stop() {
    if (this.lyricsContainer) {
      this.lyricsContainer.classList.remove('show');
    }
  }

  updateLyrics() {
    if (!this.lyricsContainer || this.sentences.length === 0) return;

    const elapsed = Date.now() / 1000 - this.startTime;

    // 找到当前应该显示的句子
    let activeSentenceIndex = -1;
    for (let i = 0; i < this.sentences.length; i++) {
      const sentence = this.sentences[i];
      if (elapsed >= sentence.startTime && elapsed < sentence.endTime) {
        activeSentenceIndex = i;
        break;
      }
    }

    // 如果句子切换了，重新渲染当前句子
    if (activeSentenceIndex !== this.currentSentenceIndex) {
      this.currentSentenceIndex = activeSentenceIndex;
      this.renderCurrentSentence();
    }

    // 更新当前句子中每个字的填色状态
    if (activeSentenceIndex >= 0) {
      const sentence = this.sentences[activeSentenceIndex];
      const charElements = this.lyricsContainer.querySelectorAll('.char');

      for (let i = 0; i < charElements.length; i++) {
        const lyricChar = sentence.chars[i];
        if (!lyricChar) continue;

        // 检查当前字是否应该填色
        if (elapsed >= lyricChar.startTime && elapsed < lyricChar.startTime + lyricChar.duration) {
          // 计算字的填色进度
          const charProgress = (elapsed - lyricChar.startTime) / lyricChar.duration;
          (charElements[i] as HTMLElement).style.opacity = (0.3 + charProgress * 0.7).toString();
        } else if (elapsed >= lyricChar.startTime + lyricChar.duration) {
          // 已播放完的字
          (charElements[i] as HTMLElement).style.opacity = '1';
        } else {
          // 未到达的字
          (charElements[i] as HTMLElement).style.opacity = '0.3';
        }
      }
    }
  }

  private renderAllLyrics() {
    if (!this.lyricsContainer) return;

    this.lyricsContainer.innerHTML = '';
  }

  private renderCurrentSentence() {
    if (!this.lyricsContainer || this.currentSentenceIndex < 0) {
      this.lyricsContainer!.innerHTML = '';
      return;
    }

    const sentence = this.sentences[this.currentSentenceIndex];
    this.lyricsContainer.innerHTML = '';

    const lineDiv = document.createElement('div');
    lineDiv.className = 'lyrics-line';

    for (const lyricChar of sentence.chars) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = lyricChar.char;
      span.style.opacity = '0.3';
      lineDiv.appendChild(span);
    }

    this.lyricsContainer.appendChild(lineDiv);
  }
}

/**
 * 心电图绘制器
 */
class ECGRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dataPoints: number[] = [];
  private maxPoints = 200;
  private animationId?: number;
  private mode: ECGMode = ECGMode.NORMAL;
  private alarmFlash = false;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  setMode(mode: ECGMode) {
    this.mode = mode;
    // 不清空数据点，保持波形连续
  }

  addDataPoint(value: number) {
    this.dataPoints.push(value);
    if (this.dataPoints.length > this.maxPoints) {
      this.dataPoints.shift();
    }
  }

  setDataPoints(points: number[]) {
    this.dataPoints = points.slice(-this.maxPoints);
  }

  render() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const config = MODE_CONFIGS[this.mode];

    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    // 激动模式闪烁
    if (this.mode === ECGMode.EXCITED) {
      this.alarmFlash = !this.alarmFlash;
      if (this.alarmFlash) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
      }
    }

    this.drawGrid();

    if (this.dataPoints.length > 1) {
      ctx.beginPath();

      // 应用透明度（音乐模式降低波形透明度）
      const opacity = config.opacity ?? 1;
      if (opacity < 1) {
        // 将 hex 颜色转换为 rgba
        const rgb = parseInt(config.color.slice(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else {
        ctx.strokeStyle = config.color;
      }

      ctx.lineWidth = config.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = this.mode === ECGMode.DEATH ? 0 : 10;
      ctx.shadowColor = config.shadowColor;

      const pointSpacing = width / this.maxPoints;
      const midY = height / 2;

      for (let i = 0; i < this.dataPoints.length; i++) {
        const x = i * pointSpacing;
        const y = midY - (this.dataPoints[i] * height * 0.25);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.strokeStyle = this.mode === ECGMode.DEATH ? '#111' : '#222';
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = this.mode === ECGMode.DEATH ? '#222' : '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  startRendering() {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }
}

/**
 * WebSocket 客户端
 */
class WSClient {
  private ws?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectDelay = 3000;

  constructor(
    private url: string,
    private onMessage: (message: WSMessage) => void,
    private onStatusChange: (connected: boolean) => void
  ) {}

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.onStatusChange(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = undefined;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.onMessage(message);
        } catch {}
      };

      this.ws.onclose = () => {
        this.onStatusChange(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {};
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    }
  }

  send(message: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

/**
 * 统一的 ECG 波形生成器
 * 正常/激动/死亡三种模式共用一条时间线
 */
class ECGWaveGenerator {
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
    if (mode === ECGMode.MUSIC) return; // 音乐模式不走这里

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
    // 振幅平滑过渡
    const ampDiff = this.params.targetAmplitude - this.params.amplitude;
    this.params.amplitude += ampDiff * 0.02;
    // 振幅足够小时归零
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
    // 根据 phaseStep 推算
    const msPerCycle = (Math.PI * 2) / this.params.phaseStep * 20;
    return Math.round(60000 / msPerCycle);
  }
}

/**
 * 应用主类
 */
class App {
  private ecg: ECGRenderer;
  private ws: WSClient;
  private audioAnalyzer?: AudioAnalyzer;
  private soundEffects = new SoundEffects();
  private waveGenerator = new ECGWaveGenerator();
  private lyricsManager = new LyricsManager();
  private interactionCount = 0;
  private currentBPM = 72;
  private lastDisplayedBPM = -1; // 上次显示的 BPM，用于避免不必要的 DOM 更新
  private onlineCount = 0;
  private currentMode: ECGMode = ECGMode.NORMAL;
  private ecgInterval?: ReturnType<typeof setInterval>;
  private musicInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.ecg = new ECGRenderer('ecg-canvas');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WSClient(
      wsUrl,
      (message) => this.handleMessage(message),
      (connected) => this.updateConnectionStatus(connected)
    );

    this.init();
  }

  private async init() {
    this.ecg.startRendering();
    this.ws.connect();
    this.setupKeyboardEvents();
    this.updateModeDisplay();
    this.updateBPM(); // 初始化 BPM 显示

    // 异步加载歌词
    await this.lyricsManager.loadLyrics();

    // 启动统一的心电图波形循环（始终运行）
    this.startECGLoop();
  }

  /**
   * 统一的心电图循环，所有 ECG 模式共享
   */
  private startECGLoop() {
    this.ecgInterval = setInterval(() => {
      // 音乐模式有自己的波形生成逻辑
      if (this.currentMode === ECGMode.MUSIC) return;

      const { value, beat } = this.waveGenerator.tick();
      this.ecg.addDataPoint(value);

      if (beat) {
        // QRS 峰到达，播放对应音效（音乐模式不播放心跳音）
        if (this.currentMode === ECGMode.NORMAL) {
          this.soundEffects.playBeep(880, 0.15, 0.3);
        } else if (this.currentMode === ECGMode.EXCITED) {
          this.soundEffects.playBeep(1000, 0.08, 0.5);
        }
        // 死亡模式和音乐模式不播放心跳音效
      }

      // 更新 BPM（音乐模式有自己的 BPM 更新逻辑，不走这里）
      if (this.currentMode === ECGMode.DEATH) {
        // 死亡模式：BPM 始终为 0
        this.currentBPM = 0;
      } else if (this.currentMode === ECGMode.EXCITED) {
        // 激动模式：频繁变动 BPM（每个 tick 都更新）
        const baseBPM = this.waveGenerator.getLastBPM();
        if (baseBPM > 0) {
          const jitter = 15; // 增大波动范围
          this.currentBPM = Math.round(baseBPM + (Math.random() - 0.5) * jitter * 2);
          this.currentBPM = Math.max(60, Math.min(180, this.currentBPM)); // 限制在合理范围
        }
      } else if (beat) {
        // 正常模式：beat 时更新
        const baseBPM = this.waveGenerator.getLastBPM();
        if (baseBPM > 0) {
          const jitter = 3;
          this.currentBPM = Math.round(baseBPM + (Math.random() - 0.5) * jitter * 2);
        }
      }
      this.updateBPM();
    }, 30);
  }

  private setupKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
          this.switchMode(ECGMode.EXCITED);
          break;
        case 'Backspace':
          this.switchMode(ECGMode.DEATH);
          break;
        case ' ':
          e.preventDefault();
          this.switchMode(ECGMode.MUSIC);
          break;
        case 'Escape':
          this.switchMode(ECGMode.NORMAL);
          break;
      }
    });
  }

  /**
   * 切换模式
   */
  private async switchMode(mode: ECGMode) {
    if (this.currentMode === mode) return;

    const prevMode = this.currentMode;
    this.currentMode = mode;
    this.ecg.setMode(mode);
    this.updateModeDisplay();

    // 停止音乐相关
    if (prevMode === ECGMode.MUSIC) {
      this.lyricsManager.stop();
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = undefined;
      }
      if (this.audioAnalyzer) {
        this.audioAnalyzer.stop();
      }
    }

    // 停止/启动警报音
    if (prevMode === ECGMode.EXCITED) {
      this.soundEffects.stopAlarm();
    }

    // 停止死亡长鸣
    if (prevMode === ECGMode.DEATH) {
      this.soundEffects.stopFlatline();
      // 从死亡模式切出时，立即更新 BPM
      const baseBPM = this.waveGenerator.getLastBPM();
      if (baseBPM > 0) {
        if (mode === ECGMode.EXCITED) {
          this.currentBPM = baseBPM + (Math.random() - 0.5) * 30;
        } else {
          this.currentBPM = baseBPM;
        }
      }
      this.updateBPM();
    }

    if (mode === ECGMode.MUSIC) {
      await this.startMusicMode();
    } else {
      // 切换波形参数（波形连续）
      this.waveGenerator.setMode(mode);

      if (mode === ECGMode.EXCITED) {
        this.soundEffects.startAlarm();
      }
      if (mode === ECGMode.DEATH) {
        this.soundEffects.startFlatline();
        // 死亡模式立即将 BPM 设为 0
        this.currentBPM = 0;
        this.updateBPM();
      }
    }
  }

  /**
   * 音乐模式 - 播放音乐并显示 KTV 歌词
   */
  private async startMusicMode() {
    this.soundEffects.stopAlarm();
    this.soundEffects.stopFlatline();
    const audioUrl = '/music.wav';

    this.audioAnalyzer = new AudioAnalyzer();
    await this.audioAnalyzer.init(audioUrl);

    // 帧间平滑缓冲
    let smoothed: number[] = new Array(200).fill(0);

    // 启动歌词显示
    this.lyricsManager.start();

    this.musicInterval = setInterval(() => {
      if (!this.audioAnalyzer) return;

      const waveform = this.audioAnalyzer.getWaveformData();
      const band = this.audioAnalyzer.getBandEnergy();
      const srcLen = waveform.length;
      const targetLen = 200;

      // 将时域波形插值到 200 个点
      const raw: number[] = [];
      for (let i = 0; i < targetLen; i++) {
        const srcIndex = (i / targetLen) * srcLen;
        const low = Math.floor(srcIndex);
        const high = Math.min(low + 1, srcLen - 1);
        const t = srcIndex - low;
        raw.push((waveform[low] ?? 0) * (1 - t) + (waveform[high] ?? 0) * t);
      }

      // 低频（鼓点）驱动振幅放大
      const bassBoost = 1 + band.bass * 1.5;

      const points: number[] = [];
      for (let i = 0; i < targetLen; i++) {
        let v = raw[i] * bassBoost;
        // 帧间平滑（50% 当前帧 + 50% 上一帧）
        v = v * 0.5 + smoothed[i] * 0.5;
        // 钳制在 -1 ~ 1 范围内，确保不超出画布
        v = Math.max(-1, Math.min(1, v));
        points.push(v);
      }

      // 三点均值平滑，消除锯齿和噪点
      const clean: number[] = [points[0]];
      for (let i = 1; i < points.length - 1; i++) {
        clean.push((points[i - 1] + points[i] + points[i + 1]) / 3);
      }
      clean.push(points[points.length - 1]);

      smoothed = clean;
      this.ecg.setDataPoints(clean);

      const volume = this.audioAnalyzer.getAverageVolume();
      this.currentBPM = Math.round(60 + volume * 100);
      this.updateBPM();

      // 更新歌词显示
      this.lyricsManager.updateLyrics();
    }, 30);
  }

  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'interaction':
        this.interactionCount++;
        this.updateInteractions();
        break;

      case 'connect':
      case 'disconnect':
        if (message.data?.totalClients !== undefined) {
          this.onlineCount = message.data.totalClients;
          this.updateOnlineCount();
        }
        break;
    }
  }

  private updateConnectionStatus(connected: boolean) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
      statusEl.textContent = connected ? 'Connected' : 'Disconnected';
    }
  }

  private updateBPM() {
    // 只在 BPM 实际改变时才更新 DOM，避免不必要的操作
    if (this.currentBPM === this.lastDisplayedBPM) {
      return;
    }

    const bpmEl = document.getElementById('bpm-value');
    if (bpmEl) {
      bpmEl.textContent = this.currentBPM.toString();
      this.lastDisplayedBPM = this.currentBPM;
    }
  }

  private updateInteractions() {
    const interactionsEl = document.getElementById('interactions');
    if (interactionsEl) {
      interactionsEl.textContent = this.interactionCount.toString();
    }
  }

  private updateOnlineCount() {
    const onlineEl = document.getElementById('online-count');
    if (onlineEl) {
      onlineEl.textContent = `Online: ${this.onlineCount}`;
    }
  }

  private updateModeDisplay() {
    const config = MODE_CONFIGS[this.currentMode];

    // 更新模式显示
    const modeEl = document.getElementById('current-mode');
    if (modeEl) {
      modeEl.textContent = config.name;
      modeEl.style.color = config.color;
    }

    // 更新标题颜色和阴影
    const titleEl = document.getElementById('title');
    if (titleEl) {
      titleEl.style.color = config.color;
      titleEl.style.textShadow = `0 0 20px ${config.shadowColor}`;
    }

    // 更新 BPM 颜色
    const bpmEl = document.getElementById('bpm-value');
    if (bpmEl) {
      bpmEl.style.color = config.color;
    }
  }
}

// 启动应用
new App();
