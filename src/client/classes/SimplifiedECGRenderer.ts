import type { ECGMode } from '../types';
import { MODE_CONFIGS, MAX_ECG_POINTS } from '../constants';

/**
 * 简化版心电图渲染器（移动端）
 * 相比完整版，去除了装饰性网格和一些效果以优化移动端性能
 */
export class SimplifiedECGRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dataPoints: number[] = [];
  private maxPoints = MAX_ECG_POINTS;
  private animationId?: number;
  private mode: ECGMode;

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

    // 背景
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);

    // 简化版：只绘制中线，不绘制完整网格
    this.drawSimplifiedGrid();

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
      ctx.shadowBlur = this.mode === 'death' ? 0 : 5;
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

  private drawSimplifiedGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // 只绘制中线，不绘制完整网格
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

  stopRendering() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
  }
}
