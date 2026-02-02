import type { ECGMode } from '../types';
import { MODE_CONFIGS, MAX_ECG_POINTS } from '../constants';

/**
 * 心电图绘制器
 */
export class ECGRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dataPoints: number[] = [];
  private maxPoints = MAX_ECG_POINTS;
  private animationId?: number;
  private mode: ECGMode;
  private alarmFlash = false;

  constructor(canvasId: string, initialMode: ECGMode) {
    this.mode = initialMode;
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
    if (this.mode === 'excited') {
      this.alarmFlash = !this.alarmFlash;
      if (this.alarmFlash) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
      }
    }

    this.drawGrid();

    if (this.dataPoints.length > 1) {
      ctx.beginPath();

      const opacity = config.opacity !== undefined ? config.opacity : 1;
      if (opacity < 1) {
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
      ctx.shadowBlur = this.mode === 'death' ? 0 : 10;
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

    ctx.strokeStyle = this.mode === 'death' ? '#111' : '#222';
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

    ctx.strokeStyle = this.mode === 'death' ? '#222' : '#333';
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
