/**
 * Ball Manager: Handles multi-ball state, serving, trajectory trails,
 * reset cycles, Fire Ball mode, and neon rendering.
 */

import { Ball, Paddle } from './types';

export class BallManager {
  private balls: Ball[] = [];
  private maxTrailLength: number = 10;
  private trailTimer: number = 0;
  private arenaWidth: number;
  private arenaHeight: number;
  private isFireBall: boolean = false;
  private isSlowMotion: boolean = false;

  constructor(arenaWidth: number, arenaHeight: number) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.balls = [this.createPrimaryBall()];
  }

  private createPrimaryBall(): Ball {
    return {
      id: 'primary-ball',
      x: this.arenaWidth / 2,
      y: this.arenaHeight - 65,
      vx: 0,
      vy: 0,
      radius: 9,
      speed: 420,
      minSpeed: 380,
      maxSpeed: 750,
      isStuckToPaddle: true,
      stuckOffset: 0,
      trail: [],
    };
  }

  public getBall(): Ball {
    return this.balls[0] || this.createPrimaryBall();
  }

  public getBalls(): Ball[] {
    return this.balls;
  }

  public getBallCount(): number {
    return this.balls.length;
  }

  /**
   * Reset to single primary ball resting on paddle
   */
  public resetToPaddle(paddle: Paddle, offset: number = 0) {
    const primary = this.createPrimaryBall();
    primary.isStuckToPaddle = true;
    primary.stuckOffset = offset;
    primary.x = paddle.x + paddle.width / 2 + offset;
    primary.y = paddle.y - primary.radius - 2;
    primary.vx = 0;
    primary.vy = 0;
    primary.trail = [];
    this.balls = [primary];
  }

  /**
   * Launch all stuck balls into play
   */
  public launch(initialAngleDeg: number = -15) {
    for (const ball of this.balls) {
      if (!ball.isStuckToPaddle) continue;

      ball.isStuckToPaddle = false;
      const speed = this.isSlowMotion ? ball.speed * 0.65 : ball.speed;
      const angleRad = (initialAngleDeg * Math.PI) / 180;

      ball.vx = speed * Math.sin(angleRad);
      ball.vy = -speed * Math.cos(angleRad);
      ball.trail = [];
    }
  }

  /**
   * Multi-Ball Power-up: clones active moving balls with angled velocity offsets
   */
  public spawnMultiBalls(countPerBall: number = 2, maxLimit: number = 6): number {
    if (this.balls.length >= maxLimit) return this.balls.length;

    const movingBalls = this.balls.filter((b) => !b.isStuckToPaddle);
    if (movingBalls.length === 0) return this.balls.length;

    const newBalls: Ball[] = [];
    const angles = [-0.42, 0.42]; // ~24 degree splits

    for (const parent of movingBalls) {
      if (this.balls.length + newBalls.length >= maxLimit) break;

      const currentSpeed = Math.hypot(parent.vx, parent.vy) || parent.speed;
      const baseAngle = Math.atan2(parent.vy, parent.vx);

      for (let i = 0; i < countPerBall; i++) {
        if (this.balls.length + newBalls.length >= maxLimit) break;

        const offsetAngle = angles[i % angles.length];
        const newAngle = baseAngle + offsetAngle;

        const clone: Ball = {
          id: `clone-ball-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          x: parent.x + Math.sin(newAngle) * 4,
          y: parent.y + Math.cos(newAngle) * 4,
          vx: currentSpeed * Math.cos(newAngle),
          vy: currentSpeed * Math.sin(newAngle),
          radius: parent.radius,
          speed: parent.speed,
          minSpeed: parent.minSpeed,
          maxSpeed: parent.maxSpeed,
          isStuckToPaddle: false,
          stuckOffset: 0,
          trail: [],
        };
        newBalls.push(clone);
      }
    }

    this.balls.push(...newBalls);
    return this.balls.length;
  }

  /**
   * Remove a ball that dropped out of bounds. Returns remaining count.
   */
  public removeBall(ball: Ball): number {
    const idx = this.balls.indexOf(ball);
    if (idx !== -1) {
      this.balls.splice(idx, 1);
    }
    return this.balls.length;
  }

  /**
   * Fire Ball mode: balls blaze through destructible bricks
   */
  public setFireBallMode(enabled: boolean) {
    this.isFireBall = enabled;
  }

  public getIsFireBall(): boolean {
    return this.isFireBall;
  }

  /**
   * Slow Motion mode
   */
  public setSlowMotion(enabled: boolean, factor: number = 0.65) {
    if (this.isSlowMotion === enabled) return;
    this.isSlowMotion = enabled;

    for (const ball of this.balls) {
      if (!ball.isStuckToPaddle) {
        const currentSpeed = Math.hypot(ball.vx, ball.vy);
        if (currentSpeed > 0) {
          const newSpeed = enabled ? currentSpeed * factor : currentSpeed / factor;
          const ratio = newSpeed / currentSpeed;
          ball.vx *= ratio;
          ball.vy *= ratio;
        }
      }
    }
  }

  /**
   * Update ball trails for all active balls
   */
  public update(dt: number) {
    this.trailTimer += dt;
    const shouldAddTrail = this.trailTimer >= 0.016;
    if (shouldAddTrail) {
      this.trailTimer = 0;
    }

    for (const ball of this.balls) {
      if (ball.isStuckToPaddle) {
        ball.trail = [];
        continue;
      }

      if (shouldAddTrail) {
        ball.trail.unshift({
          x: ball.x,
          y: ball.y,
          alpha: this.isFireBall ? 0.9 : 0.7,
          radius: ball.radius * (this.isFireBall ? 1.1 : 0.85),
        });

        if (ball.trail.length > this.maxTrailLength) {
          ball.trail.pop();
        }
      }

      // Fade trail nodes
      for (let i = 0; i < ball.trail.length; i++) {
        const node = ball.trail[i];
        node.alpha *= this.isFireBall ? 0.89 : 0.86;
        node.radius *= 0.95;
      }
    }
  }

  private colorScheme = {
    coreStart: '#ffffff',
    coreMid: '#e0f2fe',
    coreEnd: '#0284c7',
    glow: '#38bdf8',
    trail: 'rgba(56, 189, 248, 0.4)',
  };

  public setColorScheme(primaryColor: string, _glowColor: string) {
    if (primaryColor === '#f43f5e' || primaryColor === 'P2') {
      this.colorScheme = {
        coreStart: '#ffffff',
        coreMid: '#ffe4e6',
        coreEnd: '#e11d48',
        glow: '#fb7185',
        trail: 'rgba(251, 113, 133, 0.4)',
      };
    } else {
      this.colorScheme = {
        coreStart: '#ffffff',
        coreMid: '#e0f2fe',
        coreEnd: '#0284c7',
        glow: '#38bdf8',
        trail: 'rgba(56, 189, 248, 0.4)',
      };
    }
  }

  /**
   * Render all balls and dynamic trails on canvas
   */
  public render(
    ctx: CanvasRenderingContext2D,
    ballsOverride?: Ball[],
    fireBallOverride?: boolean
  ) {
    const list = ballsOverride ?? this.balls;
    for (const ball of list) {
      this.renderSingleBall(ctx, ball, fireBallOverride);
    }
  }

  private renderSingleBall(
    ctx: CanvasRenderingContext2D,
    ball: Ball,
    fireBallOverride?: boolean
  ) {
    const isFire = fireBallOverride !== undefined ? fireBallOverride : this.isFireBall;
    const trailColor = isFire ? 'rgba(249, 115, 22, 0.55)' : this.colorScheme.trail;
    const glowColor = isFire ? '#f97316' : this.colorScheme.glow;
    const coreStart = isFire ? '#fff7ed' : this.colorScheme.coreStart;
    const coreMid = isFire ? '#fed7aa' : this.colorScheme.coreMid;
    const coreEnd = isFire ? '#ea580c' : this.colorScheme.coreEnd;

    // 1. Draw trail
    for (let i = ball.trail.length - 1; i >= 0; i--) {
      const node = ball.trail[i];
      if (node.alpha <= 0.02) continue;

      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, Math.max(1, node.radius), 0, Math.PI * 2);
      ctx.fillStyle = trailColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isFire ? 12 : 8;
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw outer neon halo
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + (isFire ? 3.5 : 2), 0, Math.PI * 2);
    ctx.fillStyle = trailColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isFire ? 18 : 14;
    ctx.fill();

    // 3. Draw Core
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      1,
      ball.x,
      ball.y,
      ball.radius
    );
    gradient.addColorStop(0, coreStart);
    gradient.addColorStop(0.4, coreMid);
    gradient.addColorStop(1, coreEnd);
    ctx.fillStyle = gradient;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isFire ? 14 : 10;
    ctx.fill();
    ctx.restore();

    // 4. Draw trajectory guide if stuck to paddle
    if (ball.isStuckToPaddle) {
      this.drawAimGuide(ctx, ball);
    }
  }

  private drawAimGuide(ctx: CanvasRenderingContext2D, ball: Ball) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';

    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y - ball.radius);
    const guideLength = 65;
    const guideAngle = -Math.PI / 2 + (ball.stuckOffset / 50) * 0.3;
    const endX = ball.x + guideLength * Math.cos(guideAngle);
    const endY = ball.y + guideLength * Math.sin(guideAngle);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.restore();
  }
}
