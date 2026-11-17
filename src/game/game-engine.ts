/**
 * Game Engine: Central orchestrator for the 2D Brick Breaker Game (Phase 1).
 * Coordinates physics simulation, rendering, state machine, inputs, audio, and visual FX.
 */

import {
  GameState,
  GameMetrics,
  Brick,
  Ball,
  CollisionResult,
  GameMode,
  ActivePlayer,
  PlayerScoreData,
} from './types';
import { PhysicsEngine } from './physics-engine';
import { PaddleController } from './paddle-controller';
import { BallManager } from './ball-manager';
import { BrickManager } from './brick-manager';
import { AudioManager } from './audio-manager';
import { ParticleSystem } from './particle-system';
import { DailyMissionsManager } from './daily-missions-manager';
import { StageProgressionManager } from './stage-progression-manager';
import { PowerUpManager } from './power-up-manager';
import { Starfield } from './starfield';
import { BossManager } from './boss-manager';
import { BossProjectile } from './types';
import { BackgroundManager } from './background-manager';
import { BackgroundRenderer } from './background-renderer';
import { ReplayManager, ReplayRecordInput } from './replay-manager';
import { NeonBloomLayer } from './neon-bloom-layer';
import { ChromaticAberrationLayer } from './chromatic-aberration-layer';

export class GameEngine {
  // Arena logical coordinate system
  public readonly ARENA_WIDTH = 600;
  public readonly ARENA_HEIGHT = 800;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Subsystems
  private physics: PhysicsEngine;
  private paddleCtrl: PaddleController;
  private ballMgr: BallManager;
  private brickMgr: BrickManager;
  private audio: AudioManager;
  private particles: ParticleSystem;
  private missionsMgr: DailyMissionsManager;
  private progressionMgr: StageProgressionManager;
  private powerUpMgr: PowerUpManager;
  private starfield: Starfield;
  private bossMgr: BossManager;
  private backgroundMgr: BackgroundManager;
  private backgroundRenderer: BackgroundRenderer;
  private replayMgr: ReplayManager;
  private bloomLayer: NeonBloomLayer;
  private chromaticAberration: ChromaticAberrationLayer;

  // Game state
  private state: GameState = 'TITLE';
  private returnStateAfterReplay: GameState = 'VICTORY';
  private score: number = 0;
  private highScore: number = 0;
  private lives: number = 3;
  private maxLives: number = 3;
  private combo: number = 0;
  private maxCombo: number = 0;
  private level: number = 1;

  // 2-Player Competition Mode state
  private gameMode: GameMode = 'SOLO';
  private activePlayer: ActivePlayer = 1;
  private p1Data: PlayerScoreData = { score: 0, maxCombo: 0, bricksCleared: 0, completed: false };
  private p2Data: PlayerScoreData = { score: 0, maxCombo: 0, bricksCleared: 0, completed: false };
  private vsWinner?: 'P1' | 'P2' | 'TIE';

  // Loop & performance
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private fps: number = 60;
  private fpsTimer: number = 0;
  private frameCount: number = 0;

  // Screen shake
  private shakeTime: number = 0;
  private shakeMagnitude: number = 0;

  // Event listener callback for HUD updates
  private onMetricsUpdate?: (metrics: GameMetrics) => void;

  constructor(canvas: HTMLCanvasElement, onMetricsUpdate?: (metrics: GameMetrics) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D context could not be acquired');
    }
    this.ctx = context;
    this.onMetricsUpdate = onMetricsUpdate;

    // Load high score
    try {
      const savedHigh = localStorage.getItem('neon_breakout_highscore');
      if (savedHigh) {
        this.highScore = parseInt(savedHigh, 10) || 0;
      }
    } catch {}

    // Initialize subsystems
    this.physics = new PhysicsEngine({
      arenaWidth: this.ARENA_WIDTH,
      arenaHeight: this.ARENA_HEIGHT,
    });
    this.paddleCtrl = new PaddleController(this.ARENA_WIDTH, this.ARENA_HEIGHT);
    this.ballMgr = new BallManager(this.ARENA_WIDTH, this.ARENA_HEIGHT);
    this.brickMgr = new BrickManager(this.ARENA_WIDTH, this.ARENA_HEIGHT);
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.missionsMgr = DailyMissionsManager.getInstance();
    this.progressionMgr = StageProgressionManager.getInstance();
    this.starfield = new Starfield(this.ARENA_WIDTH, this.ARENA_HEIGHT);
    this.bossMgr = new BossManager(this.ARENA_WIDTH, this.ARENA_HEIGHT, this.audio, this.particles);
    this.backgroundMgr = BackgroundManager.getInstance();
    this.backgroundRenderer = new BackgroundRenderer(
      this.ARENA_WIDTH,
      this.ARENA_HEIGHT,
      this.backgroundMgr.getCurrentBackground().backgroundId
    );
    this.backgroundMgr.subscribe((bgState) => {
      this.backgroundRenderer.setBackground(bgState.currentBackground);
    });
    this.replayMgr = new ReplayManager();
    this.bloomLayer = new NeonBloomLayer(this.ARENA_WIDTH, this.ARENA_HEIGHT);
    this.chromaticAberration = new ChromaticAberrationLayer(this.ARENA_WIDTH, this.ARENA_HEIGHT);
    try {
      const savedBloom = localStorage.getItem('neon_breakout_bloom');
      if (savedBloom !== null) {
        this.bloomLayer.setEnabled(savedBloom === 'true');
      }
    } catch {}

    this.powerUpMgr = new PowerUpManager(
      this.ARENA_WIDTH,
      this.ARENA_HEIGHT,
      this.audio,
      this.particles,
      {
        onMultiBall: () => {
          this.ballMgr.spawnMultiBalls(2, 6);
        },
        onExpandPaddle: (active: boolean) => {
          this.paddleCtrl.setExpanded(active);
        },
        onSlowMotion: (active: boolean) => {
          this.ballMgr.setSlowMotion(active);
        },
        onFireBall: (active: boolean) => {
          this.ballMgr.setFireBallMode(active);
        },
        onShieldChange: (_active: boolean) => {
          // Handled inside PowerUpManager render and physics
        },
        onBonusCoins: (coins: number) => {
          this.addScore(coins * 10);
        },
        onCollect: (item, paddle) => {
          this.replayMgr.queueEvent({
            type: 'POWERUP_COLLECT',
            x: paddle.x + paddle.width / 2,
            y: paddle.y,
            label: item.label,
            color: item.color,
          });
        },
      }
    );

    // Link canvas to paddle controller for mouse and touch inputs
    this.paddleCtrl.setCanvas(this.canvas);

    // Initial resize setup
    this.setupCanvasDimensions();

    // Click on canvas to launch ball or resume
    this.canvas.addEventListener('click', this.handleCanvasClick);

    // Keyboard listener for Space/Launch and Esc/Pause
    window.addEventListener('keydown', this.handleGlobalKeyDown);

    // Push initial metrics
    this.emitMetrics();
  }

  /**
   * Setup sharp retina resolution while maintaining fixed virtual coordinate space
   */
  public setupCanvasDimensions() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for mobile performance
    this.canvas.width = this.ARENA_WIDTH * dpr;
    this.canvas.height = this.ARENA_HEIGHT * dpr;

    // Scale context so drawing uses logical coordinates 0..600 and 0..800
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    this.ctx.scale(dpr, dpr);
  }

  public start() {
    if (this.animationFrameId === null) {
      this.lastTimestamp = performance.now();
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main game loop running at display refresh rate
   */
  private gameLoop = (timestamp: number) => {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // Clamp dt to avoid huge steps after backgrounding tab
    const dt = Math.min(rawDt, 0.05);

    // Calculate FPS
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round((this.frameCount / this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // 1. Update Simulation
    this.update(dt);

    // 2. Render Canvas
    this.render();

    // 3. Emit metrics for React HUD
    this.emitMetrics();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  /**
   * Update all active subsystems
   */
  private update(dt: number) {
    // Screen shake decay
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }

    if (this.state === 'REPLAY') {
      const replaySpeed = this.replayMgr.getReplayInfo().speed;
      this.backgroundRenderer.update(dt * 0.45 * replaySpeed, this.ARENA_WIDTH / 2, 0);
      this.starfield.update(dt * 0.45 * replaySpeed, this.ARENA_WIDTH / 2, 0);
      this.replayMgr.updatePlayback(dt, this.audio);
      const replayFrame = this.replayMgr.getCurrentFrame();
      this.chromaticAberration.update(dt, replayFrame ? replayFrame.combo : 0);
      return;
    }

    // Update particles, bricks, and screen-space chromatic edge pulse
    this.particles.update(dt);
    this.brickMgr.update(dt);
    this.chromaticAberration.update(dt, this.state === 'PLAYING' ? this.combo : 0);

    if (this.state === 'PAUSED') {
      return;
    }

    // Paddle always moves in TITLE, READY, PLAYING
    this.paddleCtrl.update(dt);
    const paddle = this.paddleCtrl.getPaddle();

    // Parallax background environment & starfield follow paddle horizontal position and velocity
    this.backgroundRenderer.update(dt, paddle.x + paddle.width / 2, paddle.vx);
    this.starfield.update(dt, paddle.x + paddle.width / 2, paddle.vx);

    // Ball manager updates trail
    this.ballMgr.update(dt);
    const ball = this.ballMgr.getBall();

    if (this.state === 'READY') {
      // Ball is attached to paddle
      ball.x = paddle.x + paddle.width / 2 + ball.stuckOffset;
      ball.y = paddle.y - ball.radius - 2;
    } else if (this.state === 'PLAYING') {
      // Update falling power-ups and active buff countdowns
      this.powerUpMgr.update(dt, paddle);

      // Update boss movement, targeting lasers, and projectiles
      this.bossMgr.update(
        dt,
        paddle,
        this.brickMgr.getBricks(),
        (projectile) => {
          this.handleBossPaddleHit(projectile);
        },
        () => {
          this.handleStageVictory();
        }
      );

      // Step fixed physics across all active balls
      this.physics.step(
        dt,
        this.ballMgr.getBalls(),
        paddle,
        this.brickMgr.getBricks(),
        this.handleBrickHit,
        this.handlePaddleHit,
        this.handleWallHit,
        this.handleBallLost,
        {
          isFireBall: this.powerUpMgr.isFireBallActive(),
          hasBottomShield: this.powerUpMgr.hasBottomShieldActive(),
          onBottomShieldHit: () => {
            if (this.powerUpMgr.consumeBottomShield()) {
              this.replayMgr.queueEvent({
                type: 'SHIELD_DEFLECT',
                arenaWidth: this.ARENA_WIDTH,
                arenaHeight: this.ARENA_HEIGHT,
              });
            }
          },
        }
      );

      // Capture frame into rolling 10-second replay ring buffer if still playing
      if (this.state === 'PLAYING') {
        this.replayMgr.recordFrame(dt, this.buildReplaySnapshot());
      }
    } else if (this.state === 'TITLE') {
      // Attract mode: ball floats gently above paddle
      const time = performance.now() * 0.003;
      ball.x = this.ARENA_WIDTH / 2 + Math.sin(time) * 120;
      ball.y = this.ARENA_HEIGHT - 120 + Math.cos(time * 2) * 20;
      paddle.targetX = ball.x - paddle.width / 2;
    }
  }

  /**
   * Render frame
   */
  private render() {
    this.ctx.save();

    // Apply screen shake if active
    if (this.shakeTime > 0) {
      const currentMag = this.shakeMagnitude * (this.shakeTime / 0.15);
      const offsetX = (Math.random() - 0.5) * currentMag * 2;
      const offsetY = (Math.random() - 0.5) * currentMag * 2;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Draw arena background
    this.drawBackground();

    if (this.state === 'REPLAY') {
      const frame = this.replayMgr.getCurrentFrame();
      if (frame) {
        const replayBricks = this.replayMgr.getReconstructedBricks(frame);
        const replayBalls = this.replayMgr.getReconstructedBalls(frame);
        this.brickMgr.render(this.ctx, replayBricks);
        this.powerUpMgr.render(
          this.ctx,
          frame.powerUpItems,
          frame.hasBottomShield,
          frame.activePowerUps
        );
        this.replayMgr.renderReplayParticles(this.ctx);
        this.drawPaddle(frame.paddle);
        this.bossMgr.renderReplayOverlay(this.ctx, frame.bossProjectiles, frame.bossInfo);
        this.ballMgr.render(this.ctx, replayBalls, frame.isFireBall);

        // Post-processing Neon Bloom pass on replay frame
        this.bloomLayer.apply(this.ctx, {
          balls: replayBalls,
          isFireBall: frame.isFireBall,
          isPlayer2: frame.paddle.color === '#f43f5e',
          paddle: frame.paddle,
          bricks: replayBricks,
          powerUpItems: frame.powerUpItems,
          hasBottomShield: frame.hasBottomShield,
          bossProjectiles: frame.bossProjectiles,
          renderParticlesEmissive: (bCtx) => this.replayMgr.renderReplayParticlesEmissive(bCtx),
        });

        // Screen-space chromatic aberration edge pulse scaled by replay combo
        this.chromaticAberration.apply(this.ctx, this.canvas, frame.combo);
      }
      this.drawReplayBadge();
      this.ctx.restore();
      return;
    }

    // 2. Draw bricks
    this.brickMgr.render(this.ctx);

    // 3. Draw falling power-ups and energy shield
    this.powerUpMgr.render(this.ctx);

    // 4. Draw particles and floating text
    this.particles.render(this.ctx);

    // 5. Draw paddle
    this.drawPaddle();

    // 6. Draw boss targeting lasers, projectiles, and boss health bar
    this.bossMgr.render(this.ctx, this.paddleCtrl.getPaddle());

    // 7. Draw active balls
    this.ballMgr.render(this.ctx);

    // 8. Post-processing Neon Bloom pass around balls, power-ups, explosions & flashes
    this.bloomLayer.apply(this.ctx, {
      balls: this.ballMgr.getBalls(),
      isFireBall: this.ballMgr.getIsFireBall(),
      isPlayer2: this.gameMode === 'VS_2P' && this.activePlayer === 2,
      paddle: this.paddleCtrl.getPaddle(),
      bricks: this.brickMgr.getBricks(),
      powerUpItems: this.powerUpMgr.getItems(),
      hasBottomShield: this.powerUpMgr.hasBottomShieldActive(),
      bossProjectiles: this.bossMgr.getProjectiles(),
      renderParticlesEmissive: (bCtx) => this.particles.renderEmissive(bCtx),
    });

    // 9. Screen-space chromatic aberration edge pulse intensifying with combo multiplier
    if (this.state === 'PLAYING') {
      this.chromaticAberration.apply(this.ctx, this.canvas, this.combo);
    }

    // 10. Draw overlay prompts when not in PLAYING
    if (this.state === 'READY') {
      this.drawLaunchPrompt();
    }

    this.ctx.restore();
  }

  private drawBackground() {
    // 1. Render rich 400-environment multi-layer canvas world with gameplay contrast veil
    this.backgroundRenderer.render(this.ctx);

    // Subtle arena grid
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.035)';
    this.ctx.lineWidth = 1;

    const gridSize = 30;
    for (let x = 0; x < this.ARENA_WIDTH; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.ARENA_HEIGHT);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.ARENA_HEIGHT; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.ARENA_WIDTH, y);
      this.ctx.stroke();
    }

    // Side boundary neon stripes
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(1, 0);
    this.ctx.lineTo(1, this.ARENA_HEIGHT);
    this.ctx.moveTo(this.ARENA_WIDTH - 1, 0);
    this.ctx.lineTo(this.ARENA_WIDTH - 1, this.ARENA_HEIGHT);
    this.ctx.stroke();

    // Ceiling glow line
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 1);
    this.ctx.lineTo(this.ARENA_WIDTH, 1);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawPaddle(paddleOverride?: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    glowColor: string;
    hitFlashTime: number;
  }) {
    const p = paddleOverride ?? this.paddleCtrl.getPaddle();

    this.ctx.save();
    this.ctx.shadowColor = p.glowColor;
    this.ctx.shadowBlur = 12;

    const radius = 6;
    this.ctx.beginPath();
    this.ctx.roundRect(p.x, p.y, p.width, p.height, radius);

    if (p.hitFlashTime > 0) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
    } else {
      // Sleek neon paddle gradient based on active player
      const grad = this.ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      if (p.color === '#f43f5e' || (this.gameMode === 'VS_2P' && this.activePlayer === 2 && !paddleOverride)) {
        grad.addColorStop(0, '#fb7185');
        grad.addColorStop(0.5, '#e11d48');
        grad.addColorStop(1, '#9f1239');
      } else {
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#0284c7');
        grad.addColorStop(1, '#0369a1');
      }
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Top edge highlight line
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x + 4, p.y + 1);
      this.ctx.lineTo(p.x + p.width - 4, p.y + 1);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawReplayBadge() {
    const info = this.replayMgr.getReplayInfo();
    this.ctx.save();
    const x = this.ARENA_WIDTH / 2;
    const y = 20;
    const text = `● 10s REPLAY · ${info.speed}x`;
    this.ctx.font = 'bold 11px JetBrains Mono, monospace';
    const w = this.ctx.measureText(text).width + 22;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - w / 2, y - 11, w, 22, 11);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#fda4af';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y + 0.5);
    this.ctx.restore();
  }

  private drawLaunchPrompt() {
    this.ctx.save();
    this.ctx.font = '600 13px Outfit, sans-serif';
    this.ctx.textAlign = 'center';

    if (this.gameMode === 'VS_2P') {
      const isP2 = this.activePlayer === 2;
      this.ctx.fillStyle = isP2 ? '#fb7185' : '#38bdf8';
      this.ctx.fillText(
        `PLAYER ${this.activePlayer} TURN · TAP OR SPACE TO LAUNCH`,
        this.ARENA_WIDTH / 2,
        this.ARENA_HEIGHT - 120
      );
    } else {
      this.ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      this.ctx.fillText('CLICK, TAP OR PRESS SPACE TO LAUNCH', this.ARENA_WIDTH / 2, this.ARENA_HEIGHT - 120);
    }
    this.ctx.restore();
  }

  /**
   * Collision Callbacks
   */
  private handlePaddleHit = (hitOffset: number, ball?: Ball) => {
    this.combo = 0; // Reset brick combo on paddle touch
    this.paddleCtrl.triggerHitFlash();
    this.audio.playPaddleHit(hitOffset);
    this.missionsMgr.trackPaddleBounce();

    const activeBall = ball || this.ballMgr.getBall();
    const sparkY = activeBall.y + activeBall.radius;
    this.particles.spawnPaddleSparks(activeBall.x, sparkY, hitOffset);
    this.replayMgr.queueEvent({
      type: 'PADDLE_HIT',
      x: activeBall.x,
      y: sparkY,
      hitOffset,
    });
  };

  private handleBrickHit = (brick: Brick, hit: CollisionResult, _ball?: Ball) => {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.missionsMgr.trackCombo(this.combo);
    this.chromaticAberration.triggerPulse(this.combo);

    const { isDestroyed, pointsAwarded, chainDestroyed } = this.brickMgr.damageBrick(brick);

    // Score with combo bonus
    const comboMultiplier = Math.min(this.combo, 8);
    const finalPoints = pointsAwarded * comboMultiplier;
    this.addScore(finalPoints);
    this.missionsMgr.trackScore(finalPoints);

    // Handle chain-reaction explosive bricks
    if (chainDestroyed && chainDestroyed.length > 0) {
      for (const cb of chainDestroyed) {
        this.powerUpMgr.handleBrickDestroyed(cb);
        this.missionsMgr.trackBricksDestroyed(1);
        this.audio.playBrickDestroy(this.combo);
        this.addScore(cb.points * comboMultiplier);
        this.particles.spawnBrickDestructionBurst(cb);
        const blastText = `+${cb.points} 💥 BLAST`;
        this.particles.spawnFloatingText(
          cb.x + cb.width / 2,
          cb.y,
          blastText,
          cb.color || '#f97316'
        );
        const cbIdx = this.replayMgr.getBrickIndex(cb.id);
        if (cbIdx >= 0) {
          this.replayMgr.queueEvent({
            type: 'BRICK_DESTROY',
            brickIdx: cbIdx,
            impactX: cb.x + cb.width / 2,
            impactY: cb.y + cb.height / 2,
            text: blastText,
            color: cb.color || '#f97316',
            isChainBlast: true,
            combo: this.combo,
          });
        }
      }
    }

    const brickIdx = this.replayMgr.getBrickIndex(brick.id);

    if (isDestroyed) {
      this.powerUpMgr.handleBrickDestroyed(brick);
      this.missionsMgr.trackBricksDestroyed(1);
      this.audio.playBrickDestroy(this.combo);
      this.triggerScreenShake(
        brick.type === 'explosive' || brick.isExplosive || brick.type === 'armored' ? 9 : 7,
        0.16
      );

      // Determine exact impact coordinates from collision contact point
      const impactX = hit && hit.contactPointX > 0 ? hit.contactPointX : brick.x + brick.width / 2;
      const impactY = hit && hit.contactPointY > 0 ? hit.contactPointY : brick.y + brick.height / 2;

      // Trigger particle burst animation matching the destroyed brick's type & color
      this.particles.spawnBrickDestructionBurst(brick, impactX, impactY);

      this.particles.spawnFloatingText(
        brick.x + brick.width / 2,
        brick.y,
        `+${finalPoints}`,
        brick.color
      );

      if (brickIdx >= 0) {
        this.replayMgr.queueEvent({
          type: 'BRICK_DESTROY',
          brickIdx,
          impactX,
          impactY,
          text: `+${finalPoints}`,
          color: brick.color,
          combo: this.combo,
        });
      }

      // Check victory
      if (this.brickMgr.getRemainingDestructibleCount() === 0) {
        this.handleStageVictory();
      }
    } else {
      this.audio.playBrickHit(this.combo);
      this.particles.spawnBrickHitSparks(brick, hit.contactPointX, hit.contactPointY);
      if (finalPoints > 0) {
        this.particles.spawnFloatingText(
          brick.x + brick.width / 2,
          brick.y,
          `+${finalPoints}`,
          '#94a3b8'
        );
      }
      if (brickIdx >= 0) {
        this.replayMgr.queueEvent({
          type: 'BRICK_HIT',
          brickIdx,
          impactX: hit.contactPointX,
          impactY: hit.contactPointY,
          text: finalPoints > 0 ? `+${finalPoints}` : undefined,
          combo: this.combo,
        });
      }
    }
  };

  private handleWallHit = (_wall: 'left' | 'right' | 'top', _ball?: Ball) => {
    this.audio.playWallHit();
    this.replayMgr.queueEvent({ type: 'WALL_HIT' });
  };

  private handleBallLost = (lostBall?: Ball) => {
    if (lostBall) {
      const remainingCount = this.ballMgr.removeBall(lostBall);
      if (remainingCount > 0) {
        // Multi-ball is active! Game continues without losing life
        return;
      }
    }

    // All balls lost: clear power-ups
    this.powerUpMgr.reset();
    this.audio.playBallLost();
    this.replayMgr.queueEvent({ type: 'BALL_LOST' });
    this.triggerScreenShake(12, 0.25);
    this.lives--;
    this.combo = 0;

    if (this.lives <= 0) {
      this.replayMgr.finalizeRecording(this.buildReplaySnapshot());
      if (this.gameMode === 'VS_2P') {
        if (this.activePlayer === 1) {
          // Player 1 finished their round
          this.p1Data = {
            score: this.score,
            maxCombo: this.maxCombo,
            bricksCleared: this.brickMgr.getTotalDestructibleCount() - this.brickMgr.getRemainingDestructibleCount(),
            completed: false,
          };
          this.state = 'VS_INTERSTITIAL';
        } else {
          // Player 2 finished their round -> resolve match winner!
          this.p2Data = {
            score: this.score,
            maxCombo: this.maxCombo,
            bricksCleared: this.brickMgr.getTotalDestructibleCount() - this.brickMgr.getRemainingDestructibleCount(),
            completed: false,
          };
          this.resolveVersusMatch();
        }
      } else {
        this.state = 'GAMEOVER';
        this.audio.playStateTransition('GAMEOVER');
      }
    } else {
      // Reset ball onto paddle
      this.state = 'READY';
      this.ballMgr.resetToPaddle(this.paddleCtrl.getPaddle());
    }
  };

  private handleStageVictory = () => {
    this.audio.playVictory();
    this.replayMgr.queueEvent({ type: 'VICTORY_BURST' });
    this.replayMgr.finalizeRecording(this.buildReplaySnapshot());
    // Confetti particles
    for (let i = 0; i < 4; i++) {
      this.particles.spawnBrickBurst(
        100 + i * 130,
        180,
        ['#06b6d4', '#10b981', '#f59e0b', '#ec4899'][i],
        28,
        true
      );
    }

    // Calculate 1-3 star performance rating based on lives preserved
    const starsEarned = this.lives >= this.maxLives ? 3 : this.lives >= this.maxLives - 1 ? 2 : 1;
    this.progressionMgr.recordStageCompleted(this.level, starsEarned);

    if (this.gameMode === 'VS_2P') {
      if (this.activePlayer === 1) {
        this.p1Data = {
          score: this.score,
          maxCombo: this.maxCombo,
          bricksCleared: this.brickMgr.getTotalDestructibleCount(),
          completed: true,
        };
        this.state = 'VS_INTERSTITIAL';
      } else {
        this.p2Data = {
          score: this.score,
          maxCombo: this.maxCombo,
          bricksCleared: this.brickMgr.getTotalDestructibleCount(),
          completed: true,
        };
        this.resolveVersusMatch();
      }
    } else {
      this.state = 'VICTORY';
      this.missionsMgr.trackStageCleared();
    }
  };

  private resolveVersusMatch() {
    this.replayMgr.finalizeRecording(this.buildReplaySnapshot());
    this.missionsMgr.trackVersusRound();
    if (this.p1Data.score > this.p2Data.score) {
      this.vsWinner = 'P1';
    } else if (this.p2Data.score > this.p1Data.score) {
      this.vsWinner = 'P2';
    } else {
      this.vsWinner = 'TIE';
    }
    this.state = 'VS_MATCH_OVER';
    this.audio.playVictory();

    // Spawn massive celebratory firework bursts
    for (let i = 0; i < 6; i++) {
      this.particles.spawnBrickBurst(
        60 + i * 95,
        150 + (i % 2) * 50,
        this.vsWinner === 'P2' ? '#f43f5e' : '#06b6d4',
        32,
        true
      );
    }
  }

  private triggerScreenShake(magnitude: number, duration: number) {
    this.shakeMagnitude = magnitude;
    this.shakeTime = duration;
  }

  private addScore(amount: number) {
    this.score += amount;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('neon_breakout_highscore', String(this.highScore));
      } catch {}
    }
  }

  /**
   * Public Action API for UI and Controls
   */
  public launchBall() {
    if (this.state === 'READY') {
      this.state = 'PLAYING';
      this.audio.playLaunch();
      this.ballMgr.launch();
    } else if (this.state === 'TITLE') {
      this.startPlay();
    }
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
  }

  public startPlay(levelNumber: number = 1, mode: GameMode = this.gameMode) {
    this.level = Math.max(1, Math.min(1000, levelNumber));
    this.gameMode = mode;
    this.activePlayer = 1;
    this.p1Data = { score: 0, maxCombo: 0, bricksCleared: 0, completed: false };
    this.p2Data = { score: 0, maxCombo: 0, bricksCleared: 0, completed: false };
    this.vsWinner = undefined;

    this.state = 'READY';
    this.lives = this.maxLives;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.particles.clear();
    this.powerUpMgr.reset();
    this.paddleCtrl.setExpanded(false);
    this.ballMgr.setFireBallMode(false);
    this.ballMgr.setSlowMotion(false);

    const lvlData = this.brickMgr.loadLevel(this.level);
    this.starfield.setLevel(this.level, lvlData.chapter.chapterIndex, lvlData.chapter.themeHue);
    this.backgroundMgr.onLevelChanged(this.level);
    this.bossMgr.initBoss(this.level, this.brickMgr.getBricks());
    const diff = lvlData.difficultyProfile;
    this.physics.updateConfig({
      minSpeed: diff.ballMinSpeed,
      maxSpeed: diff.ballMaxSpeed,
    });
    this.paddleCtrl.setDifficultyParameters(
      diff.paddleSpeed,
      diff.paddleAcceleration,
      diff.paddleWidth
    );

    // Color theme according to Player 1
    this.paddleCtrl.setColor('#06b6d4', 'rgba(6, 182, 212, 0.65)');
    this.ballMgr.setColorScheme('P1', '#38bdf8');
    this.paddleCtrl.reset();
    this.ballMgr.resetToPaddle(this.paddleCtrl.getPaddle());
    this.replayMgr.initStage(this.level, this.brickMgr.getBricks());
    this.chromaticAberration.reset();
  }

  public startPlayer2Turn() {
    this.activePlayer = 2;
    this.state = 'READY';
    this.lives = this.maxLives;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.particles.clear();
    this.powerUpMgr.reset();
    this.paddleCtrl.setExpanded(false);
    this.ballMgr.setFireBallMode(false);
    this.ballMgr.setSlowMotion(false);

    // Reload the identical level layout for equal competition
    const lvlData = this.brickMgr.loadLevel(this.level);
    this.starfield.setLevel(this.level, lvlData.chapter.chapterIndex, lvlData.chapter.themeHue);
    this.bossMgr.initBoss(this.level, this.brickMgr.getBricks());
    const diff = lvlData.difficultyProfile;
    this.physics.updateConfig({
      minSpeed: diff.ballMinSpeed,
      maxSpeed: diff.ballMaxSpeed,
    });
    this.paddleCtrl.setDifficultyParameters(
      diff.paddleSpeed,
      diff.paddleAcceleration,
      diff.paddleWidth
    );

    // Color theme according to Player 2
    this.paddleCtrl.setColor('#f43f5e', 'rgba(244, 63, 94, 0.65)');
    this.ballMgr.setColorScheme('P2', '#fb7185');
    this.paddleCtrl.reset();
    this.ballMgr.resetToPaddle(this.paddleCtrl.getPaddle());
    this.replayMgr.initStage(this.level, this.brickMgr.getBricks());
    this.chromaticAberration.reset();
  }

  public nextLevel() {
    const nextCandidate = this.level >= 1000 ? 1 : this.level + 1;
    if (this.progressionMgr.isStageUnlocked(nextCandidate)) {
      this.level = nextCandidate;
    } else {
      // If next stage in this chapter is locked (or chapter complete),
      // allow moving to the start of the next chapter (any chapter's start is unlocked)
      const nextChapter = StageProgressionManager.getChapterForStage(this.level) + 1;
      if (nextChapter <= 100) {
        this.level = StageProgressionManager.getStartStageForChapter(nextChapter);
      }
    }
    this.startPlay(this.level, this.gameMode);
  }

  public selectLevel(targetLevel: number): boolean {
    const clamped = Math.max(1, Math.min(1000, targetLevel));
    if (!this.progressionMgr.isStageUnlocked(clamped)) {
      return false; // Stage is locked, cannot jump to it
    }
    this.level = clamped;
    this.startPlay(this.level, this.gameMode);
    return true;
  }

  public restart() {
    this.startPlay(this.level, this.gameMode);
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.audio.playStateTransition('PAUSE');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.audio.playStateTransition('RESUME');
    }
  }

  public toggleMute(): boolean {
    return this.audio.toggleMute();
  }

  public toggleBloom(): boolean {
    const next = !this.bloomLayer.isEnabled();
    this.bloomLayer.setEnabled(next);
    try {
      localStorage.setItem('neon_breakout_bloom', String(next));
    } catch {}
    return next;
  }

  public getState(): GameState {
    return this.state;
  }

  public startReplay() {
    if (!this.replayMgr.hasReplay()) return;
    if (this.state !== 'REPLAY') {
      this.returnStateAfterReplay = this.state;
    }
    this.replayMgr.startReplay();
    this.state = 'REPLAY';
  }

  public exitReplay() {
    if (this.state !== 'REPLAY') return;
    this.state = this.returnStateAfterReplay;
  }

  public toggleReplayPlayPause() {
    if (this.state !== 'REPLAY') return;
    this.replayMgr.togglePlayPause();
  }

  public restartReplay() {
    if (this.state !== 'REPLAY') return;
    this.replayMgr.restartReplay();
  }

  public setReplaySpeed(speed: number) {
    this.replayMgr.setSpeed(speed);
  }

  public seekReplay(timeSeconds: number) {
    if (this.state !== 'REPLAY') return;
    this.replayMgr.seekTo(timeSeconds);
  }

  private buildReplaySnapshot(): ReplayRecordInput {
    return {
      paddle: this.paddleCtrl.getPaddle(),
      balls: this.ballMgr.getBalls(),
      isFireBall: this.ballMgr.getIsFireBall(),
      bricks: this.brickMgr.getBricks(),
      powerUpItems: this.powerUpMgr.getItems(),
      activePowerUps: this.powerUpMgr.getActivePowerUps(),
      hasBottomShield: this.powerUpMgr.hasBottomShieldActive(),
      bossProjectiles: this.bossMgr.getProjectiles(),
      bossInfo: this.bossMgr.getBossInfo(),
      score: this.score,
      combo: this.combo,
      lives: this.lives,
    };
  }

  public getMetrics(): GameMetrics {
    const lvlData = this.brickMgr.getCurrentLevelData();
    const replayFrame = this.state === 'REPLAY' ? this.replayMgr.getCurrentFrame() : null;
    return {
      fps: this.fps,
      score: replayFrame ? replayFrame.score : this.score,
      highScore: this.highScore,
      lives: replayFrame ? replayFrame.lives : this.lives,
      maxLives: this.maxLives,
      combo: replayFrame ? replayFrame.combo : this.combo,
      maxCombo: this.maxCombo,
      remainingBricks: this.brickMgr.getRemainingDestructibleCount(),
      totalBricks: this.brickMgr.getTotalDestructibleCount(),
      level: this.level,
      levelTitle: lvlData?.title || `Level ${this.level}`,
      chapterName: lvlData?.chapter.chapterName || 'Neon Genesis',
      themeHue: lvlData?.chapter.themeHue || '#06b6d4',
      state: this.state,
      isMuted: this.audio.getIsMuted(),
      gameMode: this.gameMode,
      activePlayer: this.activePlayer,
      p1Data: this.p1Data,
      p2Data: this.p2Data,
      vsWinner: this.vsWinner,
      activePowerUps: replayFrame ? replayFrame.activePowerUps : this.powerUpMgr.getActivePowerUps(),
      bossInfo: replayFrame ? replayFrame.bossInfo : this.bossMgr.getBossInfo(),
      replayInfo: this.replayMgr.getReplayInfo(),
      bloomEnabled: this.bloomLayer.isEnabled(),
    };
  }

  private handleBossPaddleHit(projectile: BossProjectile) {
    if (this.powerUpMgr.hasBottomShieldActive()) {
      this.powerUpMgr.consumeBottomShield();
      const p = this.paddleCtrl.getPaddle();
      this.particles.spawnFloatingText(p.x + p.width / 2, p.y - 20, 'SHIELD DEFLECTED!', '#10b981');
      this.replayMgr.queueEvent({
        type: 'BOSS_HIT_PADDLE',
        x: projectile.x,
        y: projectile.y,
        color: projectile.color,
        shielded: true,
      });
      return;
    }

    this.paddleCtrl.triggerHitFlash();
    this.triggerScreenShake(12, 0.25);
    this.combo = 0;
    this.lives--;
    this.audio.playPaddleHitByBoss();
    this.replayMgr.queueEvent({
      type: 'BOSS_HIT_PADDLE',
      x: projectile.x,
      y: projectile.y,
      color: projectile.color,
      shielded: false,
    });

    const p = this.paddleCtrl.getPaddle();
    this.particles.spawnFloatingText(p.x + p.width / 2, p.y - 25, 'PADDLE HIT! -1 LIFE', '#f43f5e');

    if (this.lives <= 0) {
      this.handleBallLost();
    }
  }

  public getPowerUpManager(): PowerUpManager {
    return this.powerUpMgr;
  }

  public getMissionsManager(): DailyMissionsManager {
    return this.missionsMgr;
  }

  public getAudio() {
    return this.audio;
  }

  public getProgressionManager(): StageProgressionManager {
    return this.progressionMgr;
  }

  private emitMetrics() {
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.getMetrics());
    }
  }

  private handleCanvasClick = () => {
    if (this.state === 'READY') {
      this.launchBall();
    } else if (this.state === 'TITLE') {
      this.startPlay();
    }
  };

  private handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.state === 'REPLAY') {
        this.toggleReplayPlayPause();
      } else if (this.state === 'READY' || this.state === 'TITLE') {
        this.launchBall();
      }
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (this.state === 'REPLAY') {
        this.exitReplay();
      } else {
        this.togglePause();
      }
    }
  };

  public getBackgroundManager(): BackgroundManager {
    return this.backgroundMgr;
  }

  public cleanup() {
    this.stop();
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
    this.paddleCtrl.cleanup();
  }
}
