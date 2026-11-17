/**
 * Replay Manager:
 * Captures a rolling 10-second ring buffer of gameplay snapshots & events
 * at ~60Hz during active play, and drives smooth playback with speed control,
 * timeline scrubbing, particle/explosion reconstruction, and audio playback.
 */

import {
  ActivePowerUp,
  Ball,
  BossInfo,
  BossProjectile,
  Brick,
  Paddle,
  PowerUpItem,
  ReplayInfo,
} from './types';
import { AudioManager } from './audio-manager';
import { ParticleSystem } from './particle-system';

export type ReplayEvent =
  | {
      type: 'BRICK_DESTROY';
      brickIdx: number;
      impactX: number;
      impactY: number;
      text?: string;
      color?: string;
      isChainBlast?: boolean;
      combo?: number;
    }
  | {
      type: 'BRICK_HIT';
      brickIdx: number;
      impactX: number;
      impactY: number;
      text?: string;
      combo: number;
    }
  | {
      type: 'PADDLE_HIT';
      x: number;
      y: number;
      hitOffset: number;
    }
  | {
      type: 'WALL_HIT';
    }
  | {
      type: 'POWERUP_COLLECT';
      x: number;
      y: number;
      label: string;
      color: string;
    }
  | {
      type: 'SHIELD_DEFLECT';
      arenaWidth: number;
      arenaHeight: number;
    }
  | {
      type: 'BOSS_HIT_PADDLE';
      x: number;
      y: number;
      color: string;
      shielded: boolean;
    }
  | {
      type: 'BALL_LOST';
    }
  | {
      type: 'VICTORY_BURST';
    };

export interface ReplayBrickSnapshot {
  idx: number;
  x: number;
  y: number;
  hp: number;
  flash: number;
}

export interface ReplayBallSnapshot {
  x: number;
  y: number;
  radius: number;
  trail: Array<{ x: number; y: number; alpha: number; radius: number }>;
}

export interface ReplayPaddleSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  hitFlashTime: number;
}

export interface ReplayFrame {
  time: number;
  paddle: ReplayPaddleSnapshot;
  balls: ReplayBallSnapshot[];
  isFireBall: boolean;
  bricks: ReplayBrickSnapshot[];
  powerUpItems: PowerUpItem[];
  activePowerUps: ActivePowerUp[];
  hasBottomShield: boolean;
  bossProjectiles: BossProjectile[];
  bossInfo?: BossInfo;
  score: number;
  combo: number;
  lives: number;
  events: ReplayEvent[];
}

export interface ReplayRecordInput {
  paddle: Paddle;
  balls: Ball[];
  isFireBall: boolean;
  bricks: Brick[];
  powerUpItems: PowerUpItem[];
  activePowerUps: ActivePowerUp[];
  hasBottomShield: boolean;
  bossProjectiles: BossProjectile[];
  bossInfo?: BossInfo;
  score: number;
  combo: number;
  lives: number;
}

export class ReplayManager {
  public static readonly MAX_DURATION = 10.0; // Last 10 seconds
  private static readonly SAMPLE_INTERVAL = 1 / 60;

  private stageNumber: number = 1;
  private brickTemplates: Brick[] = [];
  private brickIndexById: Map<string, number> = new Map();

  private frames: ReplayFrame[] = [];
  private pendingEvents: ReplayEvent[] = [];
  private recordTime: number = 0;
  private sampleAccum: number = 0;
  private isRecordingFinalized: boolean = false;

  // Playback state
  private playbackTime: number = 0;
  private duration: number = 0;
  private isPlaying: boolean = false;
  private speed: number = 1;
  private currentFrameIndex: number = 0;
  private lastTriggeredFrameIndex: number = -1;
  private replayParticles: ParticleSystem = new ParticleSystem();

  /**
   * Reset buffer and index static brick metadata at the start of a stage/turn
   */
  public initStage(stageNumber: number, bricks: Brick[]) {
    this.stageNumber = stageNumber;
    this.brickTemplates = bricks.map((b) => ({ ...b }));
    this.brickIndexById.clear();
    bricks.forEach((b, idx) => {
      this.brickIndexById.set(b.id, idx);
    });

    this.frames = [];
    this.pendingEvents = [];
    this.recordTime = 0;
    this.sampleAccum = ReplayManager.SAMPLE_INTERVAL; // Capture first frame immediately
    this.isRecordingFinalized = false;

    this.playbackTime = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.speed = 1;
    this.currentFrameIndex = 0;
    this.lastTriggeredFrameIndex = -1;
    this.replayParticles.clear();
  }

  public getBrickIndex(brickId: string): number {
    return this.brickIndexById.get(brickId) ?? -1;
  }

  public queueEvent(event: ReplayEvent) {
    if (this.isRecordingFinalized) return;
    this.pendingEvents.push(event);
  }

  /**
   * Sample a gameplay snapshot if sample interval elapsed (or force-capture on end of stage)
   */
  public recordFrame(dt: number, input: ReplayRecordInput, forceCapture: boolean = false) {
    if (this.isRecordingFinalized) return;

    this.recordTime += dt;
    this.sampleAccum += dt;

    if (!forceCapture && this.sampleAccum < ReplayManager.SAMPLE_INTERVAL) {
      return;
    }
    this.sampleAccum = 0;

    const brickSnapshots: ReplayBrickSnapshot[] = [];
    for (let i = 0; i < input.bricks.length; i++) {
      const b = input.bricks[i];
      if (b.currentHp <= 0) continue;
      const idx = this.brickIndexById.get(b.id);
      if (idx === undefined) continue;
      brickSnapshots.push({
        idx,
        x: b.x,
        y: b.y,
        hp: b.currentHp,
        flash: b.hitFlashTime,
      });
    }

    const frame: ReplayFrame = {
      time: this.recordTime,
      paddle: {
        x: input.paddle.x,
        y: input.paddle.y,
        width: input.paddle.width,
        height: input.paddle.height,
        color: input.paddle.color,
        glowColor: input.paddle.glowColor,
        hitFlashTime: input.paddle.hitFlashTime,
      },
      balls: input.balls.map((ball) => ({
        x: ball.x,
        y: ball.y,
        radius: ball.radius,
        trail: ball.trail.map((t) => ({ ...t })),
      })),
      isFireBall: input.isFireBall,
      bricks: brickSnapshots,
      powerUpItems: input.powerUpItems.map((item) => ({ ...item })),
      activePowerUps: input.activePowerUps.map((buff) => ({ ...buff })),
      hasBottomShield: input.hasBottomShield,
      bossProjectiles: input.bossProjectiles.map((p) => ({
        ...p,
        trail: p.trail.map((t) => ({ ...t })),
      })),
      bossInfo: input.bossInfo ? { ...input.bossInfo } : undefined,
      score: input.score,
      combo: input.combo,
      lives: input.lives,
      events: this.pendingEvents.length > 0 ? [...this.pendingEvents] : [],
    };

    this.pendingEvents = [];
    this.frames.push(frame);

    // Maintain a strict rolling 10-second window
    const cutoff = this.recordTime - ReplayManager.MAX_DURATION;
    while (this.frames.length > 2 && this.frames[0].time < cutoff) {
      this.frames.shift();
    }
  }

  /**
   * Finalize and normalize timestamps to [0 .. duration] (max 10s)
   */
  public finalizeRecording(finalSnapshot?: ReplayRecordInput) {
    if (finalSnapshot && !this.isRecordingFinalized) {
      this.recordFrame(0.001, finalSnapshot, true);
    }
    this.isRecordingFinalized = true;

    if (this.frames.length === 0) {
      this.duration = 0;
      return;
    }

    const startTime = this.frames[0].time;
    for (const f of this.frames) {
      f.time = Math.max(0, f.time - startTime);
    }
    this.duration = this.frames[this.frames.length - 1].time;
  }

  public hasReplay(): boolean {
    return this.frames.length >= 2 && this.duration > 0.15;
  }

  public startReplay() {
    if (!this.hasReplay()) return;
    this.playbackTime = 0;
    this.currentFrameIndex = 0;
    this.lastTriggeredFrameIndex = -1;
    this.isPlaying = true;
    this.speed = 1;
    this.replayParticles.clear();
  }

  public restartReplay() {
    if (!this.hasReplay()) return;
    this.playbackTime = 0;
    this.currentFrameIndex = 0;
    this.lastTriggeredFrameIndex = -1;
    this.isPlaying = true;
    this.replayParticles.clear();
  }

  public togglePlayPause() {
    if (!this.hasReplay()) return;
    if (!this.isPlaying && this.playbackTime >= this.duration - 0.01) {
      this.restartReplay();
      return;
    }
    this.isPlaying = !this.isPlaying;
  }

  public setSpeed(speed: number) {
    this.speed = speed === 0.5 || speed === 1.5 ? speed : 1;
  }

  public seekTo(timeSeconds: number) {
    if (!this.hasReplay()) return;
    this.playbackTime = Math.max(0, Math.min(this.duration, timeSeconds));
    this.currentFrameIndex = this.findFrameIndexAtTime(this.playbackTime);
    this.lastTriggeredFrameIndex = this.currentFrameIndex;
    this.replayParticles.clear();
  }

  public updatePlayback(dt: number, audio?: AudioManager) {
    if (!this.hasReplay()) return;

    if (this.isPlaying) {
      const scaledDt = dt * this.speed;
      this.playbackTime += scaledDt;

      if (this.playbackTime >= this.duration) {
        this.playbackTime = this.duration;
        this.isPlaying = false;
      }

      const targetIndex = this.findFrameIndexAtTime(this.playbackTime);

      // Fire visual particle & audio events for frames advanced during this tick
      if (targetIndex > this.lastTriggeredFrameIndex) {
        const startIdx = Math.max(0, this.lastTriggeredFrameIndex + 1);
        for (let i = startIdx; i <= targetIndex; i++) {
          this.triggerFrameEvents(this.frames[i], audio);
        }
        this.lastTriggeredFrameIndex = targetIndex;
      }

      this.currentFrameIndex = targetIndex;
      this.replayParticles.update(scaledDt);
    } else {
      // Allow lingering particles to fade smoothly even right after hitting the end
      this.replayParticles.update(dt * 0.35);
    }
  }

  private findFrameIndexAtTime(time: number): number {
    let low = 0;
    let high = this.frames.length - 1;
    let best = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.frames[mid].time <= time) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }

  private triggerFrameEvents(frame: ReplayFrame, audio?: AudioManager) {
    const playSfx = this.speed === 1 ? audio : undefined;

    for (const ev of frame.events) {
      switch (ev.type) {
        case 'BRICK_DESTROY': {
          const tpl = this.brickTemplates[ev.brickIdx];
          if (tpl) {
            const brickAtFrame: Brick = {
              ...tpl,
              currentHp: 0,
            };
            this.replayParticles.spawnBrickDestructionBurst(brickAtFrame, ev.impactX, ev.impactY);
            if (ev.text) {
              this.replayParticles.spawnFloatingText(
                ev.impactX,
                ev.impactY - 8,
                ev.text,
                ev.color || tpl.color
              );
            }
          }
          playSfx?.playBrickDestroy(ev.combo ?? frame.combo);
          break;
        }
        case 'BRICK_HIT': {
          const tpl = this.brickTemplates[ev.brickIdx];
          if (tpl) {
            this.replayParticles.spawnBrickHitSparks(tpl, ev.impactX, ev.impactY);
            if (ev.text) {
              this.replayParticles.spawnFloatingText(ev.impactX, ev.impactY - 8, ev.text, '#94a3b8');
            }
          }
          playSfx?.playBrickHit(ev.combo);
          break;
        }
        case 'PADDLE_HIT':
          this.replayParticles.spawnPaddleSparks(ev.x, ev.y, ev.hitOffset);
          playSfx?.playPaddleHit(ev.hitOffset);
          break;
        case 'WALL_HIT':
          playSfx?.playWallHit();
          break;
        case 'POWERUP_COLLECT':
          this.replayParticles.spawnFloatingBadge(ev.x, ev.y - 28, `+ ${ev.label}`, ev.color, 1.3);
          this.replayParticles.spawnColorfulImpactExplosion(ev.x, ev.y, ev.color, 20);
          playSfx?.playPowerUpCollect();
          break;
        case 'SHIELD_DEFLECT':
          for (let i = 0; i < 5; i++) {
            this.replayParticles.spawnBrickBurst(60 + i * 120, ev.arenaHeight - 8, '#10b981', 14, true);
          }
          this.replayParticles.spawnFloatingText(
            ev.arenaWidth / 2,
            ev.arenaHeight - 40,
            'SHIELD DEFLECT!',
            '#10b981'
          );
          playSfx?.playShieldDeflect();
          break;
        case 'BOSS_HIT_PADDLE':
          this.replayParticles.spawnBrickBurst(ev.x, ev.y, ev.color, 16, true);
          if (!ev.shielded) {
            this.replayParticles.spawnFloatingText(ev.x, ev.y - 25, 'PADDLE HIT! -1 LIFE', '#f43f5e');
          }
          playSfx?.playPaddleHitByBoss();
          break;
        case 'BALL_LOST':
          playSfx?.playBallLost();
          break;
        case 'VICTORY_BURST':
          for (let i = 0; i < 4; i++) {
            this.replayParticles.spawnBrickBurst(
              100 + i * 130,
              180,
              ['#06b6d4', '#10b981', '#f59e0b', '#ec4899'][i],
              28,
              true
            );
          }
          playSfx?.playVictory();
          break;
      }
    }
  }

  public getCurrentFrame(): ReplayFrame | null {
    if (this.frames.length === 0) return null;
    return this.frames[this.currentFrameIndex] || this.frames[0];
  }

  public getReconstructedBricks(frame: ReplayFrame): Brick[] {
    const result: Brick[] = [];
    for (const snap of frame.bricks) {
      const tpl = this.brickTemplates[snap.idx];
      if (!tpl) continue;
      result.push({
        ...tpl,
        x: snap.x,
        y: snap.y,
        currentHp: snap.hp,
        hitFlashTime: snap.flash,
      });
    }
    return result;
  }

  public getReconstructedBalls(frame: ReplayFrame): Ball[] {
    return frame.balls.map((b, idx) => ({
      id: `replay-ball-${idx}`,
      x: b.x,
      y: b.y,
      vx: 0,
      vy: 0,
      radius: b.radius,
      speed: 0,
      minSpeed: 0,
      maxSpeed: 0,
      isStuckToPaddle: false,
      stuckOffset: 0,
      trail: b.trail,
    }));
  }

  public renderReplayParticles(ctx: CanvasRenderingContext2D) {
    this.replayParticles.render(ctx);
  }

  public renderReplayParticlesEmissive(ctx: CanvasRenderingContext2D) {
    this.replayParticles.renderEmissive(ctx);
  }

  public getReplayInfo(): ReplayInfo {
    return {
      available: this.hasReplay(),
      duration: Number(this.duration.toFixed(2)),
      currentTime: Number(this.playbackTime.toFixed(2)),
      isPlaying: this.isPlaying,
      speed: this.speed,
      stageNumber: this.stageNumber,
    };
  }
}
