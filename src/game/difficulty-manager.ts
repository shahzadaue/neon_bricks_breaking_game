/**
 * Difficulty Manager: Progressive scaling engine across levels 1 to 1000.
 * Organized into 4 distinct difficulty tiers:
 *  - Easy (Stages 1 - 250)
 *  - Ordinary (Stages 251 - 500)
 *  - Hard (Stages 501 - 750)
 *  - Extraordinary Hard (Stages 751 - 1000)
 */

export type DifficultyTier = 'Easy' | 'Ordinary' | 'Hard' | 'Extraordinary Hard';

export interface DifficultyProfile {
  level: number;
  // Ball speed parameters
  ballMinSpeed: number;
  ballMaxSpeed: number;
  ballSpeedMultiplier: number;
  // Paddle parameters
  paddleSpeed: number;
  paddleAcceleration: number; // Interpolation response rate (lerpRate)
  paddleWidth: number;
  // Brick HP density
  standardRatio: number; // 1-HP standard
  strongRatio: number;   // 2-HP strong
  armoredRatio: number;  // 3-HP+ armored
  averageHpPerBrick: number;
  unbreakableChance: number;
  // Scoring & Tier
  difficultyRating: DifficultyTier;
  scoreMultiplier: number;
}

export class DifficultyManager {
  public static readonly MAX_LEVEL = 1000;

  private currentLevel: number = 1;
  private currentProfile: DifficultyProfile;

  constructor(initialLevel: number = 1) {
    this.currentLevel = Math.max(1, Math.min(DifficultyManager.MAX_LEVEL, initialLevel));
    this.currentProfile = DifficultyManager.getDifficultyForLevel(this.currentLevel);
  }

  public setLevel(levelNumber: number): DifficultyProfile {
    this.currentLevel = Math.max(1, Math.min(DifficultyManager.MAX_LEVEL, levelNumber));
    this.currentProfile = DifficultyManager.getDifficultyForLevel(this.currentLevel);
    return this.currentProfile;
  }

  public getProfile(): DifficultyProfile {
    return this.currentProfile;
  }

  public static getTierForLevel(levelNumber: number): DifficultyTier {
    const lvl = Math.max(1, Math.min(DifficultyManager.MAX_LEVEL, Math.floor(levelNumber)));
    if (lvl <= 250) return 'Easy';
    if (lvl <= 500) return 'Ordinary';
    if (lvl <= 750) return 'Hard';
    return 'Extraordinary Hard';
  }

  /**
   * Compute comprehensive difficulty profile for any level 1 to 1000
   */
  public static getDifficultyForLevel(levelNumber: number): DifficultyProfile {
    const lvl = Math.max(1, Math.min(DifficultyManager.MAX_LEVEL, Math.floor(levelNumber)));
    const progress = (lvl - 1) / (DifficultyManager.MAX_LEVEL - 1);
    const tier = DifficultyManager.getTierForLevel(lvl);

    let ballMinSpeed: number;
    let ballMaxSpeed: number;
    let ballSpeedMultiplier: number;
    let paddleSpeed: number;
    let paddleAcceleration: number;
    let paddleWidth: number;
    let standardRatio: number;
    let strongRatio: number;
    let armoredRatio: number;
    let unbreakableChance: number;
    let scoreMultiplier: number;

    if (tier === 'Easy') {
      // Stages 1 - 250: Welcoming speed, wide paddle, mostly 1-HP bricks
      const t = (lvl - 1) / 249;
      ballMinSpeed = Math.round(355 + t * 75);       // 355 -> 430
      ballMaxSpeed = Math.round(690 + t * 95);       // 690 -> 785
      ballSpeedMultiplier = Number((0.95 + t * 0.15).toFixed(3));
      paddleSpeed = Math.round(600 + t * 80);        // 600 -> 680
      paddleAcceleration = Math.round(24 + t * 6);
      paddleWidth = Math.round(114 - t * 14);        // 114 -> 100
      standardRatio = Number((0.86 - t * 0.24).toFixed(3)); // 86% -> 62%
      strongRatio = Number((0.12 + t * 0.18).toFixed(3));   // 12% -> 30%
      armoredRatio = Number((0.02 + t * 0.06).toFixed(3));  // 2% -> 8%
      unbreakableChance = lvl < 20 ? 0 : Number((0.12 + t * 0.22).toFixed(2));
      scoreMultiplier = 1.0;
    } else if (tier === 'Ordinary') {
      // Stages 251 - 500: Classic balanced arcade pacing
      const t = (lvl - 251) / 249;
      ballMinSpeed = Math.round(430 + t * 65);       // 430 -> 495
      ballMaxSpeed = Math.round(785 + t * 105);      // 785 -> 890
      ballSpeedMultiplier = Number((1.10 + t * 0.15).toFixed(3));
      paddleSpeed = Math.round(680 + t * 80);        // 680 -> 760
      paddleAcceleration = Math.round(30 + t * 6);
      paddleWidth = Math.round(100 - t * 10);        // 100 -> 90
      standardRatio = Number((0.62 - t * 0.20).toFixed(3)); // 62% -> 42%
      strongRatio = Number((0.30 + t * 0.10).toFixed(3));   // 30% -> 40%
      armoredRatio = Number((0.08 + t * 0.10).toFixed(3));  // 8% -> 18%
      unbreakableChance = Number((0.35 + t * 0.20).toFixed(2));
      scoreMultiplier = 1.6;
    } else if (tier === 'Hard') {
      // Stages 501 - 750: Fast reflex volleys and reinforced multi-hit lines
      const t = (lvl - 501) / 249;
      ballMinSpeed = Math.round(495 + t * 70);       // 495 -> 565
      ballMaxSpeed = Math.round(890 + t * 115);      // 890 -> 1005
      ballSpeedMultiplier = Number((1.25 + t * 0.15).toFixed(3));
      paddleSpeed = Math.round(760 + t * 90);        // 760 -> 850
      paddleAcceleration = Math.round(36 + t * 6);
      paddleWidth = Math.round(90 - t * 10);         // 90 -> 80
      standardRatio = Number((0.42 - t * 0.16).toFixed(3)); // 42% -> 26%
      strongRatio = Number((0.40 + t * 0.04).toFixed(3));   // 40% -> 44%
      armoredRatio = Number((0.18 + t * 0.12).toFixed(3));  // 18% -> 30%
      unbreakableChance = Number((0.55 + t * 0.20).toFixed(2));
      scoreMultiplier = 2.5;
    } else {
      // Stages 751 - 1000: Extraordinary Hard - Apex gauntlet & ultra-dense shields
      const t = (lvl - 751) / 249;
      ballMinSpeed = Math.round(565 + t * 85);       // 565 -> 650
      ballMaxSpeed = Math.round(1005 + t * 145);     // 1005 -> 1150
      ballSpeedMultiplier = Number((1.40 + t * 0.20).toFixed(3));
      paddleSpeed = Math.round(850 + t * 110);       // 850 -> 960
      paddleAcceleration = Math.round(42 + t * 8);
      paddleWidth = Math.round(80 - t * 10);         // 80 -> 70
      standardRatio = Number((0.26 - t * 0.12).toFixed(3)); // 26% -> 14%
      strongRatio = Number((0.44 - t * 0.04).toFixed(3));   // 44% -> 40%
      armoredRatio = Number((0.30 + t * 0.16).toFixed(3));  // 30% -> 46%
      unbreakableChance = Number((0.75 + t * 0.15).toFixed(2));
      scoreMultiplier = 4.0 + Number((progress * 0.5).toFixed(1));
    }

    const averageHpPerBrick = Number(
      (standardRatio * 1 + strongRatio * 2 + armoredRatio * (tier === 'Extraordinary Hard' ? 3.5 : 3)).toFixed(2)
    );

    return {
      level: lvl,
      ballMinSpeed,
      ballMaxSpeed,
      ballSpeedMultiplier,
      paddleSpeed,
      paddleAcceleration,
      paddleWidth,
      standardRatio,
      strongRatio,
      armoredRatio,
      averageHpPerBrick,
      unbreakableChance,
      difficultyRating: tier,
      scoreMultiplier,
    };
  }
}
