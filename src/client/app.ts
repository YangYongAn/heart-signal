import type { WSMessage } from '../shared/types';
import { ECGMode } from './types';
import { MODE_CONFIGS, MODE_EMOJI_URLS } from './constants';
import { ECGRenderer } from './classes/ECGRenderer';
import { ECGWaveGenerator } from './classes/ECGWaveGenerator';
import { WSClient } from './classes/WSClient';
import { SoundEffects } from './classes/SoundEffects';
import { AudioAnalyzer } from './classes/AudioAnalyzer';
import { LyricsManager } from './classes/LyricsManager';
import { DanmakuManager } from './classes/DanmakuManager';

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
  private danmakuManager: DanmakuManager;
  private interactionCount = 0;
  private currentBPM = 72;
  private lastDisplayedBPM = -1;
  private onlineCount = 0;
  private currentMode: ECGMode = ECGMode.NORMAL;
  private ecgInterval?: ReturnType<typeof setInterval>;
  private musicInterval?: ReturnType<typeof setInterval>;
  private modeEmojiImg?: HTMLImageElement;
  private hasUserInteracted = false;

  constructor() {
    this.ecg = new ECGRenderer('ecg-canvas', ECGMode.NORMAL);
    this.danmakuManager = new DanmakuManager('danmaku-container', 15);

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
    this.preloadEmojiImages();
    this.ecg.startRendering();
    this.ws.connect();
    this.setupUserInteractionDetection();
    this.setupKeyboardEvents();
    this.updateModeDisplay();
    this.updateBPM();
    await this.lyricsManager.loadLyrics();
    this.startECGLoop();
  }

  private setupUserInteractionDetection() {
    const handleInteraction = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        // 移除所有交互监听，后续由 setupKeyboardEvents 处理
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      }
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
  }

  /**
   * 预加载所有模式的 emoji 图片
   */
  private preloadEmojiImages() {
    Object.values(MODE_EMOJI_URLS).forEach(url => {
      const img = new Image();
      // 添加 crossorigin 属性确保跨域图片正确缓存
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  /**
   * 统一的心电图循环，所有 ECG 模式共享
   */
  private startECGLoop() {
    this.ecgInterval = setInterval(() => {
      if (this.currentMode === ECGMode.MUSIC) return;

      const { value, beat } = this.waveGenerator.tick();
      this.ecg.addDataPoint(value);

      if (beat && this.hasUserInteracted) {
        if (this.currentMode === ECGMode.NORMAL) {
          this.soundEffects.playBeep(880, 0.15, 0.3);
        } else if (this.currentMode === ECGMode.EXCITED) {
          this.soundEffects.playBeep(1000, 0.08, 0.5);
        }
      }

      if (this.currentMode === ECGMode.DEATH) {
        this.currentBPM = 0;
      } else if (this.currentMode === ECGMode.EXCITED) {
        const baseBPM = this.waveGenerator.getLastBPM();
        if (baseBPM > 0) {
          const jitter = 15;
          this.currentBPM = Math.round(baseBPM + (Math.random() - 0.5) * jitter * 2);
          this.currentBPM = Math.max(60, Math.min(180, this.currentBPM));
        }
      } else if (beat) {
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
      switch (e.key.toLowerCase()) {
        case 'enter':
          this.switchMode(ECGMode.EXCITED);
          break;
        case 'backspace':
          this.switchMode(ECGMode.DEATH);
          break;
        case ' ':
          e.preventDefault();
          this.switchMode(ECGMode.MUSIC);
          break;
        case 'escape':
          this.switchMode(ECGMode.NORMAL);
          break;
        case 'f':
          this.toggleFullscreen();
          break;
      }
    });
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        console.log('全屏请求被拒绝');
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * 切换模式
   */
  private async switchMode(mode: ECGMode) {
    if (this.currentMode === mode) return;

    const prevMode = this.currentMode;
    this.currentMode = mode;

    // 立即更新显示，确保视觉反馈最快
    this.updateModeDisplay();

    // 广播模式变化到所有连接的客户端
    this.ws.send({
      type: 'modeChange',
      data: { mode: this.currentMode },
      timestamp: Date.now(),
    });

    this.ecg.setMode(mode);

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

    if (prevMode === ECGMode.EXCITED) {
      this.soundEffects.stopAlarm();
    }

    if (prevMode === ECGMode.DEATH) {
      this.soundEffects.stopFlatline();
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
      this.waveGenerator.setMode(mode);

      if (mode === ECGMode.NORMAL) {
        // 进入正常模式时重置时钟并立即播放一次声音
        this.waveGenerator.resetPhaseToQRS();
        if (this.hasUserInteracted) {
          this.soundEffects.playBeep(880, 0.15, 0.3);
        }
      } else if (mode === ECGMode.EXCITED) {
        if (this.hasUserInteracted) {
          this.soundEffects.startAlarm();
        }
      } else if (mode === ECGMode.DEATH) {
        if (this.hasUserInteracted) {
          this.soundEffects.startFlatline();
        }
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
    const audioUrl = 'https://img.yangyongan.com/heart-signal/music.wav';

    this.audioAnalyzer = new AudioAnalyzer();
    // 只有在用户交互后才播放音乐
    if (this.hasUserInteracted) {
      await this.audioAnalyzer.init(audioUrl, () => {
        this.switchMode(ECGMode.NORMAL);
      });
    }

    let smoothed: number[] = new Array(200).fill(0);
    this.lyricsManager.start();

    this.musicInterval = setInterval(() => {
      if (!this.audioAnalyzer) return;

      const waveform = this.audioAnalyzer.getWaveformData();
      const band = this.audioAnalyzer.getBandEnergy();
      const srcLen = waveform.length;
      const targetLen = 200;

      const raw: number[] = [];
      for (let i = 0; i < targetLen; i++) {
        const srcIndex = (i / targetLen) * srcLen;
        const low = Math.floor(srcIndex);
        const high = Math.min(low + 1, srcLen - 1);
        const t = srcIndex - low;
        raw.push((waveform[low] ?? 0) * (1 - t) + (waveform[high] ?? 0) * t);
      }

      const bassBoost = 1 + band.bass * 1.5;

      const points: number[] = [];
      for (let i = 0; i < targetLen; i++) {
        let v = raw[i] * bassBoost;
        v = v * 0.5 + smoothed[i] * 0.5;
        v = Math.max(-1, Math.min(1, v));
        points.push(v);
      }

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
      this.lyricsManager.updateLyrics();
    }, 30);
  }

  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'interaction':
        this.interactionCount++;
        this.updateInteractions();
        break;

      case 'danmaku':
        if (message.data) {
          this.danmakuManager.addDanmaku(message.data);
        }
        break;

      case 'danmakuDelete':
        if (message.data?.id) {
          this.danmakuManager.removeDanmaku(message.data.id);
        }
        break;

      case 'modeChange':
        if (message.data?.mode) {
          this.switchMode(message.data.mode as ECGMode);
        }
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
    if (this.currentBPM === this.lastDisplayedBPM) {
      return;
    }

    const bpmEl = document.getElementById('bpm-value');
    if (bpmEl) {
      // 死亡模式下显示 "--"
      bpmEl.textContent = this.currentBPM === 0 ? '--' : this.currentBPM.toString();
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

    const modeEl = document.getElementById('current-mode');
    if (modeEl) {
      // 如果还没有创建过 img 元素，则创建一次
      if (!this.modeEmojiImg) {
        this.modeEmojiImg = document.createElement('img');
        this.modeEmojiImg.crossOrigin = 'anonymous';
        modeEl.appendChild(this.modeEmojiImg);
      }

      // 只更新 src，避免重新创建元素导致闪烁
      const emojiUrl = MODE_EMOJI_URLS[this.currentMode];
      this.modeEmojiImg.src = emojiUrl;
      this.modeEmojiImg.alt = this.currentMode;
    }

    const titleEl = document.getElementById('title');
    if (titleEl) {
      titleEl.style.color = config.color;
      titleEl.style.textShadow = `0 0 20px ${config.shadowColor}`;
    }

    const bpmEl = document.getElementById('bpm-value');
    if (bpmEl) {
      bpmEl.style.color = config.color;
    }
  }
}

// 启动应用
new App();
