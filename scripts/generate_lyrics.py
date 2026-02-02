#!/usr/bin/env python3
"""
使用 OpenAI Whisper 从音频文件生成歌词和逐字时间轴
安装依赖：pip install openai-whisper
"""

import whisper
import json
import sys

def generate_lyrics_from_audio(audio_file_path, output_file='lyrics.json'):
    """
    从音频文件生成歌词和逐字时间轴

    Args:
        audio_file_path: 音频文件路径
        output_file: 输出 JSON 文件路径
    """
    print(f"加载 Whisper 模型...")
    # 使用 tiny 模型（最小，~1GB）
    # 其他可选: base (~1GB), small (~2GB), medium (~5GB), large (~10GB)
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

    # 保存为 JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(lyrics, f, ensure_ascii=False, indent=2)

    print(f"歌词已保存到: {output_file}")
    print(f"共 {len(lyrics)} 个字符")

    # 同时输出 TypeScript 格式
    ts_output = output_file.replace('.json', '.ts')
    with open(ts_output, 'w', encoding='utf-8') as f:
        f.write("export const LYRICS = ")
        f.write(json.dumps(lyrics, ensure_ascii=False, indent=2))
        f.write(";\n")

    print(f"TypeScript 格式已保存到: {ts_output}")

    return lyrics


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
        print("使用方法: python generate_lyrics.py <音频文件路径> [输出文件名]")
        print("\n示例:")
        print("  python generate_lyrics.py ../assets/music.wav")
        print("  python generate_lyrics.py song.mp3 my_lyrics.json")
        sys.exit(1)

    audio_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'lyrics.json'

    lyrics = generate_lyrics_from_audio(audio_file, output_file)
    print_lyrics_preview(lyrics)
