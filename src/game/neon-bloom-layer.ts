/**
 * Neon Bloom Post-Processing Layer:
 * Offscreen multi-pass emissive & Gaussian bloom pipeline that isolates
 * high-intensity gameplay elements (balls, power-ups, exploding bricks,
 * shockwaves, boss plasma, and paddle impact flashes), downsamples & blurs
 * them across two octaves, and composites them additively onto the main canvas.
 */

import { Ball, BossProjectile, Brick, Paddle, PowerUpItem } from './types';

export interface NeonBloomInput {
  balls: Ball[];
  isFireBall: boolean;
  isPlayer2?: boolean;
  paddle: Pick<Paddle, 'x' | 'y' | 'width' | 'height' | 'color' | 'hitFlashTime'>;
  bricks: Brick[];
  powerUpItems: PowerUpItem[];
  hasBottomShield: boolean;
  bossProjectiles: BossProjectile[];
  renderParticlesEmissive: (ctx: CanvasRenderingContext2D) => void;
}

export class NeonBloomLayer {
  private readonly arenaWidth: number;
  private readonly arenaHeight: number;
  private enabled: boolean = true;

  // Offscreen post-processing render targets (half-res + quarter-res octaves)
  private emissiveCanvas: HTMLCanvasElement;
  private emissiveCtx: CanvasRenderingContext2D;

  private tightBlurCanvas: HTMLCanvasElement;
  private tightBlurCtx: CanvasRenderingContext2D;

  private wideBlurCanvas: HTMLCanvasElement;
  private wideBlurCtx: CanvasRenderingContext2D;

  private readonly halfScale = 0.5;
  private readonly quarterScale = 0.25;

  constructor(arenaWidth: number, arenaHeight: number) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;

    const halfW = Math.max(1, Math.round(arenaWidth * this.halfScale));
    const halfH = Math.max(1, Math.round(arenaHeight * this.halfScale));
    const quarterW = Math.max(1, Math.round(arenaWidth * this.quarterScale));
    const quarterH = Math.max(1, Math.round(arenaHeight * this.quarterScale));

    this.emissiveCanvas = document.createElement('canvas');
    this.emissiveCanvas.width = halfW;
    this.emissiveCanvas.height = halfH;
    const eCtx = this.emissiveCanvas.getContext('2d');
    if (!eCtx) throw new Error('Failed to create emissive 2D context');
    this.emissiveCtx = eCtx;

    this.tightBlurCanvas = document.createElement('canvas');
    this.tightBlurCanvas.width = halfW;
    this.tightBlurCanvas.height = halfH;
    const tCtx = this.tightBlurCanvas.getContext('2d');
    if (!tCtx) throw new Error('Failed to create tight-blur 2D context');
    this.tightBlurCtx = tCtx;

    this.wideBlurCanvas = document.createElement('canvas');
    this.wideBlurCanvas.width = quarterW;
    this.wideBlurCanvas.height = quarterH;
    const wCtx = this.wideBlurCanvas.getContext('2d');
    if (!wCtx) throw new Error('Failed to create wide-blur 2D context');
    this.wideBlurCtx = wCtx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Execute post-processing bloom pass and composite onto the main arena canvas
   */
  public apply(mainCtx: CanvasRenderingContext2D, input: NeonBloomInput) {
    if (!this.enabled) return;

    const eCtx = this.emissiveCtx;
    const tCtx = this.tightBlurCtx;
    const wCtx = this.wideBlurCtx;

    const halfW = this.emissiveCanvas.width;
    const halfH = this.emissiveCanvas.height;
    const quarterW = this.wideBlurCanvas.width;
    const quarterH = this.wideBlurCanvas.height;

    // 1. Clear & populate half-res emissive buffer using logical arena coords
    eCtx.setTransform(1, 0, 0, 1, 0, 0);
    eCtx.clearRect(0, 0, halfW, halfH);
    eCtx.setTransform(this.halfScale, 0, 0, this.halfScale, 0, 0);

    this.renderEmissiveScene(eCtx, input);

    // 2. Tight corona blur pass (half-res)
    tCtx.save();
    tCtx.setTransform(1, 0, 0, 1, 0, 0);
    tCtx.clearRect(0, 0, halfW, halfH);
    if ('filter' in tCtx) {
      tCtx.filter = 'blur(4px)';
    }
    tCtx.drawImage(this.emissiveCanvas, 0, 0, halfW, halfH);
    tCtx.restore();

    // 3. Wide atmospheric arcade halo pass (quarter-res downsample + blur)
    wCtx.save();
    wCtx.setTransform(1, 0, 0, 1, 0, 0);
    wCtx.clearRect(0, 0, quarterW, quarterH);
    if ('filter' in wCtx) {
      wCtx.filter = 'blur(7px)';
    }
    wCtx.drawImage(this.tightBlurCanvas, 0, 0, quarterW, quarterH);
    wCtx.restore();

    // 4. Additive composite back onto the main canvas
    mainCtx.save();
    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.imageSmoothingEnabled = true;

    // Tight high-energy core bloom
    mainCtx.globalAlpha = 0.48;
    mainCtx.drawImage(this.tightBlurCanvas, 0, 0, this.arenaWidth, this.arenaHeight);

    // Wide soft arcade CRT neon halo
    mainCtx.globalAlpha = 0.62;
    mainCtx.drawImage(this.wideBlurCanvas, 0, 0, this.arenaWidth, this.arenaHeight);

    mainCtx.restore();
  }

  /**
   * Draw only high-intensity emissive gameplay elements into the bloom buffer
   */
  private renderEmissiveScene(ctx: CanvasRenderingContext2D, input: NeonBloomInput) {
    const now = performance.now() * 0.005;

    // A. Exploding bricks, flashing bricks, and high-energy boss nodes
    for (const brick of input.bricks) {
      if (brick.currentHp <= 0) continue;

      if (brick.hitFlashTime > 0) {
        // Intense white-hot impact flash bloom
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(brick.x - 1, brick.y - 1, brick.width + 2, brick.height + 2, 4);
        ctx.fill();
        continue;
      }

      if (brick.type === 'explosive' || brick.isExplosive) {
        const pulse = 0.55 + 0.35 * Math.sin(now * 1.6 + brick.x * 0.05);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fill();
        ctx.restore();
      } else if (brick.isBossCore) {
        const pulse = 0.5 + 0.3 * Math.sin(now * 1.4);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fill();
        ctx.restore();
      } else if (brick.isBossCannon) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fill();
        ctx.restore();
      }
    }

    // B. Bottom energy shield barrier
    if (input.hasBottomShield) {
      ctx.save();
      const pulse = 0.7 + 0.3 * Math.sin(now);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, this.arenaHeight - 4);
      ctx.lineTo(this.arenaWidth, this.arenaHeight - 4);
      ctx.stroke();

      ctx.fillStyle = '#6ee7b7';
      for (let x = 30; x < this.arenaWidth; x += 60) {
        ctx.beginPath();
        ctx.arc(x, this.arenaHeight - 4, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // C. Falling power-up capsules
    for (const item of input.powerUpItems) {
      const bob = Math.sin(item.pulseTimer) * 2;
      const drawY = item.y + bob;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(item.x - 2, drawY - 2, item.width + 4, item.height + 4, 11);
      ctx.fill();
      ctx.restore();
    }

    // D. Active shockwave rings & high-intensity explosion particles
    input.renderParticlesEmissive(ctx);

    // E. Paddle energy rim / impact bloom
    const p = input.paddle;
    const isP2 = input.isPlayer2 || p.color === '#f43f5e';
    const paddleBloomColor = p.hitFlashTime > 0 ? '#ffffff' : isP2 ? '#fb7185' : '#38bdf8';
    ctx.save();
    ctx.globalAlpha = p.hitFlashTime > 0 ? 0.95 : 0.55;
    ctx.fillStyle = paddleBloomColor;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.width, p.hitFlashTime > 0 ? p.height : 5, 4);
    ctx.fill();
    ctx.restore();

    // F. Boss plasma projectiles & trails
    for (const proj of input.bossProjectiles) {
      ctx.save();
      for (let j = 0; j < proj.trail.length; j++) {
        const t = proj.trail[j];
        ctx.globalAlpha = t.alpha * 0.6;
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, proj.radius * (1.15 - j * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius + 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // G. Active balls & motion trails
    const isFire = input.isFireBall;
    const ballGlow = isFire ? '#f97316' : isP2 ? '#fb7185' : '#38bdf8';
    const ballCore = isFire ? '#fef08a' : '#e0f2fe';

    for (const ball of input.balls) {
      // Trail bloom
      for (let i = ball.trail.length - 1; i >= 0; i--) {
        const node = ball.trail[i];
        if (node.alpha <= 0.04) continue;
        ctx.save();
        ctx.globalAlpha = node.alpha * (isFire ? 0.85 : 0.65);
        ctx.fillStyle = ballGlow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(2, node.radius * 1.25), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Outer ball bloom halo
      ctx.save();
      ctx.globalAlpha = isFire ? 0.95 : 0.85;
      ctx.fillStyle = ballGlow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + (isFire ? 5 : 3.5), 0, Math.PI * 2);
      ctx.fill();

      // Inner hot core
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = ballCore;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
