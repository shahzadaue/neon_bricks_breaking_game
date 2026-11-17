/**
 * Boss Stage Manager:
 * Orchestrates moving multi-hit boss structures, targeting warning lasers,
 * downward plasma projectile volleys, and boss phase escalations every 10 levels.
 */

import { Brick, BrickType, Paddle, BossProjectile, BossInfo } from './types';
import { AudioManager } from './audio-manager';
import { ParticleSystem } from './particle-system';

export interface BossConfig {
  name: string;
  maxHp: number;
  themeColor: string;
  coreHp: number;
  cannonCount: number;
  patrolRange: number;
  patrolSpeed: number;
}

export class BossManager {
  private arenaWidth: number;
  private arenaHeight: number;
  private audio: AudioManager;
  private particles: ParticleSystem;

  private isBossActive: boolean = false;
  private bossName: string = '';
  private maxHp: number = 100;
  private currentHp: number = 100;
  private phase: number = 1;

  // Horizontal sway patrol
  private patrolTime: number = 0;
  private patrolRange: number = 70;
  private patrolSpeed: number = 1.2;
  private currentOffsetX: number = 0;
  private currentOffsetY: number = 0;

  // Projectile firing timer
  private fireCooldown: number = 3.0; // Seconds between volleys
  private fireTimer: number = 2.0;
  private warningTime: number = 0; // Duration warning lasers are active (0.6s)
  private projectiles: BossProjectile[] = [];
  private cannonPositions: Array<{ x: number; y: number }> = [];

  // Hit grace period for paddle to prevent multi-hit stacking
  private paddleGracePeriod: number = 0;

  constructor(
    arenaWidth: number,
    arenaHeight: number,
    audio: AudioManager,
    particles: ParticleSystem
  ) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.audio = audio;
    this.particles = particles;
  }

  public static isBossLevel(level: number): boolean {
    return level > 0 && level % 10 === 0;
  }

  public static getBossConfigForLevel(level: number): BossConfig {
    const chapterIdx = Math.floor((level - 1) / 10) + 1;
    const bossNames: Record<number, { name: string; color: string }> = {
      10: { name: 'NEXUS-01: GALAXY NEBULA TITAN', color: '#06b6d4' },
      20: { name: 'CHRONOS OVERLORD: SATURN RINGS', color: '#eab308' },
      30: { name: 'ARTEMIS CORE: LUNAR BASTION', color: '#94a3b8' },
      40: { name: 'ARES SENTINEL: MARS COLOSSUS', color: '#ef4444' },
      50: { name: 'EVENT HORIZON: VOID SINGULARITY', color: '#8b5cf6' },
      60: { name: 'STELLAR DRAGON: PULSAR NEXUS', color: '#38bdf8' },
      70: { name: 'XENOS ARCHON: ALIEN OVERMIND', color: '#a855f7' },
      80: { name: 'CITADEL PRIME: ORBITAL DEFENDER', color: '#0ea5e9' },
      90: { name: 'ASTEROID EMPEROR: COMET FIEND', color: '#f97316' },
      100: { name: 'WARP STARGATE: APEX RIFT', color: '#d946ef' },
      110: { name: 'GREAT BARRIER: CORAL GOLIATH', color: '#14b8a6' },
      120: { name: 'ABYSSAL LEVIATHAN: DEEP DREAD', color: '#0284c7' },
      130: { name: 'ORICHALCUM KING: TRIDENT EMPEROR', color: '#06b6d4' },
      140: { name: 'MEGALODON TITAN: SHARK REIGN', color: '#0f766e' },
      150: { name: 'DREAD PIRATE: GHOST GALLEON', color: '#475569' },
      160: { name: 'BIOLUME QUEEN: MEDUSA SWARM', color: '#ec4899' },
      170: { name: 'OYSTER BASTION: PEARL MONARCH', color: '#fbcfe8' },
      180: { name: 'CALDERA FIEND: UNDERSEA VULCAN', color: '#ea580c' },
      190: { name: 'HADAL ANCHOR: MARIANA HORROR', color: '#1e1b4b' },
      200: { name: 'AQUAMARINE TITAN: CRYSTAL LAGOON', color: '#22d3ee' },
      210: { name: 'ELDER TREANT: VERDANT ANCIENT', color: '#10b981' },
      220: { name: 'DRAKE WYRM: PYRO DRAGON LORD', color: '#dc2626' },
      230: { name: 'DIAMOND PEAK: QUARTZ GOLEM', color: '#a7f3d0' },
      240: { name: 'TITANIA SPRITE: SYLPH EMPRESS', color: '#f472b6' },
      250: { name: 'ARCHMAGE TOWER: SORCERY CORE', color: '#8b5cf6' },
      260: { name: 'INFERNO SULTAN: MOLTEN COLOSSUS', color: '#f97316' },
      270: { name: 'FROST KING: GLACIAL EMPEROR', color: '#38bdf8' },
      280: { name: 'KUKULKAN SERPENT: MAYAN IDOL', color: '#65a30d' },
      290: { name: 'HYDRA CASCADE: WATERFALL TITAN', color: '#0284c7' },
      300: { name: 'PRISMATIC PHOENIX: RAINBOW LORD', color: '#c084fc' },
      310: { name: 'CYBER SHOGUN: NEON MEGAPLEX', color: '#06b6d4' },
      320: { name: 'ARCADE MASTER: 8-BIT OVERLORD', color: '#f59e0b' },
      330: { name: 'AUTOMATON PRIME: CYBER FORGE', color: '#d97706' },
      340: { name: 'AI SINGULARITY: ZERO DAY NEMESIS', color: '#22c55e' },
      350: { name: 'MIRAGE ARCHITECT: HARD-LIGHT LORD', color: '#38bdf8' },
      360: { name: 'SAND SENTINEL: DESERT PHARAOH', color: '#eab308' },
      370: { name: 'ANUBIS JUDGE: SUN GOD RA APEX', color: '#f59e0b' },
      380: { name: 'SHADOW REAPER: SPECTRAL LORD', color: '#64748b' },
      390: { name: 'KING CONFECTION: SUGAR EMPEROR', color: '#ec4899' },
      400: { name: 'MIDAS SOVEREIGN: SUPREME GOLDEN GOD', color: '#facc15' },
    };

    const bossPalette = [
      '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#38bdf8', '#ec4899', '#f97316', '#22c55e', '#facc15',
    ];
    const tierLabel =
      level <= 250
        ? 'GUARDIAN'
        : level <= 500
        ? 'OVERLORD'
        : level <= 750
        ? 'WARLORD'
        : 'SUPREME TITAN';

    const info = bossNames[level] || {
      name: `CH.${chapterIdx} ${tierLabel}: APEX SENTINEL ${level}`,
      color: bossPalette[(chapterIdx - 1) % bossPalette.length],
    };

    const progress = Math.max(0, Math.min(1, (level - 10) / 990));
    const maxHp = Math.round(90 + progress * 1450);
    const coreHp = Math.min(24, Math.round(5 + progress * 19));
    const cannonCount = level >= 750 ? 6 : level >= 500 ? 5 : level >= 150 ? 4 : level >= 40 ? 3 : 2;
    const patrolRange = Math.round(65 + progress * 75);
    const patrolSpeed = Number((1.1 + progress * 1.35).toFixed(2));

    return {
      name: info.name,
      maxHp,
      themeColor: info.color,
      coreHp,
      cannonCount,
      patrolRange,
      patrolSpeed,
    };
  }

  /**
   * Generates a moving boss brick structure with command core, cannons, and armor wings
   */
  public static generateBossBricks(
    level: number,
    arenaWidth: number,
    themeHue: string
  ): { bricks: Brick[]; config: BossConfig } {
    const config = BossManager.getBossConfigForLevel(level);
    const bricks: Brick[] = [];

    const cols = 10;
    const sidePadding = 18;
    const topOffset = 70;
    const brickMargin = 6;
    const availableWidth = arenaWidth - sidePadding * 2;
    const brickWidth = (availableWidth - (cols - 1) * brickMargin) / cols;
    const brickHeight = 20;

    // Boss geometric layout (12 rows dedicated to boss warship)
    // 0 = empty, 1 = standard, 2 = strong, 3 = armored, 5 = core, 7 = cannon, 9 = unbreakable armor
    const bossBlueprint: number[][] = [
      // Row 0: Command crown antennas
      [0, 0, 0, 2, 9, 9, 2, 0, 0, 0],
      // Row 1: Upper armor cowl
      [0, 0, 2, 3, 3, 3, 3, 2, 0, 0],
      // Row 2: Heavy shoulder turrets
      [0, 3, 9, 2, 2, 2, 2, 9, 3, 0],
      // Row 3: Main cannons & outer shielding
      [7, 3, 2, 1, 1, 1, 1, 2, 3, 7],
      // Row 4: Central Command Core housing
      [2, 3, 1, 5, 5, 5, 5, 1, 3, 2],
      // Row 5: Command Core center nexus
      [2, 9, 1, 5, 5, 5, 5, 1, 9, 2],
      // Row 6: Core exhaust & energy conduits
      [0, 3, 2, 1, 3, 3, 1, 2, 3, 0],
      // Row 7: Secondary cannons & wing sweep
      [7, 2, 3, 2, 1, 1, 2, 3, 2, 7],
      // Row 8: Underbelly armor plating
      [0, 1, 2, 3, 9, 9, 3, 2, 1, 0],
      // Row 9: Deflection blades
      [0, 0, 2, 2, 3, 3, 2, 2, 0, 0],
      // Row 10: Lower prow
      [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
      // Row 11: Kinetic tip
      [0, 0, 0, 0, 3, 3, 0, 0, 0, 0],
    ];

    let id = 0;
    for (let r = 0; r < bossBlueprint.length; r++) {
      for (let c = 0; c < cols; c++) {
        const val = bossBlueprint[r][c];
        if (val === 0) continue;

        const x = sidePadding + c * (brickWidth + brickMargin);
        const y = topOffset + r * (brickHeight + brickMargin);

        let type: BrickType = 'standard';
        let maxHp = 1;
        let color = themeHue;
        let glowColor = `${themeHue}70`;
        let points = 150;
        let isDestructible = true;
        let isBossCore = false;
        let isBossCannon = false;

        switch (val) {
          case 5: // Boss Core
            type = 'armored';
            maxHp = config.coreHp;
            color = '#fbbf24'; // Radiant amber gold
            glowColor = 'rgba(251, 191, 36, 0.9)';
            points = 1000;
            isBossCore = true;
            break;
          case 7: // Boss Cannon Node
            type = 'strong';
            maxHp = 3;
            color = '#f43f5e'; // Crimson plasma cannon
            glowColor = 'rgba(244, 63, 94, 0.85)';
            points = 500;
            isBossCannon = true;
            break;
          case 9: // Unbreakable Titanium Armor
            type = 'unbreakable';
            maxHp = 999;
            color = '#475569';
            glowColor = 'rgba(148, 163, 184, 0.3)';
            points = 0;
            isDestructible = false;
            break;
          case 3: // Heavy Armored
            type = 'armored';
            maxHp = 3;
            color = '#e11d48';
            glowColor = 'rgba(225, 29, 72, 0.65)';
            points = 350;
            break;
          case 2: // Strong
            type = 'strong';
            maxHp = 2;
            color = '#06b6d4';
            glowColor = 'rgba(6, 182, 212, 0.65)';
            points = 200;
            break;
          default: // Standard
            type = 'standard';
            maxHp = 1;
            color = themeHue;
            glowColor = `${themeHue}60`;
            points = 100;
            break;
        }

        bricks.push({
          id: `boss-${level}-b-${id++}`,
          x,
          y,
          width: brickWidth,
          height: brickHeight,
          maxHp,
          currentHp: maxHp,
          type,
          color,
          glowColor,
          points,
          isDestructible,
          hitFlashTime: 0,
          baseX: x,
          baseY: y,
          isBoss: true,
          isBossCore,
          isBossCannon,
        });
      }
    }

    // Compute actual total boss HP from destructible bricks
    const totalHp = bricks.reduce((sum, b) => (b.isDestructible ? sum + b.maxHp : sum), 0);
    config.maxHp = totalHp;

    return { bricks, config };
  }

  /**
   * Initialize a boss battle session
   */
  public initBoss(level: number, bricks: Brick[]) {
    if (!BossManager.isBossLevel(level)) {
      this.isBossActive = false;
      this.projectiles = [];
      return;
    }

    const config = BossManager.getBossConfigForLevel(level);
    this.isBossActive = true;
    this.bossName = config.name;
    this.maxHp = config.maxHp;
    this.currentHp = config.maxHp;
    this.phase = 1;
    this.patrolRange = config.patrolRange;
    this.patrolSpeed = config.patrolSpeed;
    this.patrolTime = 0;
    this.fireTimer = 2.2;
    this.warningTime = 0;
    this.projectiles = [];
    this.paddleGracePeriod = 0;

    // Refresh cannon node coordinates
    this.updateCannonPositions(bricks);
  }

  public getIsActive(): boolean {
    return this.isBossActive;
  }

  public getProjectiles(): BossProjectile[] {
    return this.projectiles;
  }

  public getBossInfo(): BossInfo | undefined {
    if (!this.isBossActive) return undefined;
    return {
      isBoss: true,
      name: this.bossName,
      currentHp: Math.max(0, this.currentHp),
      maxHp: this.maxHp,
      phase: this.phase,
    };
  }

  /**
   * Update boss movement, fire timers, projectiles, and paddle collisions
   */
  public update(
    dt: number,
    paddle: Paddle,
    bricks: Brick[],
    onPaddleHit: (projectile: BossProjectile) => void,
    onBossDefeated: () => void
  ) {
    if (!this.isBossActive) return;

    if (this.paddleGracePeriod > 0) {
      this.paddleGracePeriod = Math.max(0, this.paddleGracePeriod - dt);
    }

    // 1. Calculate boss HP and phase from active boss bricks
    let aliveHp = 0;
    let aliveDestructibleBricks = 0;

    for (const b of bricks) {
      if (b.isBoss && b.isDestructible && b.currentHp > 0) {
        aliveHp += b.currentHp;
        aliveDestructibleBricks++;
      }
    }
    this.currentHp = aliveHp;

    // Escalation Phases: Phase 1 (>60%), Phase 2 (30-60%), Phase 3 (<30%)
    const hpRatio = this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
    if (hpRatio <= 0.3) {
      this.phase = 3;
    } else if (hpRatio <= 0.6) {
      this.phase = 2;
    } else {
      this.phase = 1;
    }

    // Check boss defeat
    if (aliveDestructibleBricks === 0 && this.maxHp > 0) {
      this.isBossActive = false;
      this.projectiles = [];
      this.audio.playBossDefeated();
      onBossDefeated();
      return;
    }

    // 2. Horizontal sway & hovering motion (speed ramps with phase)
    const phaseSpeedMult = this.phase === 3 ? 1.6 : this.phase === 2 ? 1.3 : 1.0;
    this.patrolTime += dt * this.patrolSpeed * phaseSpeedMult;
    this.currentOffsetX = Math.sin(this.patrolTime) * this.patrolRange;
    this.currentOffsetY = Math.sin(this.patrolTime * 1.8) * 6;

    // Apply movement to all active boss bricks
    for (const b of bricks) {
      if (b.isBoss) {
        b.x = (b.baseX ?? b.x) + this.currentOffsetX;
        b.y = (b.baseY ?? b.y) + this.currentOffsetY;
      }
    }

    this.updateCannonPositions(bricks);

    // 3. Projectile firing cadence
    this.fireTimer -= dt;

    // Warning lasers in the final 0.65s before firing
    if (this.fireTimer <= 0.65 && this.warningTime <= 0) {
      this.warningTime = 0.65;
      this.audio.playBossWarning();
    }
    if (this.warningTime > 0) {
      this.warningTime = Math.max(0, this.warningTime - dt);
    }

    // Firing execution
    if (this.fireTimer <= 0) {
      this.fireProjectiles(paddle);
      // Reset cooldown (faster in later phases)
      const baseCooldown = this.phase === 3 ? 2.2 : this.phase === 2 ? 2.7 : 3.3;
      this.fireTimer = baseCooldown;
      this.warningTime = 0;
    }

    // 4. Update falling projectiles and paddle collisions
    this.updateProjectiles(dt, paddle, onPaddleHit);
  }

  private updateCannonPositions(bricks: Brick[]) {
    this.cannonPositions = [];
    for (const b of bricks) {
      if (b.isBoss && b.isBossCannon && b.currentHp > 0) {
        this.cannonPositions.push({
          x: b.x + b.width / 2,
          y: b.y + b.height,
        });
      }
    }
    // Fallback if cannons destroyed: fire from center underside
    if (this.cannonPositions.length === 0) {
      this.cannonPositions.push({
        x: this.arenaWidth / 2 + this.currentOffsetX,
        y: 190 + this.currentOffsetY,
      });
    }
  }

  private fireProjectiles(paddle: Paddle) {
    this.audio.playBossFire();
    const paddleCenter = paddle.x + paddle.width / 2;

    this.cannonPositions.forEach((cannon, idx) => {
      // Calculate slight horizontal drift toward paddle
      const dx = paddleCenter - cannon.x;
      const vx = Math.max(-120, Math.min(120, dx * 0.45));
      const vy = 270 + (this.phase === 3 ? 60 : this.phase === 2 ? 30 : 0);

      this.projectiles.push({
        id: `bp-${Date.now()}-${idx}-${Math.random()}`,
        x: cannon.x,
        y: cannon.y,
        vx,
        vy,
        radius: 6,
        color: this.phase === 3 ? '#f43f5e' : '#fb923c',
        glowColor: this.phase === 3 ? 'rgba(244, 63, 94, 0.9)' : 'rgba(251, 146, 60, 0.9)',
        trail: [],
      });

      // Muzzle flash sparks
      this.particles.spawnPaddleSparks(cannon.x, cannon.y, 0);
    });
  }

  private updateProjectiles(dt: number, paddle: Paddle, onPaddleHit: (p: BossProjectile) => void) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Update trail
      p.trail.unshift({ x: p.x, y: p.y, alpha: 0.8 });
      if (p.trail.length > 5) p.trail.pop();
      p.trail.forEach((t) => (t.alpha *= 0.85));

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Check collision with paddle (circle vs rectangle)
      if (
        this.paddleGracePeriod <= 0 &&
        p.x >= paddle.x - p.radius &&
        p.x <= paddle.x + paddle.width + p.radius &&
        p.y >= paddle.y - p.radius &&
        p.y <= paddle.y + paddle.height + p.radius
      ) {
        this.projectiles.splice(i, 1);
        this.paddleGracePeriod = 0.5; // Prevent multi-hit within 0.5s
        this.audio.playPaddleHitByBoss();
        this.particles.spawnBrickBurst(p.x, p.y, p.color, 16, true);
        onPaddleHit(p);
        continue;
      }

      // Remove projectile if it falls off bottom
      if (p.y > this.arenaHeight + 20) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Render boss targeting lasers, energy projectiles, and HP status aura
   */
  public render(ctx: CanvasRenderingContext2D, paddle: Paddle) {
    if (!this.isBossActive) return;

    ctx.save();

    // 1. Warning targeting laser lines
    if (this.warningTime > 0) {
      const pulse = 0.4 + Math.sin(performance.now() * 0.03) * 0.35;
      ctx.strokeStyle = `rgba(244, 63, 94, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);

      this.cannonPositions.forEach((cannon) => {
        ctx.beginPath();
        ctx.moveTo(cannon.x, cannon.y);
        ctx.lineTo(paddle.x + paddle.width / 2, paddle.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // 2. Render falling plasma projectiles
    for (const p of this.projectiles) {
      // Draw projectile trail
      for (let j = 0; j < p.trail.length; j++) {
        const t = p.trail[j];
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.radius * (1 - j * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = p.glowColor;
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.fill();
      }

      // Draw plasma bolt core
      ctx.globalAlpha = 1;
      ctx.shadowColor = p.glowColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Outer plasma ring
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 3. Boss Health Bar Overlay at top of arena
    this.renderBossHealthBar(ctx);

    ctx.restore();
  }

  private renderBossHealthBar(ctx: CanvasRenderingContext2D) {
    const barWidth = 320;
    const barHeight = 10;
    const barX = (this.arenaWidth - barWidth) / 2;
    const barY = 22;

    const hpRatio = Math.max(0, Math.min(1, this.currentHp / this.maxHp));

    // Outer frame
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX - 4, barY - 14, barWidth + 8, barHeight + 20, 6);
    ctx.fill();
    ctx.stroke();

    // Boss Name & Phase Title
    ctx.font = '700 11px Outfit, sans-serif';
    ctx.fillStyle = '#fecdd3';
    ctx.textAlign = 'left';
    ctx.fillText(`⚔️ ${this.bossName}`, barX, barY - 3);

    ctx.textAlign = 'right';
    ctx.fillStyle = this.phase === 3 ? '#f43f5e' : this.phase === 2 ? '#fb923c' : '#38bdf8';
    ctx.fillText(`PHASE ${this.phase} · ${this.currentHp}/${this.maxHp} HP`, barX + barWidth, barY - 3);

    // HP Bar Track
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(barX, barY + 1, barWidth, barHeight, 3);
    ctx.fill();

    // HP Bar Fill Gradient
    const fillWidth = barWidth * hpRatio;
    if (fillWidth > 0) {
      const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
      if (this.phase === 3) {
        fillGrad.addColorStop(0, '#f43f5e');
        fillGrad.addColorStop(1, '#e11d48');
      } else if (this.phase === 2) {
        fillGrad.addColorStop(0, '#f97316');
        fillGrad.addColorStop(1, '#ea580c');
      } else {
        fillGrad.addColorStop(0, '#06b6d4');
        fillGrad.addColorStop(1, '#0284c7');
      }
      ctx.fillStyle = fillGrad;
      ctx.shadowColor = this.phase === 3 ? '#f43f5e' : '#06b6d4';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(barX, barY + 1, fillWidth, barHeight, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /**
   * Render boss projectiles and HP bar from a recorded replay frame
   */
  public renderReplayOverlay(
    ctx: CanvasRenderingContext2D,
    projectiles: BossProjectile[],
    bossInfo?: BossInfo
  ) {
    if (!bossInfo?.isBoss && projectiles.length === 0) return;

    ctx.save();
    for (const p of projectiles) {
      for (let j = 0; j < p.trail.length; j++) {
        const t = p.trail[j];
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.radius * (1 - j * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = p.glowColor;
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = p.glowColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (bossInfo?.isBoss) {
      const prevName = this.bossName;
      const prevCur = this.currentHp;
      const prevMax = this.maxHp;
      const prevPhase = this.phase;
      this.bossName = bossInfo.name;
      this.currentHp = bossInfo.currentHp;
      this.maxHp = Math.max(1, bossInfo.maxHp);
      this.phase = bossInfo.phase;
      this.renderBossHealthBar(ctx);
      this.bossName = prevName;
      this.currentHp = prevCur;
      this.maxHp = prevMax;
      this.phase = prevPhase;
    }
    ctx.restore();
  }

  public reset() {
    this.isBossActive = false;
    this.projectiles = [];
    this.warningTime = 0;
    this.fireTimer = 2.5;
  }
}
