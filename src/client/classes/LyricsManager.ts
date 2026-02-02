import type { LyricChar, LyricSentence } from '../types';
import { loadLyricsFromServer, parseLyricsText } from '../utils/lyrics';

/**
 * 歌词管理器 - 处理 KTV 逐字填色
 */
export class LyricsManager {
  private startTime = 0;
  private lyricsContainer: HTMLElement | null = null;
  private sentences: LyricSentence[] = [];
  private currentSentenceIndex = -1;
  private currentCharIndex = -1;
  private onCharStartCallback: (() => void) | null = null;

  constructor() {
    this.lyricsContainer = document.getElementById('lyrics-container') as HTMLElement | null;
  }

  /**
   * 设置每个字开始唱时的回调
   */
  onCharStart(callback: () => void) {
    this.onCharStartCallback = callback;
  }

  /**
   * 加载歌词数据
   */
  async loadLyrics() {
    const text = await loadLyricsFromServer();
    this.sentences = parseLyricsText(text);
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
      this.currentCharIndex = -1; // 重置字符索引
      this.renderCurrentSentence();
    }

    // 更新当前句子中每个字的卡拉OK效果
    if (activeSentenceIndex >= 0) {
      const sentence = this.sentences[activeSentenceIndex];
      const charElements = this.lyricsContainer.querySelectorAll('.char');

      // 找到当前正在唱的字符
      var activeCharIndex = -1;
      for (let i = 0; i < sentence.chars.length; i++) {
        const lyricChar = sentence.chars[i];
        if (elapsed >= lyricChar.startTime && elapsed < lyricChar.startTime + lyricChar.duration) {
          activeCharIndex = i;
          break;
        }
      }

      // 如果字符切换了，触发回调
      if (activeCharIndex !== -1 && activeCharIndex !== this.currentCharIndex) {
        this.currentCharIndex = activeCharIndex;
        if (this.onCharStartCallback) {
          this.onCharStartCallback();
        }
      }

      for (let i = 0; i < charElements.length; i++) {
        const lyricChar = sentence.chars[i];
        if (!lyricChar) continue;

        const charEl = charElements[i] as HTMLElement;
        const fgSpan = charEl.querySelector('.char-fg') as HTMLElement;
        if (!fgSpan) continue;

        if (elapsed >= lyricChar.startTime && elapsed < lyricChar.startTime + lyricChar.duration) {
          const charProgress = (elapsed - lyricChar.startTime) / lyricChar.duration;
          const rightClip = Math.round((1 - charProgress) * 100);
          fgSpan.style.clipPath = `inset(0 ${rightClip}% 0 0)`;
          charEl.style.opacity = '1';
        } else if (elapsed >= lyricChar.startTime + lyricChar.duration) {
          fgSpan.style.clipPath = 'inset(0 0% 0 0)';
          charEl.style.opacity = '1';
        } else {
          fgSpan.style.clipPath = 'inset(0 100% 0 0)';
          charEl.style.opacity = '1';
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
      const charSpan = document.createElement('span');
      charSpan.className = 'char';
      charSpan.style.opacity = '1';

      const bgSpan = document.createElement('span');
      bgSpan.className = 'char-bg';
      bgSpan.textContent = lyricChar.char;

      const fgSpan = document.createElement('span');
      fgSpan.className = 'char-fg';
      fgSpan.textContent = lyricChar.char;

      charSpan.appendChild(bgSpan);
      charSpan.appendChild(fgSpan);
      lineDiv.appendChild(charSpan);
    }

    this.lyricsContainer.appendChild(lineDiv);
  }
}
