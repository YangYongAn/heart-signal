#!/usr/bin/env python3
"""
使用 OpenAI Whisper 从音频文件生成歌词和逐字时间轴
安装依赖：
  pip3 install openai-whisper
  pip3 install opencc  （可选，用于简繁转换，约 1.4MB）
"""

import whisper
import json
import sys
import os

# 尝试导入 OpenCC（简繁转换）- 约 1.4MB
try:
    from opencc import OpenCC
    OPENCC_AVAILABLE = True
except ImportError:
    OPENCC_AVAILABLE = False

def generate_lyrics_from_audio(audio_file_path, to_traditional=False):
    """
    从音频文件生成歌词和逐字时间轴

    Args:
        audio_file_path: 音频文件路径
        to_traditional: 是否转换为繁体中文
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

    # 转换为繁体（如果需要）
    if to_traditional and OPENCC_AVAILABLE:
        converter = OpenCC('s2t')  # 简体 to 繁体
        for segment in result['segments']:
            if 'words' in segment:
                for word_data in segment['words']:
                    word_data['word'] = converter.convert(word_data['word'])
        print("✓ 已转换为繁体中文")

    # 提取逐字时间轴（基于 segment 分组分句，词级别时间标签）
    lyrics = []

    for segment_idx, segment in enumerate(result['segments']):
        if 'words' in segment:
            # 每个 segment 是一个句子
            if segment_idx > 0:
                # 在新 segment 前添加停顿标记
                lyrics.append({
                    'char': ' ',  # 空格表示句子边界
                    'startTime': round(result['segments'][segment_idx - 1]['end'], 3),
                    'duration': 0,
                    'wordEnd': True  # 标记词边界
                })

            for word_data in segment['words']:
                word = word_data['word'].strip()
                word_start = word_data['start']
                word_end = word_data['end']
                word_duration = word_end - word_start

                # 词内的所有字共享一个时间标签
                for char in word:
                    lyrics.append({
                        'char': char,
                        'startTime': round(word_start, 3),
                        'duration': round(word_duration, 3),
                        'wordEnd': char == word[-1]  # 标记词的最后一个字
                    })

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

    # 统计句子数
    num_sentences = sum(1 for item in lyrics if item['char'] == ' ')
    print(f"📋 共 {num_sentences + 1} 个句子")

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
    """将歌词转换为文本格式: [startTime+duration]字字字[startTime+duration]字..."""
    lines = []
    current_line = ""
    prev_start_time = None

    for lyric_char in lyrics:
        char = lyric_char['char']
        start_time = lyric_char['startTime']
        duration = lyric_char['duration']
        is_word_end = lyric_char.get('wordEnd', False)

        # 空格字符表示停顿/间隙，触发换行
        if char == ' ':
            if current_line:
                lines.append(current_line)
            current_line = ""
            prev_start_time = None
        else:
            # 检测是否是新词的第一个字（时间标签不同）
            if prev_start_time != start_time:
                # 新词，添加时间标签
                current_line += f"[{start_time:.2f}+{duration:.2f}]{char}"
                prev_start_time = start_time
            else:
                # 同一词内的后续字，只添加字符
                current_line += char

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
        print("使用方法: python3 generate_lyrics.py <音频文件路径> [--traditional]")
        print("\n示例:")
        print("  python3 generate_lyrics.py ../assets/music.wav")
        print("  → 自动生成: ../assets/music_lyric.txt (简体)")
        print("\n  python3 generate_lyrics.py ../assets/music.wav --traditional")
        print("  → 自动生成: ../assets/music_lyric.txt (繁体)")
        print("\n  python3 generate_lyrics.py song.mp3 -t")
        print("  → 自动生成: song_lyric.txt (繁体)")
        sys.exit(1)

    audio_file = sys.argv[1]
    to_traditional = '--traditional' in sys.argv or '-t' in sys.argv

    if to_traditional and not OPENCC_AVAILABLE:
        print("\n⚠️  警告: 未安装 opencc，无法转换繁体")
        print("   安装方法: pip3 install opencc")
        print("   包大小: 约 1.4MB")
        print("   将使用简体输出\n")
        to_traditional = False

    lyrics = generate_lyrics_from_audio(audio_file, to_traditional)
    print_lyrics_preview(lyrics)
