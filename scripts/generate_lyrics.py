#!/usr/bin/env python3
"""
使用 OpenAI Whisper 从音频文件生成歌词和逐字时间轴
安装依赖：pip install openai-whisper
"""

import whisper
import json
import sys
import os

def generate_lyrics_from_audio(audio_file_path):
    """
    从音频文件生成歌词和逐字时间轴

    Args:
        audio_file_path: 音频文件路径
    """
    print(f"加载 Whisper 模型...")
    # 使用 tiny 模型（最小，~72MB）
    # 其他可选: base (~142MB), small (~461MB), medium (~1.5GB), large (~2.9GB)
    model = whisper.load_model("tiny")

    print(f"分析音频文件: {audio_file_path}")
    result = model.transcribe(
        audio_file_path,
        language="zh",  # 中文
        word_timestamps=True  # 获取逐字时间轴
    )

    # 提取逐字时间轴
    lyrics = []
    for segment in result['segments']:
        if 'words' in segment:
            for word_data in segment['words']:
                word = word_data['word'].strip()
                start = word_data['start']
                end = word_data['end']
                duration = end - start

                # 将每个字分开（中文）
                for char in word:
                    char_duration = duration / len(word) if len(word) > 0 else 0
                    lyrics.append({
                        'char': char,
                        'startTime': round(start, 3),
                        'duration': round(char_duration, 3)
                    })
                    start += char_duration

    # 生成输出文件路径（在音频文件同目录）
    audio_dir = os.path.dirname(os.path.abspath(audio_file_path))
    audio_basename = os.path.splitext(os.path.basename(audio_file_path))[0]
    txt_output = os.path.join(audio_dir, f"{audio_basename}_lyric.txt")

    # 输出文本格式（主要格式）
    text_format = lyrics_to_text_format(lyrics)
    with open(txt_output, 'w', encoding='utf-8') as f:
        f.write(text_format)

    print(f"\n✅ 歌词已保存到: {txt_output}")
    print(f"📊 共 {len(lyrics)} 个字符")

    # 预览文本格式
    lines = text_format.split('\n')
    print(f"\n📝 文本格式预览（共 {len(lines)} 句）:")
    print("-" * 50)
    for i, line in enumerate(lines[:3]):
        print(f"  {line}")
    if len(lines) > 3:
        print(f"  ... 还有 {len(lines) - 3} 句")
    print("-" * 50)

    return lyrics


def lyrics_to_text_format(lyrics):
    """将歌词转换为文本格式: 字(startTime+duration)字(startTime+duration)..."""
    lines = []
    current_line = ""
    prev_end_time = None

    for lyric_char in lyrics:
        char = lyric_char['char']
        start_time = lyric_char['startTime']
        duration = lyric_char['duration']
        end_time = start_time + duration

        # 检查是否有间隙（衔接不上）
        if prev_end_time is not None and abs(prev_end_time - start_time) > 0.01:
            # 有间隙，换新行（新句子）
            if current_line:
                lines.append(current_line)
            current_line = ""

        # 添加字和时间信息
        current_line += f"{char}({start_time:.2f}+{duration:.2f})"
        prev_end_time = end_time

    # 添加最后一行
    if current_line:
        lines.append(current_line)

    return '\n'.join(lines)


def print_lyrics_preview(lyrics, max_lines=10):
    """打印歌词预览"""
    print("\n歌词预览:")
    print("-" * 50)
    for i, char_data in enumerate(lyrics[:max_lines]):
        print(f"[{char_data['startTime']:.2f}s] {char_data['char']} ({char_data['duration']:.2f}s)")
    if len(lyrics) > max_lines:
        print(f"... 还有 {len(lyrics) - max_lines} 个字符")
    print("-" * 50)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法: python3 generate_lyrics.py <音频文件路径>")
        print("\n示例:")
        print("  python3 generate_lyrics.py ../assets/music.wav")
        print("  → 自动生成: ../assets/music_lyric.txt")
        print("\n  python3 generate_lyrics.py song.mp3")
        print("  → 自动生成: song_lyric.txt")
        sys.exit(1)

    audio_file = sys.argv[1]

    lyrics = generate_lyrics_from_audio(audio_file)
    print_lyrics_preview(lyrics)
