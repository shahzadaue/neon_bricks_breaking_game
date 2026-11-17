/**
 * Power-Up Manager:
 * Manages item drop chances from destroyed bricks, falling capsule movement,
 * collision with paddle, active timed buffs, and canvas neon rendering.
 */

import { PowerUpItem, PowerUpType, ActivePowerUp, Paddle, Brick } from './types';
import { AudioManager } from './audio-manager';
import { ParticleSystem } from './particle-system';
import { DailyMissionsManager } from './daily-missions-manager';

export interface PowerUpCallbacks {
  onMultiBall: () => void;
  onExpandPaddle: (active: boolean) => void;
  onSlowMotion: (active: boolean) => void;
  onFireBall: (active: boolean) => void;
  onShieldChange: (active: boolean) => void;
  onBonusCoins: (coins: number) => void;
  onCollect?: (item: PowerUpItem, paddle: Paddle) => void;
}

export class PowerUpManager {
  private items: PowerUpItem[] = [];
  private activeBuffs: Map<PowerUpType, ActivePowerUp> = new Map();
  private arenaWidth: number;
  private arenaHeight: number;
  private audio: AudioManager;
  private particles: ParticleSystem;
  private callbacks: PowerUpCallbacks;

  // Drop configuration
  private dropChance: number = 0.24; // 24% chance when brick is destroyed

  // Bottom safety shield status
  private hasShield: boolean = false;

  constructor(
    arenaWidth: number,
    arenaHeight: number,
    audio: AudioManager,
    particles: ParticleSystem,
    callbacks: PowerUpCallbacks
  ) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.audio = audio;
    this.particles = particles;
    this.callbacks = callbacks;
  }

  /**
   * Check whether a destroyed brick spawns a power-up item
   */
  public handleBrickDestroyed(brick: Brick) {
    // Only destructible bricks can spawn power-ups
    if (!brick.isDestructible) return;

    if (Math.random() < this.dropChance) {
      this.spawnItem(brick.x + brick.width / 2, brick.y + brick.height / 2);
    }
  }

  /**
   * Spawn a power-up drop at (x, y)
   */
  public spawnItem(x: number, y: number, specificType?: PowerUpType) {
    const types: PowerUpType[] = [
      'MULTI_BALL',
      'EXPAND_PADDLE',
      'SLOW_MOTION',
      'FIRE_BALL',
      'BOTTOM_SHIELD',
      'BONUS_COINS',
    ];

    const type = specificType || types[Math.floor(Math.random() * types.length)];
    let color = '#06b6d4';
    let glowColor = 'rgba(6, 182, 212, 0.7)';
    let label = 'WIDE';
    let iconSymbol = '↔';
    let duration = 12;

    switch (type) {
      case 'MULTI_BALL':
        color = '#eab308';
        glowColor = 'rgba(234, 179, 8, 0.75)';
        label = 'MULTI-BALL';
        iconSymbol = '⚪+';
        duration = 0; // Instant
        break;
      case 'EXPAND_PADDLE':
        color = '#06b6d4';
        glowColor = 'rgba(6, 182, 212, 0.75)';
        label = 'WIDE PADDLE';
        iconSymbol = '↔';
        duration = 12;
        break;
      case 'SLOW_MOTION':
        color = '#a855f7';
        glowColor = 'rgba(168, 85, 247, 0.75)';
        label = 'SLOW MOTION';
        iconSymbol = '⏳';
        duration = 10;
        break;
      case 'FIRE_BALL':
        color = '#f97316';
        glowColor = 'rgba(249, 115, 22, 0.75)';
        label = 'FIRE BALL';
        iconSymbol = '🔥';
        duration = 9;
        break;
      case 'BOTTOM_SHIELD':
        color = '#10b981';
        glowColor = 'rgba(16, 185, 129, 0.75)';
        label = 'ENERGY SHIELD';
        iconSymbol = '🛡️';
        duration = 22;
        break;
      case 'BONUS_COINS':
        color = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.75)';
        label = '+50 COINS';
        iconSymbol = '🪙';
        duration = 0; // Instant
        break;
    }

    const item: PowerUpItem = {
      id: `pw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      x: x - 18,
      y: y - 9,
      width: 36,
      height: 18,
      vy: 165, // Comfortable downward speed (px/s)
      color,
      glowColor,
      label,
      iconSymbol,
      duration,
      pulseTimer: Math.random() * Math.PI * 2,
    };

    this.items.push(item);
    this.audio.playPowerUpSpawn();
  }

  /**
   * Update falling items and active buff countdowns
   */
  public update(dt: number, paddle: Paddle) {
    // 1. Update falling items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.vy * dt;
      item.pulseTimer += dt * 4;

      // Check AABB collision with paddle
      const collidesWithPaddle =
        item.x < paddle.x + paddle.width &&
        item.x + item.width > paddle.x &&
        item.y + item.height >= paddle.y &&
        item.y <= paddle.y + paddle.height;

      if (collidesWithPaddle) {
        this.activatePowerUp(item, paddle);
        this.items.splice(i, 1);
        continue;
      }

      // Despawn when falling past arena floor
      if (item.y > this.arenaHeight + 25) {
        this.items.splice(i, 1);
      }
    }

    // 2. Update active timed buffs
    this.activeBuffs.forEach((buff, type) => {
      buff.remainingTime -= dt;

      if (buff.remainingTime <= 0) {
        this.deactivatePowerUp(type);
        this.activeBuffs.delete(type);
        this.audio.playPowerUpExpire();
      }
    });
  }

  /**
   * Activate collected power-up
   */
  private activatePowerUp(item: PowerUpItem, paddle: Paddle) {
    this.audio.playPowerUpCollect();

    // Spawn floating visual notification badge & celebratory explosion
    const textX = paddle.x + paddle.width / 2;
    const badgeY = paddle.y - 28;
    this.particles.spawnFloatingBadge(textX, badgeY, `+ ${item.label}`, item.color, 1.3);
    this.particles.spawnColorfulImpactExplosion(textX, paddle.y, item.color, 20);
    this.callbacks.onCollect?.(item, paddle);

    switch (item.type) {
      case 'MULTI_BALL':
        this.callbacks.onMultiBall();
        break;

      case 'EXPAND_PADDLE':
        this.activeBuffs.set('EXPAND_PADDLE', {
          type: 'EXPAND_PADDLE',
          remainingTime: item.duration,
          totalDuration: item.duration,
          label: 'WIDE PADDLE',
          color: item.color,
        });
        this.callbacks.onExpandPaddle(true);
        break;

      case 'SLOW_MOTION':
        this.activeBuffs.set('SLOW_MOTION', {
          type: 'SLOW_MOTION',
          remainingTime: item.duration,
          totalDuration: item.duration,
          label: 'SLOW MOTION',
          color: item.color,
        });
        this.callbacks.onSlowMotion(true);
        break;

      case 'FIRE_BALL':
        this.activeBuffs.set('FIRE_BALL', {
          type: 'FIRE_BALL',
          remainingTime: item.duration,
          totalDuration: item.duration,
          label: 'FIRE BALL',
          color: item.color,
        });
        this.callbacks.onFireBall(true);
        break;

      case 'BOTTOM_SHIELD':
        this.hasShield = true;
        this.activeBuffs.set('BOTTOM_SHIELD', {
          type: 'BOTTOM_SHIELD',
          remainingTime: item.duration,
          totalDuration: item.duration,
          label: 'SHIELD READY',
          color: item.color,
        });
        this.callbacks.onShieldChange(true);
        break;

      case 'BONUS_COINS':
        try {
          DailyMissionsManager.getInstance().addCoins(50);
        } catch {}
        this.callbacks.onBonusCoins(50);
        break;
    }
  }

  /**
   * Deactivate expired power-up
   */
  private deactivatePowerUp(type: PowerUpType) {
    switch (type) {
      case 'EXPAND_PADDLE':
        this.callbacks.onExpandPaddle(false);
        break;
      case 'SLOW_MOTION':
        this.callbacks.onSlowMotion(false);
        break;
      case 'FIRE_BALL':
        this.callbacks.onFireBall(false);
        break;
      case 'BOTTOM_SHIELD':
        this.hasShield = false;
        this.callbacks.onShieldChange(false);
        break;
    }
  }

  /**
   * Check if bottom shield is ready to bounce ball
   */
  public hasBottomShieldActive(): boolean {
    return this.hasShield;
  }

  /**
   * Consume bottom shield when ball bounces off it
   */
  public consumeBottomShield(): boolean {
    if (!this.hasShield) return false;
    this.hasShield = false;
    this.activeBuffs.delete('BOTTOM_SHIELD');
    this.callbacks.onShieldChange(false);
    this.audio.playShieldDeflect();

    // Spawn green barrier sparkles across floor
    for (let i = 0; i < 5; i++) {
      this.particles.spawnBrickBurst(60 + i * 120, this.arenaHeight - 8, '#10b981', 14, true);
    }
    this.particles.spawnFloatingText(this.arenaWidth / 2, this.arenaHeight - 40, 'SHIELD DEFLECT!', '#10b981');
    return true;
  }

  public isFireBallActive(): boolean {
    return this.activeBuffs.has('FIRE_BALL');
  }

  public isSlowMotionActive(): boolean {
    return this.activeBuffs.has('SLOW_MOTION');
  }

  public getActivePowerUps(): ActivePowerUp[] {
    return Array.from(this.activeBuffs.values());
  }

  public getItems(): PowerUpItem[] {
    return this.items;
  }

  /**
   * Clear all drops and buffs on level reset or game over
   */
  public reset() {
    // Revert all active buffs
    this.activeBuffs.forEach((_, type) => {
      this.deactivatePowerUp(type);
    });
    this.items = [];
    this.activeBuffs.clear();
    this.hasShield = false;
  }

  /**
   * Render falling capsules, bottom shield, and HUD timer badges
   */
  public render(
    ctx: CanvasRenderingContext2D,
    itemsOverride?: PowerUpItem[],
    hasShieldOverride?: boolean,
    activeBuffsOverride?: ActivePowerUp[]
  ) {
    const shieldActive = hasShieldOverride !== undefined ? hasShieldOverride : this.hasShield;
    const itemsList = itemsOverride ?? this.items;

    // 1. Draw bottom shield barrier if active
    if (shieldActive) {
      ctx.save();
      const time = performance.now() * 0.005;
      const pulse = 0.75 + Math.sin(time) * 0.25;

      ctx.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(0, this.arenaHeight - 4);
      ctx.lineTo(this.arenaWidth, this.arenaHeight - 4);
      ctx.stroke();

      // Energy wave nodes
      for (let x = 30; x < this.arenaWidth; x += 60) {
        ctx.beginPath();
        ctx.arc(x, this.arenaHeight - 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#6ee7b7';
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Draw falling power-up capsules
    for (const item of itemsList) {
      ctx.save();
      const bob = Math.sin(item.pulseTimer) * 2;
      const drawY = item.y + bob;

      // Outer glow aura
      ctx.shadowColor = item.glowColor;
      ctx.shadowBlur = 14;

      // Capsule body (rounded rectangle)
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(item.x, drawY, item.width, item.height, 9);
      ctx.fill();
      ctx.stroke();

      // Inner color bar
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(item.x + 3, drawY + 3, 10, item.height - 6, 4);
      ctx.fill();

      // Capsule text symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.iconSymbol, item.x + item.width / 2 + 4, drawY + item.height / 2);

      ctx.restore();
    }

    // 3. Draw in-canvas HUD active power-up timer chips
    this.renderHUDTimers(ctx, activeBuffsOverride);
  }

  private renderHUDTimers(ctx: CanvasRenderingContext2D, activeBuffsOverride?: ActivePowerUp[]) {
    const buffs = activeBuffsOverride ?? Array.from(this.activeBuffs.values());
    if (buffs.length === 0) return;

    ctx.save();
    let chipX = 14;
    const chipY = 38;

    buffs.forEach((buff) => {
      const remaining = Math.max(0, buff.remainingTime).toFixed(1);
      const text = `${buff.label} ${remaining}s`;

      ctx.font = 'bold 10px monospace';
      const textMetrics = ctx.measureText(text);
      const chipWidth = textMetrics.width + 16;
      const chipHeight = 20;

      // Chip Background
      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.strokeStyle = buff.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = buff.color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipWidth, chipHeight, 6);
      ctx.fill();
      ctx.stroke();

      // Progress bar fill under chip
      const fillRatio = Math.max(0, buff.remainingTime / buff.totalDuration);
      ctx.fillStyle = buff.color;
      ctx.beginPath();
      ctx.roundRect(chipX + 2, chipY + chipHeight - 3, (chipWidth - 4) * fillRatio, 2, 1);
      ctx.fill();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, chipX + 8, chipY + chipHeight / 2 - 1);

      chipX += chipWidth + 8;
    });

    ctx.restore();
  }
}
