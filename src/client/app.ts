import type { WSMessage, HeartbeatData, InteractionData } from '../shared/types';

/**
 * 心电图绘制器
 */
class ECGRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dataPoints: number[] = [];
  private maxPoints = 200;
  private animationId?: number;

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

  /**
   * 添加新的数据点
   */
  addDataPoint(value: number) {
    this.dataPoints.push(value);
    if (this.dataPoints.length > this.maxPoints) {
      this.dataPoints.shift();
    }
  }

  /**
   * 绘制心电图
   */
  render() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // 清空画布
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格
    this.drawGrid();

    // 绘制波形
    if (this.dataPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#ff4757';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff4757';

      const pointSpacing = width / this.maxPoints;
      const midY = height / 2;

      for (let i = 0; i < this.dataPoints.length; i++) {
        const x = i * pointSpacing;
        const y = midY - (this.dataPoints[i] * height * 0.4);

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

  /**
   * 绘制网格线
   */
  private drawGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;

    // 垂直线
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 水平线
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 中心线
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  /**
   * 开始渲染循环
   */
  startRendering() {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * 停止渲染
   */
  stopRendering() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
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
        console.log('WebSocket connected');
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
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.onStatusChange(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect...');
        this.connect();
      }, this.reconnectDelay);
    }
  }

  send(message: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

/**
 * 应用主类
 */
class App {
  private ecg: ECGRenderer;
  private ws: WSClient;
  private interactionCount = 0;
  private currentBPM = 72;
  private onlineCount = 0;

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

  private init() {
    // 启动 ECG 渲染
    this.ecg.startRendering();

    // 连接 WebSocket
    this.ws.connect();

    // 模拟心跳数据生成
    this.startHeartbeatSimulation();
  }

  /**
   * 生成模拟心跳数据
   */
  private startHeartbeatSimulation() {
    let phase = 0;
    setInterval(() => {
      // 生成 ECG 波形数据 (模拟 PQRST 波)
      phase += 0.1;
      let value = 0;

      // P 波
      if (phase % (Math.PI * 2) < 0.3) {
        value = Math.sin(phase * 10) * 0.2;
      }
      // QRS 波群
      else if (phase % (Math.PI * 2) < 0.5) {
        value = Math.sin((phase % (Math.PI * 2) - 0.3) * 30) * 1.2;
      }
      // T 波
      else if (phase % (Math.PI * 2) < 0.8) {
        value = Math.sin((phase % (Math.PI * 2) - 0.5) * 10) * 0.3;
      }

      this.ecg.addDataPoint(value);

      // 发送心跳数据到服务器
      if (Math.random() < 0.1) {
        this.ws.send({
          type: 'heartbeat',
          data: { value, timestamp: Date.now() } as HeartbeatData,
          timestamp: Date.now(),
        });
      }
    }, 20);
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleMessage(message: WSMessage) {
    switch (message.type) {
      case 'heartbeat':
        // 更新 BPM 显示
        if (message.data) {
          this.updateBPM(message.data.value);
        }
        break;

      case 'interaction':
        // 处理互动
        this.interactionCount++;
        this.updateInteractions();
        this.triggerInteractionEffect();
        break;

      case 'connect':
      case 'disconnect':
        // 更新在线人数
        if (message.data?.totalClients !== undefined) {
          this.onlineCount = message.data.totalClients;
          this.updateOnlineCount();
        }
        break;
    }
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(connected: boolean) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
      statusEl.textContent = connected ? 'Connected' : 'Disconnected';
    }
  }

  /**
   * 更新 BPM 显示
   */
  private updateBPM(value: number) {
    this.currentBPM = Math.round(60 + value * 40);
    const bpmEl = document.getElementById('bpm');
    if (bpmEl) {
      bpmEl.textContent = this.currentBPM.toString();
    }
  }

  /**
   * 更新互动次数
   */
  private updateInteractions() {
    const interactionsEl = document.getElementById('interactions');
    if (interactionsEl) {
      interactionsEl.textContent = this.interactionCount.toString();
    }
  }

  /**
   * 更新在线人数
   */
  private updateOnlineCount() {
    const onlineEl = document.getElementById('online-count');
    if (onlineEl) {
      onlineEl.textContent = `Online: ${this.onlineCount}`;
    }
  }

  /**
   * 触发互动效果
   */
  private triggerInteractionEffect() {
    // 可以在这里添加视觉或音效反馈
    console.log('Interaction received!');
  }
}

// 启动应用
new App();
