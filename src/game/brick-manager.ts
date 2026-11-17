/**
 * Brick Manager: Brick grid layout, multi-hit HP system, procedural crack rendering,
 * hit flashes, and destruction state tracking.
 */

import { Brick, BrickType } from './types';
import { LevelGenerator, LevelData } from './level-generator';

export class BrickManager {
  private bricks: Brick[] = [];
  private arenaWidth: number;
  private arenaHeight: number;
  private currentLevelData: LevelData | null = null;

  constructor(arenaWidth: number, arenaHeight: number, initialLevel: number = 1) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.loadLevel(initialLevel);
  }

  public getBricks(): Brick[] {
    return this.bricks;
  }

  public getCurrentLevelData(): LevelData | null {
    return this.currentLevelData;
  }

  public loadLevel(levelNumber: number): LevelData {
    this.currentLevelData = LevelGenerator.generateLevel(levelNumber, this.arenaWidth, this.arenaHeight);
    this.bricks = this.currentLevelData.bricks;
    return this.currentLevelData;
  }

  public getRemainingDestructibleCount(): number {
    return this.bricks.filter((b) => b.isDestructible && b.currentHp > 0).length;
  }

  public getTotalDestructibleCount(): number {
    return this.bricks.filter((b) => b.isDestructible).length;
  }

  /**
   * Generates a balanced, engaging Phase 1 test level layout
   * demonstrating 1-HP, 2-HP, 3-HP, and Unbreakable bricks.
   */
  public loadPhase1Layout() {
    this.bricks = [];

    const cols = 8;
    const rows = 7;
    const brickMargin = 8;
    const sidePadding = 24;
    const topOffset = 80;

    const availableWidth = this.arenaWidth - sidePadding * 2;
    const brickWidth = (availableWidth - (cols - 1) * brickMargin) / cols;
    const brickHeight = 22;

    let idCounter = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = sidePadding + c * (brickWidth + brickMargin);
        const y = topOffset + r * (brickHeight + brickMargin);

        let type: BrickType = 'standard';
        let hp = 1;
        let points = 100;
        let color = '#06b6d4'; // Cyan
        let glowColor = 'rgba(6, 182, 212, 0.4)';
        let isDestructible = true;

        // Structured tier pattern:
        // Row 0: Armored 3-HP (Ruby / Gold)
        // Row 1: Strong 2-HP (Emerald)
        // Row 2: Standard 1-HP (Cyan)
        // Row 3: Center steel unbreakable blocks + standard sides
        // Row 4: Strong 2-HP (Emerald)
        // Row 5 & 6: Standard 1-HP
        if (r === 0) {
          type = 'armored';
          hp = 3;
          points = 350;
          color = '#f59e0b'; // Amber Gold
          glowColor = 'rgba(245, 158, 11, 0.5)';
        } else if (r === 1 || r === 4) {
          type = 'strong';
          hp = 2;
          points = 200;
          color = '#10b981'; // Emerald Green
          glowColor = 'rgba(16, 185, 129, 0.45)';
        } else if (r === 3 && (c === 2 || c === 5)) {
          // Unbreakable obstacles to demonstrate reflection physics
          type = 'unbreakable';
          hp = 999;
          points = 0;
          color = '#475569'; // Titanium Slate
          glowColor = 'rgba(148, 163, 184, 0.2)';
          isDestructible = false;
        } else {
          type = 'standard';
          hp = 1;
          points = 100;
          color = '#06b6d4'; // Electric Cyan
          glowColor = 'rgba(6, 182, 212, 0.4)';
        }

        this.bricks.push({
          id: `brick-${idCounter++}`,
          x,
          y,
          width: brickWidth,
          height: brickHeight,
          maxHp: hp,
          currentHp: hp,
          type,
          color,
          glowColor,
          points,
          isDestructible,
          hitFlashTime: 0,
        });
      }
    }
  }

  private moveTime: number = 0;

  /**
   * Apply damage to a brick. Returns true if destroyed along with any chain-exploded bricks.
   */
  public damageBrick(brick: Brick): {
    isDestroyed: boolean;
    pointsAwarded: number;
    chainDestroyed: Brick[];
  } {
    if (!brick.isDestructible) {
      brick.hitFlashTime = 0.08;
      return { isDestroyed: false, pointsAwarded: 0, chainDestroyed: [] };
    }

    brick.currentHp -= 1;
    brick.hitFlashTime = 0.09;

    const chainDestroyed: Brick[] = [];

    if (brick.currentHp <= 0) {
      brick.currentHp = 0;

      // Handle explosive brick blast radius
      if (brick.type === 'explosive' || brick.isExplosive) {
        const blastRadius = 75;
        const bx = brick.x + brick.width / 2;
        const by = brick.y + brick.height / 2;

        for (const other of this.bricks) {
          if (other.id === brick.id || !other.isDestructible || other.currentHp <= 0) continue;
          const ox = other.x + other.width / 2;
          const oy = other.y + other.height / 2;
          const dist = Math.hypot(ox - bx, oy - by);

          if (dist <= blastRadius) {
            other.currentHp = Math.max(0, other.currentHp - 2);
            other.hitFlashTime = 0.15;
            if (other.currentHp <= 0) {
              chainDestroyed.push(other);
            }
          }
        }
      }

      return { isDestroyed: true, pointsAwarded: brick.points, chainDestroyed };
    }

    return { isDestroyed: false, pointsAwarded: 25, chainDestroyed: [] }; // Bonus partial points on hit
  }

  /**
   * Update flash decay and moving brick oscillation
   */
  public update(dt: number) {
    this.moveTime += dt;

    for (const brick of this.bricks) {
      if (brick.hitFlashTime > 0) {
        brick.hitFlashTime = Math.max(0, brick.hitFlashTime - dt);
      }

      // Moving brick dynamic horizontal patrol
      if (brick.isMoving && brick.baseX !== undefined) {
        const range = brick.moveRange || 28;
        const speed = brick.moveSpeed || 1.4;
        const phase = brick.movePhase || 0;
        brick.x = brick.baseX + Math.sin(this.moveTime * speed + phase) * range;
      }
    }
  }

  /**
   * Render all active bricks with cracks, glows, and HP indicators
   */
  public render(ctx: CanvasRenderingContext2D, bricksOverride?: Brick[]) {
    const list = bricksOverride ?? this.bricks;
    for (const brick of list) {
      if (brick.currentHp <= 0) continue;

      ctx.save();

      // Outer glow
      ctx.shadowColor = brick.glowColor;
      ctx.shadowBlur = brick.type === 'unbreakable' ? 4 : 8;

      // Base rectangle with subtle rounded corners
      const radius = 3;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);

      if (brick.hitFlashTime > 0) {
        // White hit flash
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        continue;
      }

      // Dynamic color shade based on current HP
      let fillColor = brick.color;
      if (brick.isDestructible && brick.maxHp > 1) {
        const hpRatio = brick.currentHp / brick.maxHp;
        if (hpRatio < 0.4) {
          fillColor = '#ef4444'; // Red danger
        } else if (hpRatio < 0.7) {
          fillColor = '#f59e0b'; // Amber warning
        }
      }

      // Metallic gradient for unbreakable bricks
      if (!brick.isDestructible) {
        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
        grad.addColorStop(0, '#64748b');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
      } else {
        // Subtle top-to-bottom shading
        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
        grad.addColorStop(0, fillColor);
        grad.addColorStop(1, this.darkenColor(fillColor, 0.25));
        ctx.fillStyle = grad;
      }

      ctx.fill();

      // Border outline
      ctx.strokeStyle = brick.isDestructible ? 'rgba(255, 255, 255, 0.35)' : 'rgba(203, 213, 225, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw procedural cracks if damaged
      if (brick.isDestructible && brick.currentHp < brick.maxHp) {
        this.drawCracks(ctx, brick);
      }

      // Draw HP numeral on multi-hit bricks
      if (brick.isDestructible && brick.maxHp > 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${brick.currentHp}`,
          brick.x + brick.width / 2,
          brick.y + brick.height / 2 + 1
        );
      } else if (!brick.isDestructible) {
        // Metallic lock icon or hatch pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(brick.x + 8, brick.y + 4);
        ctx.lineTo(brick.x + brick.width - 8, brick.y + brick.height - 4);
        ctx.moveTo(brick.x + brick.width - 8, brick.y + 4);
        ctx.lineTo(brick.x + 8, brick.y + brick.height - 4);
        ctx.stroke();
      }

      // Special Explosive Hazard Indicator
      if (brick.type === 'explosive' || brick.isExplosive) {
        const pulse = 0.6 + 0.4 * Math.sin(this.moveTime * 6);
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse.toFixed(2)})`;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💥', brick.x + brick.width / 2, brick.y + brick.height / 2 + 1);

        // Warning border
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2);
      }

      // Moving Brick Kinetic Chevron Indicator
      if (brick.isMoving) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        const cy = brick.y + brick.height / 2;
        // Left arrow
        ctx.beginPath();
        ctx.moveTo(brick.x + 5, cy);
        ctx.lineTo(brick.x + 8, cy - 3);
        ctx.moveTo(brick.x + 5, cy);
        ctx.lineTo(brick.x + 8, cy + 3);
        // Right arrow
        ctx.moveTo(brick.x + brick.width - 5, cy);
        ctx.lineTo(brick.x + brick.width - 8, cy - 3);
        ctx.moveTo(brick.x + brick.width - 5, cy);
        ctx.lineTo(brick.x + brick.width - 8, cy + 3);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /**
   * Draw procedural hairline crack lines reflecting structural damage
   */
  private drawCracks(ctx: CanvasRenderingContext2D, brick: Brick) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const cx = brick.x + brick.width / 2;
    const cy = brick.y + brick.height / 2;

    // Crack 1
    ctx.moveTo(cx - 10, cy - 6);
    ctx.lineTo(cx - 3, cy);
    ctx.lineTo(cx + 4, cy - 3);
    ctx.lineTo(cx + 12, cy + 5);

    // If down to 1 HP on a 3-HP brick, add second intersecting crack
    if (brick.currentHp === 1 && brick.maxHp >= 3) {
      ctx.moveTo(cx + 6, cy - 7);
      ctx.lineTo(cx + 2, cy + 2);
      ctx.lineTo(cx - 8, cy + 6);
    }

    ctx.stroke();
    ctx.restore();
  }

  private darkenColor(hex: string, amount: number): string {
    // Quick hex darkness calculation
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((char) => char + char).join('');
    const num = parseInt(c, 16);
    const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - amount)));
    const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - amount)));
    const b = Math.max(0, Math.floor((num & 255) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
