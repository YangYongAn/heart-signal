import type { LyricChar, LyricSentence } from '../types';
import { LYRICS_FILE_PATH } from '../constants';

/**
 * 解析文本格式的歌词
 * 格式: [startTime+duration]字字字...
 * 换行表示新句子
 */
export function parseLyricsText(text: string): LyricSentence[] {
  const sentences: LyricSentence[] = [];
  const lines = text.trim().split('\n');

  for (const line of lines) {
    const chars: LyricChar[] = [];
    // 匹配 [time+duration]字字字... 格式（一个标签可以对应多个字）
    const regex = /\[(\d+\.?\d*)\+(\d+\.?\d*)\]([^\[\]]*)/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const startTime = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const charStr = match[3];

      // 忽略空格停顿标记
      if (charStr === ' ') continue;

      // 将多个字平均分配时间
      if (charStr.length > 0) {
        const charDuration = duration / charStr.length;
        let currentTime = startTime;

        for (const char of charStr) {
          chars.push({
            char: char,
            startTime: parseFloat(currentTime.toFixed(3)),
            duration: parseFloat(charDuration.toFixed(3))
          });
          currentTime += charDuration;
        }
      }
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
export async function loadLyricsFromServer(): Promise<string> {
  try {
    const response = await fetch(LYRICS_FILE_PATH);
    if (!response.ok) {
      console.warn('歌词文件未找到，请运行: python3 scripts/generate_lyrics.py public/music.wav');
      return '';
    }
    return await response.text();
  } catch (error) {
    console.error('加载歌词失败:', error);
    return '';
  }
}
