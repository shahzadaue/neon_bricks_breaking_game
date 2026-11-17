/**
 * Particle System: High-performance visual effects engine handling
 * brick-type color-matched destruction bursts, shockwave rings,
 * paddle impact sparks, and floating score/power-up notifications.
 */

import { Brick, Particle, FloatingText } from './types';

interface BurstRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  lineWidth: number;
}

interface BrickTypeBurstConfig {
  primaryColor: string;
  palette: string[];
  count: number;
  speedMult: number;
  hasShockwave: boolean;
  shockwaveRadius: number;
  doubleRing?: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private rings: BurstRing[] = [];
  private floatingTexts: FloatingText[] = [];
  private maxParticles: number = 420;

  /**
   * Resolve burst colors and intensity tailored to the destroyed brick's type
   */
  public getBrickTypeBurstConfig(brick: Brick): BrickTypeBurstConfig {
    const baseColor = this.normalizeHex(brick.color || '#06b6d4');

    if (brick.isBossCore) {
      return {
        primaryColor: '#fbbf24',
        palette: ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff'],
        count: 42,
        speedMult: 1.5,
        hasShockwave: true,
        shockwaveRadius: 68,
        doubleRing: true,
      };
    }

    if (brick.isBossCannon) {
      return {
        primaryColor: '#f43f5e',
        palette: ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#ffffff'],
        count: 34,
        speedMult: 1.3,
        hasShockwave: true,
        shockwaveRadius: 52,
      };
    }

    if (brick.type === 'explosive' || brick.isExplosive) {
      return {
        primaryColor: '#f97316',
        palette: ['#f97316', '#ef4444', '#facc15', '#fb923c', '#ffffff'],
        count: 40,
        speedMult: 1.45,
        hasShockwave: true,
        shockwaveRadius: 75,
        doubleRing: true,
      };
    }

    if (brick.type === 'armored') {
      return {
        primaryColor: baseColor,
        palette: [
          baseColor,
          this.lightenHex(baseColor, 0.35),
          '#fbbf24',
          this.darkenHex(baseColor, 0.2),
          '#ffffff',
        ],
        count: 32,
        speedMult: 1.25,
        hasShockwave: true,
        shockwaveRadius: 48,
      };
    }

    if (brick.type === 'strong') {
      return {
        primaryColor: baseColor,
        palette: [
          baseColor,
          this.lightenHex(baseColor, 0.35),
          this.lightenHex(baseColor, 0.55),
          this.darkenHex(baseColor, 0.2),
          '#ffffff',
        ],
        count: 26,
        speedMult: 1.12,
        hasShockwave: true,
        shockwaveRadius: 38,
      };
    }

    if (brick.type === 'unbreakable') {
      return {
        primaryColor: '#94a3b8',
        palette: ['#94a3b8', '#cbd5e1', '#64748b', '#f8fafc'],
        count: 10,
        speedMult: 0.9,
        hasShockwave: false,
        shockwaveRadius: 0,
      };
    }

    // Standard brick
    return {
      primaryColor: baseColor,
      palette: [
        baseColor,
        baseColor,
        this.lightenHex(baseColor, 0.4),
        this.darkenHex(baseColor, 0.25),
        '#ffffff',
      ],
      count: 22,
      speedMult: 1.0,
      hasShockwave: false,
      shockwaveRadius: 0,
    };
  }

  /**
   * Trigger a full brick destruction burst with colors and physics tuned to the brick type.
   */
  public spawnBrickDestructionBurst(
    brick: Brick,
    impactX?: number,
    impactY?: number
  ) {
    const config = this.getBrickTypeBurstConfig(brick);
    const centerX = brick.x + brick.width / 2;
    const centerY = brick.y + brick.height / 2;
    const originX = impactX !== undefined && impactX > 0 ? impactX : centerX;
    const originY = impactY !== undefined && impactY > 0 ? impactY : centerY;

    // 1. Expanding shockwave ring(s) for heavy/special brick types
    if (config.hasShockwave) {
      this.rings.push({
        x: centerX,
        y: centerY,
        radius: 6,
        maxRadius: config.shockwaveRadius,
        life: 0.28,
        maxLife: 0.28,
        color: config.primaryColor,
        lineWidth: brick.type === 'explosive' || brick.isExplosive ? 3 : 2,
      });

      if (config.doubleRing) {
        this.rings.push({
          x: originX,
          y: originY,
          radius: 4,
          maxRadius: config.shockwaveRadius * 0.65,
          life: 0.22,
          maxLife: 0.22,
          color: '#facc15',
          lineWidth: 2,
        });
      }
    }

    // 2. Debris shards + glowing sparks radiating outward matching brick type colors
    for (let i = 0; i < config.count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      // Mix spawn origins across the brick body and exact impact point
      const fromBrickBody = i % 2 === 0;
      const sx = fromBrickBody
        ? brick.x + Math.random() * brick.width
        : originX + (Math.random() - 0.5) * 10;
      const sy = fromBrickBody
        ? brick.y + Math.random() * brick.height
        : originY + (Math.random() - 0.5) * 8;

      const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.45;
      const speed = (75 + Math.random() * 210) * config.speedMult;
      const life = 0.34 + Math.random() * 0.38;
      const color = config.palette[Math.floor(Math.random() * config.palette.length)];

      // Choose particle shape based on role: shards (square), streaks (spark), embers (circle)
      const shapeRoll = Math.random();
      const shape: Particle['shape'] =
        shapeRoll < 0.42 ? 'square' : shapeRoll < 0.78 ? 'spark' : 'circle';

      this.particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (shape === 'square' ? 35 : 15),
        life,
        maxLife: life,
        size:
          shape === 'square'
            ? 3.2 + Math.random() * 3.8
            : shape === 'spark'
            ? 2.0 + Math.random() * 1.8
            : 2.5 + Math.random() * 3.0,
        color,
        alpha: 1.0,
        shape,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 14,
        gravity: shape === 'square' ? 240 : 90,
      });
    }
  }

  /**
   * Spawn crisp impact sparks when a multi-hit or unbreakable brick absorbs a hit without breaking.
   */
  public spawnBrickHitSparks(brick: Brick, impactX: number, impactY: number) {
    const config = this.getBrickTypeBurstConfig(brick);
    const count = brick.type === 'unbreakable' ? 9 : 11;

    // Reflect damaged tint on multi-hit bricks when low on HP
    let activeColor = config.primaryColor;
    if (brick.isDestructible && brick.maxHp > 1) {
      const hpRatio = brick.currentHp / brick.maxHp;
      if (hpRatio < 0.4) activeColor = '#ef4444';
      else if (hpRatio < 0.7) activeColor = '#f59e0b';
    }

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 145;
      const life = 0.2 + Math.random() * 0.22;
      const color = i % 3 === 0 ? '#ffffff' : activeColor;

      this.particles.push({
        x: impactX,
        y: impactY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 1.8 + Math.random() * 1.8,
        color,
        alpha: 1.0,
        shape: i % 2 === 0 ? 'spark' : 'circle',
        gravity: 80,
      });
    }
  }

  /**
   * Spawn a radial explosion of sparks when a brick is hit or destroyed
   */
  public spawnBrickBurst(
    x: number,
    y: number,
    color: string,
    count: number = 16,
    isDestruction: boolean = false
  ) {
    const speedMult = isDestruction ? 2.4 : 1.2;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift(); // Evict oldest
      }

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = (60 + Math.random() * 180) * speedMult;
      const life = 0.35 + Math.random() * 0.35;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: isDestruction ? 3 + Math.random() * 3 : 2 + Math.random() * 2,
        color,
        alpha: 1.0,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 10,
      });
    }
  }

  /**
   * Spawn sparks on paddle contact
   */
  public spawnPaddleSparks(x: number, y: number, hitOffset: number) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      // Fan upwards away from paddle
      const angle = -Math.PI / 2 + hitOffset * 0.5 + (Math.random() - 0.5) * 0.8;
      const speed = 70 + Math.random() * 130;
      const life = 0.2 + Math.random() * 0.2;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 2,
        color: '#38bdf8',
        alpha: 0.9,
        shape: 'spark',
      });
    }
  }

  /**
   * Spawn a colorful particle explosion at the point of impact
   */
  public spawnColorfulImpactExplosion(
    x: number,
    y: number,
    themeColor: string,
    count: number = 28
  ) {
    const palette = [
      themeColor,
      themeColor,
      '#ffffff',
      '#facc15',
      '#38bdf8',
      '#ec4899',
      '#a855f7',
      '#34d399',
    ];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = 70 + Math.random() * 240;
      const life = 0.45 + Math.random() * 0.4;
      const color = palette[Math.floor(Math.random() * palette.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 3 + Math.random() * 3.5,
        color,
        alpha: 1.0,
        shape: Math.random() > 0.6 ? 'square' : Math.random() > 0.3 ? 'circle' : 'spark',
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 10,
      });
    }
  }

  /**
   * Spawn a sleek floating notification badge (e.g. '+ MULTI-BALL') above the paddle
   * with smooth fade-out and pop-in animation.
   */
  public spawnFloatingBadge(
    x: number,
    y: number,
    text: string,
    color: string,
    duration: number = 1.3
  ) {
    this.floatingTexts.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      vy: -32,
      text,
      color,
      alpha: 1.0,
      life: duration,
      maxLife: duration,
      isBadge: true,
      scale: 0.85,
    });
  }

  /**
   * Spawn floating score indicator
   */
  public spawnFloatingText(x: number, y: number, text: string, color: string = '#38bdf8') {
    this.floatingTexts.push({
      id: Math.random().toString(36).substring(2, 9),
      x,
      y,
      vy: -55,
      text,
      color,
      alpha: 1.0,
      life: 0.7,
      maxLife: 0.7,
    });
  }

  /**
   * Update particle positions, velocities, shockwave rings, and lifetimes
   */
  public update(dt: number) {
    // 1. Update shockwave rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const progress = 1 - r.life / r.maxLife;
      const eased = 1 - Math.pow(1 - progress, 2);
      r.radius = 6 + (r.maxRadius - 6) * eased;
    }

    // 2. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity ?? 120) * dt;
      const drag = Math.pow(0.96, dt * 60);
      p.vx *= drag;
      p.vy *= p.shape === 'spark' ? drag : 1;
      if (p.rotation !== undefined && p.vr !== undefined) {
        p.rotation += p.vr * dt;
      }
      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    // 3. Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      t.y += t.vy * dt;
      t.alpha = Math.max(0, t.life / t.maxLife);
    }
  }

  /**
   * Render shockwave rings, particles, and floating numbers / notification badges
   */
  public render(ctx: CanvasRenderingContext2D) {
    // 1. Render expanding shockwave rings
    for (const r of this.rings) {
      const alpha = Math.max(0, r.life / r.maxLife);
      if (alpha <= 0.02) continue;

      ctx.save();
      ctx.globalAlpha = alpha * 0.75;
      ctx.strokeStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = r.lineWidth * alpha;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Render particles
    for (const p of this.particles) {
      if (p.alpha <= 0.02) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      if (p.shape === 'square') {
        ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) {
          ctx.rotate(p.rotation);
        }
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.78);
      } else if (p.shape === 'spark') {
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const tailLen = Math.min(14, Math.max(4, speed * 0.035));
        const dx = (p.vx / speed) * tailLen;
        const dy = (p.vy / speed) * tailLen;
        ctx.lineWidth = Math.max(1.2, p.size * 0.75);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - dx, p.y - dy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 3. Render floating texts & notification badges
    for (const t of this.floatingTexts) {
      if (t.alpha <= 0.02) continue;

      ctx.save();
      if (t.isBadge) {
        const elapsed = 1 - t.life / t.maxLife;
        const scale =
          elapsed < 0.2
            ? 0.85 + (elapsed / 0.2) * 0.23
            : Math.max(0.9, 1.08 - (elapsed - 0.2) * 0.18);
        const fade =
          elapsed < 0.45 ? 1 : Math.pow(Math.max(0, (1 - elapsed) / 0.55), 1.3);

        ctx.globalAlpha = Math.min(1, fade);
        ctx.translate(t.x, t.y);
        ctx.scale(scale, scale);

        ctx.font = 'bold 13px Outfit, -apple-system, sans-serif';
        const textMetrics = ctx.measureText(t.text);
        const paddingX = 14;
        const badgeW = textMetrics.width + paddingX * 2;
        const badgeH = 26;

        ctx.fillStyle = 'rgba(7, 10, 18, 0.9)';
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, badgeH / 2);
        ctx.fill();

        ctx.strokeStyle = t.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.text, 0, 1);
      } else {
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    }
  }

  /**
   * Lightweight emissive-only pass for the offscreen Neon Bloom buffer (skips per-particle shadowBlur)
   */
  public renderEmissive(ctx: CanvasRenderingContext2D) {
    for (const r of this.rings) {
      const alpha = Math.max(0, r.life / r.maxLife);
      if (alpha <= 0.03) continue;

      ctx.save();
      ctx.globalAlpha = alpha * 0.95;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * alpha + 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      if (p.alpha <= 0.05) continue;

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.alpha * 1.1);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'square') {
        ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) {
          ctx.rotate(p.rotation);
        }
        const s = p.size * 1.35;
        ctx.fillRect(-s / 2, -s / 2, s, s * 0.85);
      } else if (p.shape === 'spark') {
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const tailLen = Math.min(16, Math.max(5, speed * 0.04));
        const dx = (p.vx / speed) * tailLen;
        const dy = (p.vy / speed) * tailLen;
        ctx.lineWidth = Math.max(2, p.size * 1.15);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - dx, p.y - dy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  public clear() {
    this.particles = [];
    this.rings = [];
    this.floatingTexts = [];
  }

  private normalizeHex(hex: string): string {
    if (!hex.startsWith('#')) return '#06b6d4';
    const clean = hex.slice(1);
    if (clean.length === 3) {
      return (
        '#' +
        clean
          .split('')
          .map((c) => c + c)
          .join('')
      );
    }
    return clean.length === 6 ? hex : '#06b6d4';
  }

  private lightenHex(hex: string, amount: number): string {
    const clean = this.normalizeHex(hex).slice(1);
    const num = parseInt(clean, 16);
    const r = Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amount));
    const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amount));
    const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenHex(hex: string, amount: number): string {
    const clean = this.normalizeHex(hex).slice(1);
    const num = parseInt(clean, 16);
    const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - amount)));
    const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - amount)));
    const b = Math.max(0, Math.floor((num & 255) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
