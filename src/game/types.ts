/**
 * Core type definitions for 2D Brick Breaker Game (Phase 1)
 */

export type GameMode = 'SOLO' | 'VS_2P';
export type ActivePlayer = 1 | 2;

export type GameState =
  | 'TITLE'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAMEOVER'
  | 'VS_INTERSTITIAL'
  | 'VS_MATCH_OVER'
  | 'REPLAY';

export type BrickType = 'standard' | 'strong' | 'armored' | 'unbreakable' | 'explosive';

export interface PlayerScoreData {
  score: number;
  maxCombo: number;
  bricksCleared: number;
  completed: boolean;
}

export interface Brick {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maxHp: number;
  currentHp: number;
  type: BrickType;
  color: string;
  glowColor: string;
  points: number;
  isDestructible: boolean;
  hitFlashTime: number; // Duration remaining for white hit flash (seconds)
  baseX?: number; // Origin coordinate for moving boss/stage structures
  baseY?: number;
  isBoss?: boolean;
  isBossCore?: boolean;
  isBossCannon?: boolean;
  isMoving?: boolean;
  moveRange?: number;
  moveSpeed?: number;
  movePhase?: number;
  isExplosive?: boolean;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  minSpeed: number;
  maxSpeed: number;
  isStuckToPaddle: boolean;
  stuckOffset: number; // Offset from paddle center when resting on paddle
  trail: Array<{ x: number; y: number; alpha: number; radius: number }>;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number; // Horizontal velocity for spin/angle influence
  speed: number; // Keyboard movement speed (px/sec)
  targetX: number; // For smooth interpolation
  color: string;
  glowColor: string;
  hitFlashTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  shape?: 'square' | 'circle' | 'spark';
  rotation?: number;
  vr?: number;
  gravity?: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isBadge?: boolean;
  scale?: number;
}

export interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  penetrationDepth: number;
  contactPointX: number;
  contactPointY: number;
  face: 'top' | 'bottom' | 'left' | 'right' | 'corner' | 'none';
}

export type PowerUpType =
  | 'MULTI_BALL'
  | 'EXPAND_PADDLE'
  | 'SLOW_MOTION'
  | 'FIRE_BALL'
  | 'BOTTOM_SHIELD'
  | 'BONUS_COINS';

export interface PowerUpItem {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  color: string;
  glowColor: string;
  label: string;
  iconSymbol: string;
  duration: number; // 0 for instant
  pulseTimer: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  remainingTime: number;
  totalDuration: number;
  label: string;
  color: string;
}

export interface BossProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface BossInfo {
  isBoss: boolean;
  name: string;
  currentHp: number;
  maxHp: number;
  phase: number;
}

export interface ReplayInfo {
  available: boolean;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  stageNumber: number;
}

export interface GameMetrics {
  fps: number;
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  combo: number;
  maxCombo: number;
  remainingBricks: number;
  totalBricks: number;
  level: number;
  levelTitle?: string;
  chapterName?: string;
  themeHue?: string;
  state: GameState;
  isMuted: boolean;
  gameMode: GameMode;
  activePlayer: ActivePlayer;
  p1Data: PlayerScoreData;
  p2Data: PlayerScoreData;
  vsWinner?: 'P1' | 'P2' | 'TIE';
  activePowerUps?: ActivePowerUp[];
  bossInfo?: BossInfo;
  replayInfo?: ReplayInfo;
  bloomEnabled?: boolean;
}

