/**
 * Procedural Multi-Layered Background Environment Renderer
 * 
 * Features:
 * - 60 FPS GPU-efficient canvas drawing with zero memory allocations inside update loop
 * - Dynamic procedural sky dome, celestial bodies, environmental silhouettes, and grids
 * - Paddle-driven 3D parallax reaction and ambient drift
 * - Strict Gameplay Contrast Safety Layer: Enforces dark semi-transparent veil over
 *   the brick area so bricks, ball, and paddle always pop with 100% crisp visibility
 * - Lightweight static thumbnail rendering for Background Gallery cards
 */

import {
  BackgroundEnvironment,
  getBackgroundById,
} from './background-data';

export interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  vRot: number;
}

export class BackgroundRenderer {
  private arenaWidth: number;
  private arenaHeight: number;
  private currentBg: BackgroundEnvironment;
  private particles: BackgroundParticle[] = [];
  private time: number = 0;

  // Parallax offsets
  private currentOffsetX: number = 0;
  private targetOffsetX: number = 0;
  private currentOffsetY: number = 0;
  private targetOffsetY: number = 0;

  // Cached starfield points for space/night categories
  private starSeeds: Array<{ x: number; y: number; r: number; a: number; speed: number }> = [];

  constructor(arenaWidth: number, arenaHeight: number, initialBgId: string = 'BG001') {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.currentBg = getBackgroundById(initialBgId);
    this.initStarSeeds(60);
    this.reinitParticles();
  }

  public setBackground(bg: BackgroundEnvironment) {
    if (this.currentBg.backgroundId === bg.backgroundId) return;
    this.currentBg = bg;
    this.reinitParticles();
  }

  public getCurrentBackground(): BackgroundEnvironment {
    return this.currentBg;
  }

  private initStarSeeds(count: number) {
    this.starSeeds = [];
    for (let i = 0; i < count; i++) {
      this.starSeeds.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.8 + Math.random() * 1.5,
        a: 0.2 + Math.random() * 0.7,
        speed: 1.5 + Math.random() * 3.5,
      });
    }
  }

  private reinitParticles() {
    this.particles = [];
    const count = this.currentBg.renderConfig.particleCount || 20;
    const style = this.currentBg.renderConfig.particleStyle;

    if (style === 'NONE') return;

    for (let i = 0; i < count; i++) {
      let vy = 15 + Math.random() * 25;
      let vx = (Math.random() - 0.5) * 10;
      let size = 2 + Math.random() * 3;

      if (style === 'BUBBLES') {
        vy = -(20 + Math.random() * 35);
        vx = (Math.random() - 0.5) * 15;
        size = 2 + Math.random() * 5;
      } else if (style === 'EMBERS') {
        vy = -(25 + Math.random() * 45);
        vx = (Math.random() - 0.5) * 20;
        size = 1.5 + Math.random() * 3;
      } else if (style === 'PETALS') {
        vy = 20 + Math.random() * 30;
        vx = 15 + Math.random() * 25;
        size = 3 + Math.random() * 4;
      } else if (style === 'SNOW') {
        vy = 25 + Math.random() * 35;
        vx = (Math.random() - 0.5) * 15;
        size = 1.5 + Math.random() * 2.5;
      } else if (style === 'MATRIX_GLYPHS') {
        vy = 65 + Math.random() * 95;
        vx = 0;
        size = 3;
      }

      this.particles.push({
        x: Math.random() * this.arenaWidth,
        y: Math.random() * this.arenaHeight,
        vx,
        vy,
        size,
        alpha: 0.3 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 2,
      });
    }
  }

  /**
   * Update particle positions, celestial motion, and paddle-driven parallax
   */
  public update(dt: number, paddleCenterX: number, paddleVx: number = 0) {
    this.time += dt;

    // Paddle parallax smooth lerp
    const normalizedCenter = (paddleCenterX - this.arenaWidth / 2) / (this.arenaWidth / 2);
    const clampedNorm = Math.max(-1.1, Math.min(1.1, normalizedCenter));
    const velocityFactor = Math.max(-30, Math.min(30, paddleVx * 0.03));
    this.targetOffsetX = clampedNorm * 22 + velocityFactor;
    this.targetOffsetY = Math.abs(clampedNorm) * 5;

    const lerpRate = Math.min(1, dt * 7);
    this.currentOffsetX += (this.targetOffsetX - this.currentOffsetX) * lerpRate;
    this.currentOffsetY += (this.targetOffsetY - this.currentOffsetY) * lerpRate;

    // Update ambient particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      // Wrap around arena boundaries
      if (p.vy < 0 && p.y < -20) {
        p.y = this.arenaHeight + 10;
        p.x = Math.random() * this.arenaWidth;
      } else if (p.vy > 0 && p.y > this.arenaHeight + 20) {
        p.y = -10;
        p.x = Math.random() * this.arenaWidth;
      }

      if (p.x < -20) p.x = this.arenaWidth + 10;
      if (p.x > this.arenaWidth + 20) p.x = -10;
    }
  }

  /**
   * Main Arena Canvas Render with all visual layers and strict gameplay contrast safety veil
   */
  public render(ctx: CanvasRenderingContext2D) {
    const w = this.arenaWidth;
    const h = this.arenaHeight;
    const bg = this.currentBg;
    const p = bg.palette;
    const cfg = bg.renderConfig;

    ctx.save();

    // Layer 1: Sky Dome Atmospheric Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, p.skyTop);
    skyGrad.addColorStop(0.55, p.skyMid);
    skyGrad.addColorStop(1, p.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Layer 2: Distant Starfield if enabled
    if (cfg.starfieldIntensity > 0) {
      this.drawStarfield(ctx, w, h, cfg.starfieldIntensity);
    }

    // Layer 3: Horizon Glow & Light Rays
    if (cfg.hasHorizonHaze) {
      this.drawHorizonGlow(ctx, w, h, p.horizonGlow);
    }
    if (cfg.lightRayIntensity > 0) {
      this.drawLightRays(ctx, w, h, p.accentColor, cfg.lightRayIntensity);
    }

    // Layer 4: Celestial Feature / Focal Element (Parallax scaled 0.25)
    ctx.save();
    ctx.translate(this.currentOffsetX * 0.25, this.currentOffsetY * 0.25);
    this.drawCelestial(ctx, w, h, cfg.celestial, p);
    ctx.restore();

    // Layer 5: Perspective Ground Grid if enabled
    if (cfg.hasGrid) {
      this.drawGrid(ctx, w, h, p.gridColor || 'rgba(56, 189, 248, 0.12)', cfg.gridPerspective);
    }

    // Layer 6: Midground Environmental Silhouette (Parallax scaled 0.6)
    ctx.save();
    ctx.translate(this.currentOffsetX * 0.6, this.currentOffsetY * 0.6);
    this.drawSilhouette(ctx, w, h, cfg.silhouette, p);
    ctx.restore();

    // Layer 7: Ambient Thematic Particles
    this.drawParticles(ctx, cfg.particleStyle, p.particleColor);

    // Layer 8: CRITICAL GAMEPLAY CONTRAST SAFETY VEIL
    // Guarantees bricks, ball, and paddle stand out sharply with zero visual clashing
    this.drawGameplaySafetyVeil(ctx, w, h, p.vignetteAlpha);

    ctx.restore();
  }

  /**
   * Draws distant twinkling stars
   */
  private drawStarfield(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
    ctx.save();
    for (const s of this.starSeeds) {
      const alpha = s.a * intensity * (0.6 + 0.4 * Math.sin(this.time * s.speed + s.x * 10));
      if (alpha <= 0.05) continue;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h * 0.8, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Horizon radial glow
   */
  private drawHorizonGlow(ctx: CanvasRenderingContext2D, w: number, h: number, glowColor: string) {
    const horizonY = h * 0.72;
    const radGrad = ctx.createRadialGradient(w / 2, horizonY, 10, w / 2, horizonY, w * 0.75);
    radGrad.addColorStop(0, glowColor);
    radGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, horizonY - 180, w, 280);
    ctx.restore();
  }

  /**
   * Subtle ambient light rays
   */
  private drawLightRays(ctx: CanvasRenderingContext2D, w: number, h: number, rayColor: string, intensity: number) {
    ctx.save();
    ctx.globalAlpha = intensity * 0.18;
    ctx.strokeStyle = rayColor;
    ctx.lineWidth = 40;

    const sourceX = w / 2;
    const sourceY = h * 0.2;

    for (let i = -3; i <= 3; i++) {
      const sway = Math.sin(this.time * 0.4 + i) * 20;
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(w / 2 + i * 110 + sway, h);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Procedural Celestial Bodies & Deep Focal Elements
   */
  private drawCelestial(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    type: string,
    p: BackgroundEnvironment['palette']
  ) {
    if (type === 'NONE') return;

    ctx.save();
    const cx = w * 0.5;
    const cy = h * 0.28;

    switch (type) {
      case 'CYBER_MOON': {
        const radius = 55;
        // Outer halo
        ctx.shadowColor = p.accentColor;
        ctx.shadowBlur = 35;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Digital slice scanlines
        ctx.strokeStyle = p.skyTop;
        ctx.lineWidth = 3;
        for (let y = cy - radius + 10; y < cy + radius; y += 12) {
          ctx.beginPath();
          ctx.moveTo(cx - radius, y);
          ctx.lineTo(cx + radius, y);
          ctx.stroke();
        }
        break;
      }

      case 'GALAXY_SPIRAL': {
        ctx.translate(cx, cy);
        ctx.rotate(this.time * 0.08);
        ctx.shadowColor = p.accentColor;
        ctx.shadowBlur = 25;

        for (let arm = 0; arm < 3; arm++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.strokeStyle = p.accentColor;
          ctx.lineWidth = 14;
          ctx.globalAlpha = 0.22;
          for (let r = 10; r < 90; r += 5) {
            const theta = r * 0.08;
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r;
            if (r === 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // Core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'NEBULA_CLOUD': {
        const rad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110);
        rad.addColorStop(0, p.accentColor);
        rad.addColorStop(0.5, p.horizonGlow);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'SOLAR_CORONA': {
        const radius = 48;
        ctx.shadowColor = p.accentColor;
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Corona flares
        ctx.strokeStyle = p.accentColor;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 4;
        const flareCount = 12;
        for (let i = 0; i < flareCount; i++) {
          const angle = (Math.PI * 2 * i) / flareCount + this.time * 0.15;
          const flareLen = radius + 25 + Math.sin(this.time * 2 + i) * 12;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * (radius + 2), cy + Math.sin(angle) * (radius + 2));
          ctx.lineTo(cx + Math.cos(angle) * flareLen, cy + Math.sin(angle) * flareLen);
          ctx.stroke();
        }
        break;
      }

      case 'BLACK_HOLE': {
        const radius = 42;
        // Accretion disk
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.4);
        ctx.shadowColor = p.accentColor;
        ctx.shadowBlur = 35;
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Dark singularity
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        break;
      }

      case 'PLANET_RINGS': {
        const radius = 38;
        // Planet sphere
        ctx.fillStyle = p.silhouetteSecondary;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Planetary ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.35);
        ctx.scale(1.8, 0.45);
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'SYNTH_SUN': {
        const radius = 60;
        const sunY = h * 0.52;
        ctx.shadowColor = p.accentColor;
        ctx.shadowBlur = 30;

        const sunGrad = ctx.createLinearGradient(cx, sunY - radius, cx, sunY + radius);
        sunGrad.addColorStop(0, '#fef08a');
        sunGrad.addColorStop(0.6, '#f43f5e');
        sunGrad.addColorStop(1, '#a855f7');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(cx, sunY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Horizontal synth slats
        ctx.fillStyle = p.skyBottom;
        for (let i = 0; i < 7; i++) {
          const slatY = sunY + 5 + i * 8;
          const slatH = 2 + i * 0.8;
          ctx.fillRect(cx - radius - 5, slatY, (radius + 5) * 2, slatH);
        }
        break;
      }

      case 'JAPANESE_SUN': {
        const radius = 50;
        ctx.shadowColor = '#e11d48';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#be123c';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'PYRAMID_BEACON': {
        // Mystical beam of light shooting skyward
        const grad = ctx.createLinearGradient(cx - 30, 0, cx + 30, h * 0.7);
        grad.addColorStop(0, 'rgba(234, 179, 8, 0.7)');
        grad.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - 25, h * 0.7);
        ctx.lineTo(cx, 40);
        ctx.lineTo(cx + 25, h * 0.7);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'UNDERWATER_SUNBEAMS': {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#a5f3fc';
        for (let i = -2; i <= 2; i++) {
          const angleOffset = Math.sin(this.time * 0.5 + i) * 15;
          ctx.beginPath();
          ctx.moveTo(cx + i * 45, 0);
          ctx.lineTo(cx + i * 120 + angleOffset, h);
          ctx.lineTo(cx + i * 120 + 40 + angleOffset, h);
          ctx.lineTo(cx + i * 45 + 30, 0);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      case 'DATA_ORB':
      case 'GEOMETRIC_TESSERACT': {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.time * 0.4);
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = p.accentColor;
        ctx.shadowBlur = 18;

        const s = 32;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4);
        ctx.restore();
        break;
      }

      default:
        break;
    }

    ctx.restore();
  }

  /**
   * Perspective grid floor or digital horizon
   */
  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, gridColor: string, isPerspective: boolean) {
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const horizonY = h * 0.65;

    if (isPerspective) {
      // Perspective converging lines to vanishing point
      const vanishingX = w / 2;
      const numLines = 14;
      for (let i = 0; i <= numLines; i++) {
        const x = (w / numLines) * i;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(x * 1.6 - w * 0.3, h);
        ctx.stroke();
      }

      // Horizontal scanlines with exponential spacing
      const numHoriz = 10;
      for (let j = 0; j < numHoriz; j++) {
        const factor = Math.pow(j / numHoriz, 1.8);
        const y = horizonY + factor * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else {
      // Clean orthogonal grid
      const step = 32;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Midground Environmental Silhouettes
   */
  private drawSilhouette(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    type: string,
    p: BackgroundEnvironment['palette']
  ) {
    ctx.save();
    const horizonY = h * 0.68;

    switch (type) {
      case 'CYBER_SKYLINE': {
        // Distant layer
        ctx.fillStyle = p.silhouetteSecondary;
        const bCount = 9;
        const bWidth = w / (bCount - 1);
        for (let i = 0; i < bCount; i++) {
          const bH = 110 + ((i * 37) % 110);
          ctx.fillRect(i * bWidth - 10, horizonY - bH, bWidth + 4, bH + 200);
        }

        // Forefront layer with glowing windows
        ctx.fillStyle = p.silhouetteColor;
        for (let i = 0; i < bCount - 1; i++) {
          const bH = 80 + ((i * 47) % 95);
          const bx = i * bWidth + 14;
          const bw = bWidth - 8;
          ctx.fillRect(bx, horizonY - bH, bw, bH + 200);

          // Neon window lights
          ctx.fillStyle = p.accentColor;
          ctx.globalAlpha = 0.55;
          for (let wy = horizonY - bH + 12; wy < horizonY; wy += 14) {
            ctx.fillRect(bx + 4, wy, 4, 3);
            ctx.fillRect(bx + bw - 8, wy, 4, 3);
          }
          ctx.fillStyle = p.silhouetteColor;
          ctx.globalAlpha = 1.0;
        }
        break;
      }

      case 'EGYPT_PYRAMIDS': {
        ctx.fillStyle = p.silhouetteSecondary;
        // Great pyramid
        ctx.beginPath();
        ctx.moveTo(w * 0.15, horizonY + 30);
        ctx.lineTo(w * 0.5, horizonY - 120);
        ctx.lineTo(w * 0.85, horizonY + 30);
        ctx.closePath();
        ctx.fill();

        // Forefront smaller pyramids & sand dune curve
        ctx.fillStyle = p.silhouetteColor;
        ctx.beginPath();
        ctx.moveTo(w * 0.55, horizonY + 20);
        ctx.lineTo(w * 0.78, horizonY - 60);
        ctx.lineTo(w, horizonY + 20);
        ctx.closePath();
        ctx.fill();

        // Rolling dune
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.quadraticCurveTo(w * 0.4, horizonY - 25, w, horizonY + 15);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'SAKURA_PAGODA': {
        ctx.fillStyle = p.silhouetteColor;
        // Pagoda on right side
        const px = w * 0.72;
        const pw = 70;
        for (let tier = 0; tier < 3; tier++) {
          const ty = horizonY - 110 + tier * 32;
          const tw = pw - tier * 12;
          // Curved eaves
          ctx.beginPath();
          ctx.moveTo(px - tw / 2 - 10, ty + 12);
          ctx.quadraticCurveTo(px, ty, px + tw / 2 + 10, ty + 12);
          ctx.lineTo(px + tw / 2, ty + 24);
          ctx.lineTo(px - tw / 2, ty + 24);
          ctx.closePath();
          ctx.fill();
        }

        // Torii Gate on left
        const tx = w * 0.22;
        ctx.fillRect(tx - 24, horizonY - 65, 6, 75);
        ctx.fillRect(tx + 18, horizonY - 65, 6, 75);
        ctx.fillRect(tx - 32, horizonY - 72, 64, 8); // Top lintel
        ctx.fillRect(tx - 28, horizonY - 60, 56, 5); // Sub lintel
        break;
      }

      case 'ICE_SPIRES': {
        ctx.fillStyle = p.silhouetteColor;
        ctx.beginPath();
        ctx.moveTo(0, horizonY + 20);
        const spireCount = 8;
        for (let i = 0; i <= spireCount; i++) {
          const sx = (w / spireCount) * i;
          const peakH = 90 + ((i * 53) % 80);
          ctx.lineTo(sx - 15, horizonY);
          ctx.lineTo(sx, horizonY - peakH);
          ctx.lineTo(sx + 15, horizonY + 10);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'LAVA_VOLCANO': {
        ctx.fillStyle = p.silhouetteColor;
        ctx.beginPath();
        ctx.moveTo(0, horizonY + 20);
        ctx.lineTo(w * 0.2, horizonY - 40);
        ctx.lineTo(w * 0.42, horizonY - 110);
        ctx.lineTo(w * 0.48, horizonY - 110); // Crater rim
        ctx.lineTo(w * 0.75, horizonY - 30);
        ctx.lineTo(w, horizonY + 20);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Glowing magma fissures
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.45, horizonY - 105);
        ctx.lineTo(w * 0.42, horizonY - 60);
        ctx.lineTo(w * 0.38, horizonY);
        ctx.stroke();
        break;
      }

      case 'UNDERWATER_CORAL': {
        ctx.fillStyle = p.silhouetteColor;
        // Coral mounds
        ctx.beginPath();
        ctx.moveTo(0, horizonY + 20);
        for (let i = 0; i < 6; i++) {
          const cx = 50 + i * 100;
          const r = 35 + (i % 3) * 15;
          ctx.arc(cx, horizonY + 10, r, Math.PI, 0);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'TROPICAL_PALMS': {
        ctx.fillStyle = p.silhouetteColor;
        // Beach curve
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.quadraticCurveTo(w * 0.5, horizonY - 15, w, horizonY + 10);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Palm trunks and fronds
        const palmX = w * 0.2;
        const palmY = horizonY;
        ctx.beginPath();
        ctx.moveTo(palmX, palmY);
        ctx.quadraticCurveTo(palmX + 15, palmY - 60, palmX + 30, palmY - 120);
        ctx.lineWidth = 7;
        ctx.strokeStyle = p.silhouetteColor;
        ctx.stroke();

        // Palm fronds
        const topX = palmX + 30;
        const topY = palmY - 120;
        ctx.lineWidth = 3;
        for (let f = 0; f < 5; f++) {
          const fAngle = -Math.PI / 2 + (f - 2) * 0.55;
          ctx.beginPath();
          ctx.moveTo(topX, topY);
          ctx.quadraticCurveTo(
            topX + Math.cos(fAngle) * 35,
            topY + Math.sin(fAngle) * 20,
            topX + Math.cos(fAngle) * 55,
            topY + Math.sin(fAngle) * 45 + 15
          );
          ctx.stroke();
        }
        break;
      }

      case 'SYNTH_WIREFRAME': {
        // Low-poly mountain ranges
        ctx.fillStyle = p.silhouetteColor;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        const mCount = 6;
        for (let m = 0; m <= mCount; m++) {
          const mx = (w / mCount) * m;
          const my = horizonY - 40 - ((m * 41) % 65);
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(w, horizonY);
        ctx.closePath();
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }

      default: {
        // Universal elegant horizon silhouette
        ctx.fillStyle = p.silhouetteColor;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.quadraticCurveTo(w * 0.5, horizonY - 30, w, horizonY);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Ambient particles (embers, sakura petals, bubbles, snow, matrix glyphs, etc.)
   */
  private drawParticles(ctx: CanvasRenderingContext2D, style: string, color: string) {
    if (style === 'NONE' || this.particles.length === 0) return;

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    for (const p of this.particles) {
      if (p.alpha <= 0.05) continue;
      ctx.globalAlpha = p.alpha;

      if (style === 'PETALS') {
        // Sakura petal oval
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (style === 'BUBBLES') {
        // Hollow bubble with shine
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (style === 'MATRIX_GLYPHS') {
        ctx.font = '10px monospace';
        ctx.fillText(String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)), p.x, p.y);
      } else {
        // Clean round spark / snow / ember
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * CRITICAL GAMEPLAY SAFETY VEIL
   * Enforces that the brick area (top ~60px to 520px) has a dark semi-transparent
   * gradient veil so bricks, ball, and paddle NEVER blend or clash with the background.
   */
  private drawGameplaySafetyVeil(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
    ctx.save();

    // 1. Playfield safety veil (subtle dark tint across brick playfield area)
    const playfieldGrad = ctx.createLinearGradient(0, 0, 0, h);
    playfieldGrad.addColorStop(0, `rgba(5, 8, 16, ${Math.min(0.85, alpha * 1.05)})`);
    playfieldGrad.addColorStop(0.35, `rgba(6, 10, 20, ${alpha * 0.95})`);
    playfieldGrad.addColorStop(0.7, `rgba(5, 8, 16, ${alpha * 0.8})`);
    playfieldGrad.addColorStop(1, `rgba(4, 6, 12, ${alpha * 0.95})`);

    ctx.fillStyle = playfieldGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Playfield boundary side accents
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(1, h);
    ctx.moveTo(w - 1, 0);
    ctx.lineTo(w - 1, h);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Fast static thumbnail renderer for Background Gallery UI preview cards
   */
  public static renderThumbnail(
    canvas: HTMLCanvasElement,
    bg: BackgroundEnvironment
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const p = bg.palette;
    const cfg = bg.renderConfig;

    ctx.save();

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.skyTop);
    sky.addColorStop(0.6, p.skyMid);
    sky.addColorStop(1, p.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Celestial
    if (cfg.celestial !== 'NONE') {
      ctx.fillStyle = p.accentColor;
      ctx.shadowColor = p.accentColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.32, Math.min(w, h) * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horizon glow
    const hY = h * 0.65;
    const rad = ctx.createRadialGradient(w / 2, hY, 4, w / 2, hY, w * 0.6);
    rad.addColorStop(0, p.horizonGlow);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, hY - 30, w, 50);

    // Silhouette
    ctx.fillStyle = p.silhouetteColor;
    ctx.beginPath();
    ctx.moveTo(0, hY);
    ctx.lineTo(w * 0.3, hY - 14);
    ctx.lineTo(w * 0.65, hY - 22);
    ctx.lineTo(w, hY - 8);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Dark veil overlay to show game contrast
    ctx.fillStyle = `rgba(5, 8, 16, ${Math.min(0.55, p.vignetteAlpha * 0.85)})`;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }
}
