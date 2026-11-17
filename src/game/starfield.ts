/**
 * Parallax Dynamic Multi-Cosmos Background Engine
 * Features 10 distinct cosmic themes (one per 10-level chapter) with rotating
 * galaxies, pulsars, black hole event horizons, warp tunnels, and nebulae,
 * along with per-level celestial variations and paddle-reactive 3D parallax.
 */

export interface Star {
  baseX: number;
  baseY: number;
  layer: number; // 0 = distant dust, 1 = mid-field stars, 2 = near bright stars
  radius: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  alpha: number;
  color: string;
  hasSpike: boolean;
}

export type CosmosType =
  | 'CYBER_PULSAR'
  | 'EMERALD_SPIRAL'
  | 'SOLAR_CORONA'
  | 'CRIMSON_SUPERNOVA'
  | 'BLACK_HOLE_SINGULARITY'
  | 'ORION_NURSERY'
  | 'HYPERSPACE_WARP'
  | 'RADIO_QUASAR'
  | 'MAGENTA_MAELSTROM'
  | 'APEX_STARGATE';

export class Starfield {
  private arenaWidth: number;
  private arenaHeight: number;
  private stars: Star[] = [];
  private themeColor: string = '#06b6d4';

  // Level and chapter tracking
  private currentLevel: number = 1;
  private chapterIndex: number = 1;
  private cosmosType: CosmosType = 'CYBER_PULSAR';

  // Parallax smooth interpolation
  private currentOffsetX: number = 0;
  private targetOffsetX: number = 0;
  private currentOffsetY: number = 0;
  private targetOffsetY: number = 0;

  // Background drift time
  private driftY: number = 0;
  private cosmosRotation: number = 0;

  constructor(arenaWidth: number, arenaHeight: number, count: number = 150) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.initStars(count);
  }

  /**
   * Update current level and dynamically switch galaxy/space theme
   */
  public setLevel(level: number, chapterIndex?: number, themeHue?: string) {
    this.currentLevel = Math.max(1, Math.min(1000, level));
    const chIdx = chapterIndex ?? Math.ceil(this.currentLevel / 10);
    this.chapterIndex = Math.max(1, Math.min(100, chIdx));

    if (themeHue) {
      this.themeColor = themeHue;
    }

    // Select distinct cosmic galaxy background after every 10 stages
    const cosmosMap: CosmosType[] = [
      'CYBER_PULSAR',
      'EMERALD_SPIRAL',
      'SOLAR_CORONA',
      'CRIMSON_SUPERNOVA',
      'BLACK_HOLE_SINGULARITY',
      'ORION_NURSERY',
      'HYPERSPACE_WARP',
      'RADIO_QUASAR',
      'MAGENTA_MAELSTROM',
      'APEX_STARGATE',
    ];

    this.cosmosType = cosmosMap[(this.chapterIndex - 1) % cosmosMap.length] || 'CYBER_PULSAR';
  }

  public setThemeColor(color: string) {
    this.themeColor = color;
  }

  private initStars(count: number) {
    this.stars = [];
    const starColors = [
      '#ffffff',
      '#f8fafc',
      '#e0f2fe',
      '#bae6fd',
      '#e0e7ff',
      '#fbcfe8',
      '#fef08a',
    ];

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let layer = 0;
      let radius = 0.75 + Math.random() * 0.45;
      let alpha = 0.25 + Math.random() * 0.35;
      let hasSpike = false;

      if (roll > 0.84) {
        layer = 2;
        radius = 1.8 + Math.random() * 0.9;
        alpha = 0.75 + Math.random() * 0.25;
        hasSpike = Math.random() > 0.35;
      } else if (roll > 0.48) {
        layer = 1;
        radius = 1.1 + Math.random() * 0.6;
        alpha = 0.45 + Math.random() * 0.4;
        hasSpike = false;
      }

      this.stars.push({
        baseX: Math.random() * this.arenaWidth,
        baseY: Math.random() * this.arenaHeight,
        layer,
        radius,
        twinkleSpeed: 1.5 + Math.random() * 3.5,
        twinkleOffset: Math.random() * Math.PI * 2,
        alpha,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        hasSpike,
      });
    }
  }

  /**
   * Update parallax offsets according to paddle position and velocity
   */
  public update(dt: number, paddleCenterX: number, paddleVx: number = 0) {
    // Continuous drift speed varies slightly per level for distinct sensation
    const baseDrift = 12 + (this.currentLevel % 5) * 3;
    this.driftY = (this.driftY + dt * baseDrift) % this.arenaHeight;
    this.cosmosRotation += dt * 0.18;

    // Center offset: [-1, +1] where 0 is center of arena
    const normalizedCenter = (paddleCenterX - this.arenaWidth / 2) / (this.arenaWidth / 2);
    const clampedNorm = Math.max(-1.1, Math.min(1.1, normalizedCenter));

    // Dynamic horizontal target offset combining paddle position & subtle velocity tilt
    const velocityFactor = Math.max(-45, Math.min(45, paddleVx * 0.04));
    this.targetOffsetX = clampedNorm * 28 + velocityFactor;
    this.targetOffsetY = Math.abs(clampedNorm) * 6;

    // Smooth exponential lerp
    const lerpRate = Math.min(1, dt * 7.5);
    this.currentOffsetX += (this.targetOffsetX - this.currentOffsetX) * lerpRate;
    this.currentOffsetY += (this.targetOffsetY - this.currentOffsetY) * lerpRate;
  }

  /**
   * Render active cosmos celestial feature and multi-layer parallax stars
   */
  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const time = performance.now() * 0.001;

    // 1. Draw distinct Galaxy/Cosmic background feature for the current chapter
    this.drawCosmosFeature(ctx, time);

    // 2. Parallax stars
    const layerScales = [-0.25, -0.65, -1.25];
    const layerSpeedScales = [0.4, 0.8, 1.3];

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const scale = layerScales[star.layer];
      const speedScale = layerSpeedScales[star.layer];

      let x = star.baseX + this.currentOffsetX * scale;
      let y = star.baseY + this.driftY * speedScale + this.currentOffsetY * scale;

      x = ((x % this.arenaWidth) + this.arenaWidth) % this.arenaWidth;
      y = ((y % this.arenaHeight) + this.arenaHeight) % this.arenaHeight;

      const twinkle = 0.7 + 0.3 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const finalAlpha = Math.min(1, star.alpha * twinkle);

      ctx.fillStyle = star.color;
      ctx.globalAlpha = finalAlpha;

      if (star.layer === 2) {
        ctx.shadowColor = star.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        if (star.hasSpike && finalAlpha > 0.7) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.75;
          const spikeLen = star.radius * 2.8;
          ctx.beginPath();
          ctx.moveTo(x - spikeLen, y);
          ctx.lineTo(x + spikeLen, y);
          ctx.moveTo(x, y - spikeLen);
          ctx.lineTo(x, y + spikeLen);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Render distinct thematic space and galaxy backgrounds changing after every 10 stages
   */
  private drawCosmosFeature(ctx: CanvasRenderingContext2D, time: number) {
    const cx = this.arenaWidth / 2 - this.currentOffsetX * 0.3;
    const cy = this.arenaHeight * 0.38 - this.currentOffsetY * 0.2;

    switch (this.cosmosType) {
      case 'CYBER_PULSAR':
        this.renderCyberPulsar(ctx, cx, cy, time);
        break;
      case 'EMERALD_SPIRAL':
        this.renderEmeraldSpiralGalaxy(ctx, cx, cy, time);
        break;
      case 'SOLAR_CORONA':
        this.renderSolarCorona(ctx, cx, cy, time);
        break;
      case 'CRIMSON_SUPERNOVA':
        this.renderCrimsonSupernova(ctx, cx, cy, time);
        break;
      case 'BLACK_HOLE_SINGULARITY':
        this.renderBlackHoleSingularity(ctx, cx, cy, time);
        break;
      case 'ORION_NURSERY':
        this.renderOrionNursery(ctx, cx, cy, time);
        break;
      case 'HYPERSPACE_WARP':
        this.renderHyperspaceWarp(ctx, cx, cy, time);
        break;
      case 'RADIO_QUASAR':
        this.renderRadioQuasar(ctx, cx, cy, time);
        break;
      case 'MAGENTA_MAELSTROM':
        this.renderMagentaMaelstrom(ctx, cx, cy, time);
        break;
      case 'APEX_STARGATE':
        this.renderApexStargate(ctx, cx, cy, time);
        break;
    }
  }

  // 1. Ch 1: Rotating Pulsar Beams & Cyan Deep Space
  private renderCyberPulsar(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    const angle = time * 0.35;
    ctx.save();
    ctx.translate(cx, cy);

    // Pulsar core glow
    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 160);
    coreGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
    coreGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.12)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 160, 0, Math.PI * 2);
    ctx.fill();

    // Dual sweeping light beams
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 320, -0.18, 0.18);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 320, Math.PI - 0.18, Math.PI + 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 2. Ch 2: Emerald Spiral Galaxy with Twirling Arms & Auroras
  private renderEmeraldSpiralGalaxy(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.15);

    // Core glow
    const coreGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 180);
    coreGrad.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
    coreGrad.addColorStop(0.4, 'rgba(16, 185, 129, 0.12)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 180, 0, Math.PI * 2);
    ctx.fill();

    // Dual spiral arms
    ctx.lineWidth = 3;
    for (let arm = 0; arm < 2; arm++) {
      const armOffset = arm * Math.PI;
      ctx.beginPath();
      for (let t = 0; t < 28; t++) {
        const theta = t * 0.18 + armOffset;
        const r = 8 + t * 5.5;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r * 0.65; // Inclined perspective
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = arm === 0 ? 'rgba(52, 211, 153, 0.22)' : 'rgba(16, 185, 129, 0.18)';
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Ch 3: Golden Amber Solar Corona with Solar Winds
  private renderSolarCorona(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy - 30);

    const pulse = 1 + Math.sin(time * 1.5) * 0.05;
    const coronaGrad = ctx.createRadialGradient(0, 0, 45 * pulse, 0, 0, 220);
    coronaGrad.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
    coronaGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.2)');
    coronaGrad.addColorStop(0.7, 'rgba(251, 191, 36, 0.06)');
    coronaGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 220, 0, Math.PI * 2);
    ctx.fill();

    // Solar flare arcs
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (time * 0.2 + (i * Math.PI) / 2) % (Math.PI * 2);
      ctx.beginPath();
      ctx.arc(0, 0, 75 + i * 14, a, a + 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Ch 4: Crimson Supernova Accretion Disk & Cosmic Dust Rings
  private renderCrimsonSupernova(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);

    // Accretion disk ellipse
    ctx.rotate(time * 0.12);
    ctx.scale(1, 0.5);

    const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, 240);
    grad.addColorStop(0, 'rgba(244, 63, 94, 0.6)');
    grad.addColorStop(0.3, 'rgba(225, 29, 72, 0.25)');
    grad.addColorStop(0.7, 'rgba(159, 18, 57, 0.08)');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright hot core
    ctx.fillStyle = '#fff1f2';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Ch 5: Quantum Singularity & Gravitational Lensing Halo (Black Hole)
  private renderBlackHoleSingularity(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);

    // Outer Einstein lensing ring
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();

    // Violet photon sphere glow
    const grad = ctx.createRadialGradient(0, 0, 30, 0, 0, 190);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
    grad.addColorStop(0.5, 'rgba(109, 40, 217, 0.15)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 190, 0, Math.PI * 2);
    ctx.fill();

    // Event Horizon Pitch Black Void
    ctx.fillStyle = '#05070d';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6. Ch 6: Orion Stellar Nursery (Fiery Interstellar Dust Clouds)
  private renderOrionNursery(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    const n1X = cx + Math.sin(time * 0.25) * 35;
    const n1Y = cy + Math.cos(time * 0.2) * 25;
    const grad1 = ctx.createRadialGradient(n1X, n1Y, 15, n1X, n1Y, 210);
    grad1.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
    grad1.addColorStop(0.5, 'rgba(234, 88, 12, 0.12)');
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);

    // Secondary gas cloud
    const n2X = cx - Math.cos(time * 0.2) * 45;
    const n2Y = cy + 90;
    const grad2 = ctx.createRadialGradient(n2X, n2Y, 20, n2X, n2Y, 240);
    grad2.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    grad2.addColorStop(0.6, 'rgba(185, 28, 28, 0.06)');
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
    ctx.restore();
  }

  // 7. Ch 7: Hyperspace Warp Light Tunnel
  private renderHyperspaceWarp(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.28)';
    ctx.lineWidth = 1.5;

    // Warp streaks projecting from center
    const streakCount = 14;
    for (let i = 0; i < streakCount; i++) {
      const angle = (i * Math.PI * 2) / streakCount + time * 0.1;
      const dist1 = 40 + ((time * 120 + i * 25) % 240);
      const dist2 = dist1 + 35;

      const x1 = Math.cos(angle) * dist1;
      const y1 = Math.sin(angle) * dist1;
      const x2 = Math.cos(angle) * dist2;
      const y2 = Math.sin(angle) * dist2;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 8. Ch 8: Relativistic Radio Quasar Jet
  private renderRadioQuasar(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4 + Math.sin(time * 0.2) * 0.08);

    // Quasar plasma jet
    const jetGrad = ctx.createLinearGradient(0, -250, 0, 250);
    jetGrad.addColorStop(0, 'transparent');
    jetGrad.addColorStop(0.3, 'rgba(132, 204, 22, 0.08)');
    jetGrad.addColorStop(0.5, 'rgba(163, 230, 53, 0.45)');
    jetGrad.addColorStop(0.7, 'rgba(132, 204, 22, 0.08)');
    jetGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = jetGrad;
    ctx.fillRect(-12, -260, 24, 520);

    // Center accretion core
    ctx.fillStyle = '#ecfccb';
    ctx.shadowColor = '#84cc16';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 9. Ch 9: Magenta Maelstrom Barred Spiral Galaxy
  private renderMagentaMaelstrom(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-time * 0.2);

    // Core glow
    const coreGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 200);
    coreGrad.addColorStop(0, 'rgba(217, 70, 239, 0.55)');
    coreGrad.addColorStop(0.4, 'rgba(192, 38, 211, 0.18)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 200, 0, Math.PI * 2);
    ctx.fill();

    // Central stellar bar
    ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(-75, -8, 150, 16, 8);
    ctx.fill();
    ctx.restore();
  }

  // 10. Ch 10: Apex Prismatic Stargate Ring
  private renderApexStargate(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
    ctx.save();
    ctx.translate(cx, cy);

    // Rotating stargate ring
    ctx.rotate(time * 0.25);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating glyph nodes
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const gx = Math.cos(a) * 95;
      const gy = Math.sin(a) * 95;
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner rainbow prismatic singularity
    const rainbowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 85);
    rainbowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    rainbowGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.35)');
    rainbowGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
    rainbowGrad.addColorStop(0.75, 'rgba(244, 63, 94, 0.18)');
    rainbowGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = rainbowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
