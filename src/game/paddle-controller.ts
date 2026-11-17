/**
 * Paddle Controller: Multi-input handling (Mouse, Touch Drag, Keyboard WASD/Arrows)
 * with screen-to-canvas coordinate mapping, smooth interpolation, and velocity estimation.
 */

import { Paddle } from './types';

export class PaddleController {
  private paddle: Paddle;
  private arenaWidth: number;
  private canvasElement: HTMLCanvasElement | null = null;

  // Keyboard state
  private keyLeft: boolean = false;
  private keyRight: boolean = false;

  // Touch tracking
  private isTouching: boolean = false;
  private lastTouchX: number = 0;

  // Velocity tracking
  private lastX: number = 0;
  private acceleration: number = 24; // Dynamic responsiveness / lerpRate

  constructor(arenaWidth: number, arenaHeight: number) {
    this.arenaWidth = arenaWidth;

    const paddleWidth = 104;
    const paddleHeight = 16;
    const startX = (arenaWidth - paddleWidth) / 2;
    const startY = arenaHeight - 48;

    this.paddle = {
      x: startX,
      y: startY,
      width: paddleWidth,
      height: paddleHeight,
      vx: 0,
      speed: 620, // px per second when using keyboard
      targetX: startX,
      color: '#06b6d4', // Neon Cyan
      glowColor: 'rgba(6, 182, 212, 0.65)',
      hitFlashTime: 0,
    };

    this.lastX = startX;
  }

  private baseWidth: number = 104;
  private isExpanded: boolean = false;

  public getPaddle(): Paddle {
    return this.paddle;
  }

  public setColor(color: string, glowColor: string) {
    this.paddle.color = color;
    this.paddle.glowColor = glowColor;
  }

  public setDifficultyParameters(speed: number, acceleration: number, width?: number) {
    this.paddle.speed = speed;
    this.acceleration = acceleration;
    if (width && width > 0) {
      this.baseWidth = width;
      if (!this.isExpanded) {
        this.paddle.width = width;
      }
    }
  }

  public setExpanded(expanded: boolean, scale: number = 1.45) {
    if (this.isExpanded === expanded) return;
    this.isExpanded = expanded;
    const oldWidth = this.paddle.width;
    const targetWidth = expanded ? Math.round(this.baseWidth * scale) : this.baseWidth;

    // Adjust position around paddle center
    const centerX = this.paddle.x + oldWidth / 2;
    this.paddle.width = targetWidth;
    this.paddle.x = Math.max(0, Math.min(this.arenaWidth - targetWidth, centerX - targetWidth / 2));
    this.paddle.targetX = this.paddle.x;
  }

  public getIsExpanded(): boolean {
    return this.isExpanded;
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;
    this.attachEventListeners();
  }

  /**
   * Resets paddle to center position
   */
  public reset(arenaWidth: number = this.arenaWidth) {
    this.arenaWidth = arenaWidth;
    this.paddle.x = (this.arenaWidth - this.paddle.width) / 2;
    this.paddle.targetX = this.paddle.x;
    this.paddle.vx = 0;
    this.lastX = this.paddle.x;
  }

  /**
   * Update paddle position and compute instantaneous velocity
   */
  public update(dt: number) {
    // 1. Keyboard movement
    let moveDir = 0;
    if (this.keyLeft) moveDir -= 1;
    if (this.keyRight) moveDir += 1;

    if (moveDir !== 0) {
      this.paddle.targetX += moveDir * this.paddle.speed * dt;
    }

    // Clamp target within bounds
    const maxX = this.arenaWidth - this.paddle.width;
    this.paddle.targetX = Math.max(0, Math.min(maxX, this.paddle.targetX));

    // Smooth movement interpolation with dynamic acceleration
    const lerpFactor = 1 - Math.exp(-this.acceleration * dt);
    this.paddle.x += (this.paddle.targetX - this.paddle.x) * lerpFactor;

    // Strict clamp
    this.paddle.x = Math.max(0, Math.min(maxX, this.paddle.x));

    // Calculate instantaneous horizontal velocity
    this.paddle.vx = dt > 0 ? (this.paddle.x - this.lastX) / dt : 0;
    this.lastX = this.paddle.x;

    // Decay hit flash
    if (this.paddle.hitFlashTime > 0) {
      this.paddle.hitFlashTime = Math.max(0, this.paddle.hitFlashTime - dt);
    }
  }

  /**
   * Flash paddle on ball contact
   */
  public triggerHitFlash() {
    this.paddle.hitFlashTime = 0.12;
  }

  /**
   * Map client screen (X, Y) to virtual canvas coordinate system
   */
  private clientToCanvasX(clientX: number): number {
    if (!this.canvasElement) return clientX;
    const rect = this.canvasElement.getBoundingClientRect();
    if (rect.width <= 0) return clientX;

    const scaleX = this.arenaWidth / rect.width;
    return (clientX - rect.left) * scaleX;
  }

  private handlePointerMove = (e: MouseEvent | TouchEvent) => {
    let clientX = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const canvasX = this.clientToCanvasX(clientX);
    // Center the paddle on the pointer
    this.paddle.targetX = canvasX - this.paddle.width / 2;
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.isTouching = true;
      this.lastTouchX = e.touches[0].clientX;
      const canvasX = this.clientToCanvasX(this.lastTouchX);
      this.paddle.targetX = canvasX - this.paddle.width / 2;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const clientX = e.touches[0].clientX;
      const canvasX = this.clientToCanvasX(clientX);
      this.paddle.targetX = canvasX - this.paddle.width / 2;
      this.lastTouchX = clientX;
    }
  };

  private handleTouchEnd = () => {
    this.isTouching = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.keyLeft = true;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.keyRight = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.keyLeft = false;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.keyRight = false;
    }
  };

  private handleWindowBlur = () => {
    this.keyLeft = false;
    this.keyRight = false;
    this.isTouching = false;
  };

  private attachEventListeners() {
    if (!this.canvasElement) return;

    // Mouse movement
    this.canvasElement.addEventListener('mousemove', this.handlePointerMove, { passive: true });

    // Touch events
    this.canvasElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.canvasElement.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    this.canvasElement.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    this.canvasElement.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });

    // Global keyboard
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  public cleanup() {
    if (this.canvasElement) {
      this.canvasElement.removeEventListener('mousemove', this.handlePointerMove);
      this.canvasElement.removeEventListener('touchstart', this.handleTouchStart);
      this.canvasElement.removeEventListener('touchmove', this.handleTouchMove);
      this.canvasElement.removeEventListener('touchend', this.handleTouchEnd);
      this.canvasElement.removeEventListener('touchcancel', this.handleTouchEnd);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
  }
}
