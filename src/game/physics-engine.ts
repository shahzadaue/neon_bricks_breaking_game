/**
 * Physics Engine: Fixed-timestep physics simulation, sub-stepping to prevent tunneling,
 * velocity clamping, trajectory stabilization, wall boundary enforcement,
 * multi-ball support, Fire-Ball penetration, and Bottom-Shield energy reflection.
 */

import { Ball, Paddle, Brick, CollisionResult } from './types';
import { CollisionSystem } from './collision-system';

export interface PhysicsConfig {
  fixedTimestep: number; // e.g. 1 / 120 (approx 8.33ms) for ultra-accurate sub-stepping
  arenaWidth: number;
  arenaHeight: number;
  minSpeed: number;
  maxSpeed: number;
  minVy: number; // Minimum vertical velocity to avoid horizontal deadlocks
  paddleBounceMaxAngleDeg: number; // Max rebound angle off paddle (e.g. 68 degrees)
  paddleSpinTransfer: number; // Horizontal momentum transferred from paddle movement
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  fixedTimestep: 1 / 120,
  arenaWidth: 600,
  arenaHeight: 800,
  minSpeed: 380,
  maxSpeed: 750,
  minVy: 90,
  paddleBounceMaxAngleDeg: 68,
  paddleSpinTransfer: 0.22,
};

export interface PhysicsStepOptions {
  isFireBall?: boolean;
  hasBottomShield?: boolean;
  onBottomShieldHit?: (ball: Ball) => void;
}

export class PhysicsEngine {
  private config: PhysicsConfig;
  private accumulator: number = 0;

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  }

  public updateConfig(newConfig: Partial<PhysicsConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): PhysicsConfig {
    return this.config;
  }

  /**
   * Run fixed timestep physics steps based on accumulated delta time.
   * Supports either a single ball or an array of active balls (Multi-Ball).
   */
  public step(
    rawDt: number,
    ballOrBalls: Ball | Ball[],
    paddle: Paddle,
    bricks: Brick[],
    onBrickHit: (brick: Brick, hitResult: CollisionResult, ball: Ball) => void,
    onPaddleHit: (hitOffset: number, ball: Ball) => void,
    onWallHit: (wall: 'left' | 'right' | 'top', ball: Ball) => void,
    onBallLost: (ball: Ball) => void,
    options?: PhysicsStepOptions
  ) {
    const clampedDt = Math.min(rawDt, 0.05);
    this.accumulator += clampedDt;

    const dt = this.config.fixedTimestep;
    let stepsRun = 0;
    const maxSteps = 10;

    const ballsList = Array.isArray(ballOrBalls) ? ballOrBalls : [ballOrBalls];

    while (this.accumulator >= dt && stepsRun < maxSteps) {
      for (const b of [...ballsList]) {
        this.fixedUpdate(
          dt,
          b,
          paddle,
          bricks,
          onBrickHit,
          onPaddleHit,
          onWallHit,
          onBallLost,
          options
        );
      }
      this.accumulator -= dt;
      stepsRun++;
    }
  }

  /**
   * Internal single fixed-timestep tick for a specific ball
   */
  private fixedUpdate(
    dt: number,
    ball: Ball,
    paddle: Paddle,
    bricks: Brick[],
    onBrickHit: (brick: Brick, hitResult: CollisionResult, ball: Ball) => void,
    onPaddleHit: (hitOffset: number, ball: Ball) => void,
    onWallHit: (wall: 'left' | 'right' | 'top', ball: Ball) => void,
    onBallLost: (ball: Ball) => void,
    options?: PhysicsStepOptions
  ) {
    if (ball.isStuckToPaddle) {
      ball.x = paddle.x + paddle.width / 2 + ball.stuckOffset;
      ball.y = paddle.y - ball.radius - 2;
      ball.vx = 0;
      ball.vy = 0;
      return;
    }

    // Sub-stepping to prevent tunneling
    const speed = Math.hypot(ball.vx, ball.vy);
    const displacement = speed * dt;
    const maxStepDist = ball.radius * 0.6;
    const subSteps = Math.max(1, Math.ceil(displacement / maxStepDist));
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;

      // 1. Boundary & Shield collisions
      this.checkArenaBoundaries(ball, onWallHit, onBallLost, options);

      if (ball.isStuckToPaddle) {
        break;
      }

      // 2. Paddle collision
      this.checkPaddleCollision(ball, paddle, onPaddleHit);

      // 3. Brick collisions
      this.checkBrickCollisions(ball, bricks, onBrickHit, options?.isFireBall);
    }

    // 4. Trajectory stabilization & speed clamping
    this.stabilizeTrajectory(ball);
  }

  /**
   * Arena wall collisions: Left, Right, Top, Floor / Energy Shield
   */
  private checkArenaBoundaries(
    ball: Ball,
    onWallHit: (wall: 'left' | 'right' | 'top', ball: Ball) => void,
    onBallLost: (ball: Ball) => void,
    options?: PhysicsStepOptions
  ) {
    const { arenaWidth, arenaHeight } = this.config;

    // Left wall
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      onWallHit('left', ball);
    }
    // Right wall
    else if (ball.x + ball.radius >= arenaWidth) {
      ball.x = arenaWidth - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      onWallHit('right', ball);
    }

    // Ceiling / Top wall
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      onWallHit('top', ball);
    }
    // Bottom floor: Energy Shield Check or Ball Loss
    else if (options?.hasBottomShield && ball.y + ball.radius >= arenaHeight - 6 && ball.vy > 0) {
      ball.y = arenaHeight - 6 - ball.radius;
      ball.vy = -Math.abs(ball.vy);
      if (options.onBottomShieldHit) {
        options.onBottomShieldHit(ball);
      }
    } else if (ball.y - ball.radius > arenaHeight + 12) {
      onBallLost(ball);
    }
  }

  /**
   * Paddle collision detection and steering angle calculation
   */
  private checkPaddleCollision(
    ball: Ball,
    paddle: Paddle,
    onPaddleHit: (hitOffset: number, ball: Ball) => void
  ) {
    if (ball.vy <= 0) return;

    const hit = CollisionSystem.testCircleAABB(
      ball,
      paddle.x,
      paddle.y,
      paddle.width,
      paddle.height
    );

    if (hit.collided) {
      ball.y = paddle.y - ball.radius - 0.5;

      const paddleCenter = paddle.x + paddle.width / 2;
      const hitOffsetRaw = (ball.x - paddleCenter) / (paddle.width / 2);
      const hitOffset = Math.max(-1, Math.min(1, hitOffsetRaw));

      let currentSpeed = Math.hypot(ball.vx, ball.vy);
      currentSpeed = Math.max(this.config.minSpeed, Math.min(this.config.maxSpeed, currentSpeed));

      const maxAngleRad = (this.config.paddleBounceMaxAngleDeg * Math.PI) / 180;
      let targetAngle = hitOffset * maxAngleRad;

      const paddleSpin = (paddle.vx * this.config.paddleSpinTransfer) / currentSpeed;
      targetAngle = Math.max(-maxAngleRad * 1.05, Math.min(maxAngleRad * 1.05, targetAngle + paddleSpin));

      ball.vx = currentSpeed * Math.sin(targetAngle);
      ball.vy = -currentSpeed * Math.cos(targetAngle);

      onPaddleHit(hitOffset, ball);
    }
  }

  /**
   * Check collision with active bricks.
   * If isFireBall is active and brick is destructible, smashes through without reflection!
   */
  private checkBrickCollisions(
    ball: Ball,
    bricks: Brick[],
    onBrickHit: (brick: Brick, hitResult: CollisionResult, ball: Ball) => void,
    isFireBall: boolean = false
  ) {
    let closestBrick: Brick | null = null;
    let closestHit: CollisionResult | null = null;
    let minPenetration = -Infinity;

    for (const brick of bricks) {
      if (brick.currentHp <= 0) continue;

      const hit = CollisionSystem.testCircleAABB(
        ball,
        brick.x,
        brick.y,
        brick.width,
        brick.height
      );

      if (hit.collided) {
        if (hit.penetrationDepth > minPenetration) {
          minPenetration = hit.penetrationDepth;
          closestBrick = brick;
          closestHit = hit;
        }
      }
    }

    if (closestBrick && closestHit) {
      if (isFireBall && closestBrick.isDestructible) {
        // Fire-Ball penetrates through destructible bricks!
        onBrickHit(closestBrick, closestHit, ball);
      } else {
        // Standard physical bounce
        ball.x += closestHit.normalX * (closestHit.penetrationDepth + 0.5);
        ball.y += closestHit.normalY * (closestHit.penetrationDepth + 0.5);

        const reflected = CollisionSystem.reflectVelocity(
          ball.vx,
          ball.vy,
          closestHit.normalX,
          closestHit.normalY
        );

        ball.vx = reflected.vx;
        ball.vy = reflected.vy;

        const currentSpeed = Math.hypot(ball.vx, ball.vy);
        const boostedSpeed = Math.min(this.config.maxSpeed, currentSpeed * 1.012);
        if (currentSpeed > 0) {
          const factor = boostedSpeed / currentSpeed;
          ball.vx *= factor;
          ball.vy *= factor;
        }

        onBrickHit(closestBrick, closestHit, ball);
      }
    }
  }

  /**
   * Trajectory stabilization to prevent horizontal deadlocks and runaway speeds
   */
  private stabilizeTrajectory(ball: Ball) {
    if (ball.isStuckToPaddle) return;

    let speed = Math.hypot(ball.vx, ball.vy);
    if (speed === 0) return;

    // Minimum vertical speed prevention
    if (Math.abs(ball.vy) < this.config.minVy) {
      const signY = ball.vy >= 0 ? 1 : -1;
      ball.vy = signY * this.config.minVy;
      const targetVxSq = speed * speed - ball.vy * ball.vy;
      if (targetVxSq > 0) {
        const signX = ball.vx >= 0 ? 1 : -1;
        ball.vx = signX * Math.sqrt(targetVxSq);
      }
    }

    speed = Math.hypot(ball.vx, ball.vy);
    if (speed < this.config.minSpeed) {
      const scale = this.config.minSpeed / speed;
      ball.vx *= scale;
      ball.vy *= scale;
    } else if (speed > this.config.maxSpeed) {
      const scale = this.config.maxSpeed / speed;
      ball.vx *= scale;
      ball.vy *= scale;
    }
  }
}
