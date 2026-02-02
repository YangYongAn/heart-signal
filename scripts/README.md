# 歌词生成工具

使用 OpenAI Whisper（tiny 模型）从音频文件自动生成 KTV 风格的逐字时间轴歌词。

## 环境要求

- **Python 3.7 或更高版本**
- 推荐使用 Python 3.9 或 3.10

检查版本：
```bash
python3 --version
```

## 安装依赖

```bash
pip3 install openai-whisper
```

首次运行时会自动下载 tiny 模型（约 72MB），比其他模型小很多。

## 使用方法

### 基本用法

```bash
cd scripts
python3 generate_lyrics.py ../assets/music.wav
```

这会生成两个文件：
- `lyrics.json` - JSON 格式的歌词数据
- `lyrics.ts` - TypeScript 格式，可直接复制到代码中

### 指定输出文件

```bash
python3 generate_lyrics.py ../assets/music.wav my_lyrics.json
```

## 输出格式

生成的歌词数据格式如下：

```json
[
  {
    "char": "在",
    "startTime": 0.0,
    "duration": 0.3
  },
  {
    "char": "你",
    "startTime": 0.3,
    "duration": 0.3
  }
]
```

每个字对象包含：
- `char` - 单个中文字符
- `startTime` - 字开始时间（秒）
- `duration` - 字持续时间（秒）

## 替换项目中的歌词

1. 运行脚本生成歌词：
   ```bash
   python3 generate_lyrics.py ../assets/music.wav
   ```

2. 打开生成的 `lyrics.ts` 文件

3. 复制 `export const LYRICS = [...]` 部分到 `src/client/app.ts` 中的 `LYRICS` 常量

## 模型说明

脚本使用 **tiny** 模型（约 72MB），这是最小最快的模型。

其他可选模型（需修改脚本）：

- **tiny** - ~72MB，最快，精度中等（推荐）
- base - ~142MB，快，精度良好
- small - ~461MB，中等速度，精度很好
- medium - ~1.5GB，慢，精度优秀
- large - ~2.9GB，很慢，精度最佳

**对于中文歌词，tiny 或 base 模型通常已足够。**

## 提高精度

如果 tiny 模型识别不准确，可以修改脚本使用更大的模型：

```python
# 在 generate_lyrics.py 中修改这一行：
model = whisper.load_model("tiny")  # 改为 "base" 或 "small"
```

## 注意事项

1. Whisper 主要用于语音识别，对于歌曲可能识别不准确
2. 建议生成后手动检查和调整时间轴
3. 如果音频有背景音乐，可能影响识别准确度
4. 歌词识别精度取决于：
   - 歌手发音清晰度
   - 背景音量大小
   - 音频质量

## 手动调整

如果自动识别不理想，可以手动编辑 `src/client/app.ts` 中的歌词：

```typescript
const LYRICS: LyricChar[] = [
  { char: '在', startTime: 0, duration: 0.3 },
  { char: '你', startTime: 0.3, duration: 0.3 },
  // 手动添加或调整时间轴
];
```
