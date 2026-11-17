/**
 * Screen-Space Chromatic Aberration Edge Pulse Layer:
 * Captures the rendered arena edge region into an offscreen half-res buffer,
 * splits opposing color-shifting RGB dispersion fringes outward along the border,
 * and pulses rhythmically with an intensity driven by the active combo multiplier.
 */

export class ChromaticAberrationLayer {
  private readonly arenaWidth: number;
  private readonly arenaHeight: number;
  private readonly halfW: number;
  private readonly halfH: number;

  private edgeCanvas: HTMLCanvasElement;
  private edgeCtx: CanvasRenderingContext2D;

  private maskCanvas: HTMLCanvasElement;
  private channelACanvas: HTMLCanvasElement;
  private channelACtx: CanvasRenderingContext2D;
  private channelBCanvas: HTMLCanvasElement;
  private channelBCtx: CanvasRenderingContext2D;

  private time: number = 0;
  private currentIntensity: number = 0;
  private pulseBoost: number = 0;
  private prevCombo: number = 0;

  constructor(arenaWidth: number, arenaHeight: number) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.halfW = Math.max(1, Math.round(arenaWidth * 0.5));
    this.halfH = Math.max(1, Math.round(arenaHeight * 0.5));

    this.edgeCanvas = document.createElement('canvas');
    this.edgeCanvas.width = this.halfW;
    this.edgeCanvas.height = this.halfH;
    const eCtx = this.edgeCanvas.getContext('2d');
    if (!eCtx) throw new Error('Failed to initialize edge canvas context');
    this.edgeCtx = eCtx;

    this.channelACanvas = document.createElement('canvas');
    this.channelACanvas.width = this.halfW;
    this.channelACanvas.height = this.halfH;
    const aCtx = this.channelACanvas.getContext('2d');
    if (!aCtx) throw new Error('Failed to initialize channel A canvas context');
    this.channelACtx = aCtx;

    this.channelBCanvas = document.createElement('canvas');
    this.channelBCanvas.width = this.halfW;
    this.channelBCanvas.height = this.halfH;
    const bCtx = this.channelBCanvas.getContext('2d');
    if (!bCtx) throw new Error('Failed to initialize channel B canvas context');
    this.channelBCtx = bCtx;

    // Pre-render smooth radial edge mask (center 100% clear, perimeter visible)
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = this.halfW;
    this.maskCanvas.height = this.halfH;
    const mCtx = this.maskCanvas.getContext('2d');
    if (!mCtx) throw new Error('Failed to initialize mask canvas context');

    const cx = this.halfW / 2;
    const cy = this.halfH / 2;
    const outerRadius = Math.hypot(cx, cy);
    const grad = mCtx.createRadialGradient(cx, cy, outerRadius * 0.44, cx, cy, outerRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.58, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(0.84, 'rgba(0, 0, 0, 0.78)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 1)');

    mCtx.fillStyle = grad;
    mCtx.fillRect(0, 0, this.halfW, this.halfH);
  }

  /**
   * Trigger a rhythmic impact edge pulse scaled by the active combo multiplier
   */
  public triggerPulse(combo: number) {
    if (combo < 2) return;
    const strength = Math.min(1, 0.25 + (combo - 1) * 0.11);
    this.pulseBoost = Math.min(1.15, Math.max(this.pulseBoost, strength));
  }

  public reset() {
    this.currentIntensity = 0;
    this.pulseBoost = 0;
    this.prevCombo = 0;
  }

  /**
   * Update smooth combo intensity interpolation, color-shift clock, and pulse decay
   */
  public update(dt: number, combo: number) {
    this.time += dt;

    if (combo > this.prevCombo && combo >= 2) {
      this.triggerPulse(combo);
    }
    this.prevCombo = combo;

    // Sustained chromatic edge intensity ramps smoothly from combo 2x upward
    const targetIntensity = combo >= 2 ? Math.min(1, 0.12 + (combo - 2) * 0.11) : 0;
    const lerpSpeed = targetIntensity > this.currentIntensity ? 10 : 5.5;
    const factor = 1 - Math.exp(-lerpSpeed * dt);
    this.currentIntensity += (targetIntensity - this.currentIntensity) * factor;

    if (this.pulseBoost > 0) {
      this.pulseBoost = Math.max(0, this.pulseBoost - dt * 3.1);
    }
  }

  /**
   * Apply screen-space chromatic aberration edge pulse over the rendered canvas
   */
  public apply(mainCtx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, combo: number) {
    const pulseWave = 0.78 + 0.22 * Math.sin(this.time * (4.5 + Math.min(combo, 12) * 0.55));
    const effective = Math.min(1.25, this.currentIntensity * pulseWave + this.pulseBoost * 0.55);

    if (effective < 0.015) return;

    const w = this.halfW;
    const h = this.halfH;

    // 1. Sample rendered main canvas into half-res edge buffer and mask out center playfield
    const eCtx = this.edgeCtx;
    eCtx.save();
    eCtx.setTransform(1, 0, 0, 1, 0, 0);
    eCtx.globalCompositeOperation = 'source-over';
    eCtx.clearRect(0, 0, w, h);
    eCtx.drawImage(sourceCanvas, 0, 0, w, h);
    eCtx.globalCompositeOperation = 'destination-in';
    eCtx.drawImage(this.maskCanvas, 0, 0, w, h);
    eCtx.restore();

    // 2. Color-shifting hue pair (shifts smoothly through neon arcade spectrum with combo speed)
    const hueShiftSpeed = 75 + Math.min(combo, 15) * 18;
    const hueA = Math.round((this.time * hueShiftSpeed) % 360);
    const hueB = (hueA + 185) % 360;
    const colorA = `hsl(${hueA}, 100%, 62%)`;
    const colorB = `hsl(${hueB}, 100%, 64%)`;

    this.tintChannel(this.channelACtx, colorA);
    this.tintChannel(this.channelBCtx, colorB);

    // 3. Compute directional dispersion offset & outward edge zoom pulse
    const spreadPx = 2.0 + effective * 8.5;
    const angle = this.time * 2.2;
    const dx = Math.cos(angle) * spreadPx;
    const dy = Math.sin(angle) * spreadPx * 0.65;
    const zoomScale = effective * 0.018;
    const expandW = this.arenaWidth * zoomScale;
    const expandH = this.arenaHeight * zoomScale;

    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = sourceCanvas.width / this.arenaWidth;
    mainCtx.scale(dpr, dpr);

    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.globalAlpha = Math.min(0.68, 0.16 + effective * 0.44);

    // Channel A shifted outward + offset vector
    mainCtx.drawImage(
      this.channelACanvas,
      -expandW / 2 + dx,
      -expandH / 2 + dy,
      this.arenaWidth + expandW,
      this.arenaHeight + expandH
    );

    // Channel B shifted opposite vector
    mainCtx.drawImage(
      this.channelBCanvas,
      -expandW / 2 - dx,
      -expandH / 2 - dy,
      this.arenaWidth + expandW,
      this.arenaHeight + expandH
    );

    // 4. Subtle color-shifting perimeter glow vignette synced to pulse
    const cx = this.arenaWidth / 2;
    const cy = this.arenaHeight / 2;
    const rOuter = Math.hypot(cx, cy);
    const rimGrad = mainCtx.createRadialGradient(cx, cy, rOuter * 0.56, cx, cy, rOuter);
    rimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rimGrad.addColorStop(0.78, `hsla(${hueA}, 95%, 58%, ${(effective * 0.07).toFixed(3)})`);
    rimGrad.addColorStop(1, `hsla(${hueB}, 100%, 60%, ${(effective * 0.18).toFixed(3)})`);

    mainCtx.globalAlpha = 1;
    mainCtx.fillStyle = rimGrad;
    mainCtx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);

    mainCtx.restore();
  }

  private tintChannel(ctx: CanvasRenderingContext2D, tintColor: string) {
    const w = this.halfW;
    const h = this.halfH;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.edgeCanvas, 0, 0, w, h);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.edgeCanvas, 0, 0, w, h);
    ctx.restore();
  }
}
