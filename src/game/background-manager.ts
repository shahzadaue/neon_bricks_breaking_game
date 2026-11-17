/**
 * Background Manager:
 * Manages player background preferences, automatic level synchronization,
 * manual overrides, random selection without immediate repetition,
 * and localStorage persistence.
 */

import {
  BackgroundEnvironment,
  getBackgroundById,
  getBackgroundForLevel,
  getRandomBackground,
  BACKGROUND_ENVIRONMENTS,
} from './background-data';

export type BackgroundSelectionMode = 'auto' | 'manual';

export interface BackgroundManagerState {
  mode: BackgroundSelectionMode;
  currentBackground: BackgroundEnvironment;
  activeLevel: number;
}

export class BackgroundManager {
  private static instance: BackgroundManager | null = null;

  private static readonly STORAGE_KEY_BG = 'neon_breakout_active_bg_id';
  private static readonly STORAGE_KEY_MODE = 'neon_breakout_bg_mode';

  private mode: BackgroundSelectionMode = 'auto';
  private currentBg: BackgroundEnvironment;
  private currentLevel: number = 1;
  private recentHistory: string[] = []; // Tracks recent IDs to prevent immediate repeats
  private listeners: Array<(state: BackgroundManagerState) => void> = [];

  constructor() {
    // 1. Initialize default background for level 1
    this.currentBg = getBackgroundForLevel(1);

    // 2. Load persisted preferences
    this.loadFromStorage();
  }

  public static getInstance(): BackgroundManager {
    if (!BackgroundManager.instance) {
      BackgroundManager.instance = new BackgroundManager();
    }
    return BackgroundManager.instance;
  }

  private loadFromStorage() {
    try {
      const savedMode = localStorage.getItem(BackgroundManager.STORAGE_KEY_MODE);
      const savedBgId = localStorage.getItem(BackgroundManager.STORAGE_KEY_BG);

      if (savedMode === 'manual' || savedMode === 'auto') {
        this.mode = savedMode;
      }

      if (savedBgId) {
        const bg = getBackgroundById(savedBgId);
        if (bg) {
          this.currentBg = bg;
        }
      }
    } catch {
      // Storage unavailable or blocked
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(BackgroundManager.STORAGE_KEY_MODE, this.mode);
      localStorage.setItem(BackgroundManager.STORAGE_KEY_BG, this.currentBg.backgroundId);
    } catch {
      // Storage unavailable
    }
  }

  public subscribe(listener: (state: BackgroundManagerState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public getState(): BackgroundManagerState {
    return {
      mode: this.mode,
      currentBackground: this.currentBg,
      activeLevel: this.currentLevel,
    };
  }

  public getCurrentBackground(): BackgroundEnvironment {
    return this.currentBg;
  }

  public getMode(): BackgroundSelectionMode {
    return this.mode;
  }

  /**
   * Called by GameEngine whenever a level is loaded or progressed
   */
  public onLevelChanged(level: number) {
    this.currentLevel = Math.max(1, level);

    if (this.mode === 'auto') {
      const autoBg = getBackgroundForLevel(this.currentLevel);
      if (autoBg.backgroundId !== this.currentBg.backgroundId) {
        this.currentBg = autoBg;
        this.recordHistory(autoBg.backgroundId);
        this.notify();
      }
    }
  }

  /**
   * Set a specific background manually
   */
  public setManualBackground(bgId: string) {
    const bg = getBackgroundById(bgId);
    this.currentBg = bg;
    this.mode = 'manual';
    this.recordHistory(bg.backgroundId);
    this.saveToStorage();
    this.notify();
  }

  /**
   * Switch to Automatic level-synced background mode
   */
  public setAutoMode() {
    this.mode = 'auto';
    this.currentBg = getBackgroundForLevel(this.currentLevel);
    this.recordHistory(this.currentBg.backgroundId);
    this.saveToStorage();
    this.notify();
  }

  /**
   * Toggle between auto and manual modes
   */
  public toggleMode() {
    if (this.mode === 'auto') {
      this.mode = 'manual';
    } else {
      this.setAutoMode();
      return;
    }
    this.saveToStorage();
    this.notify();
  }

  /**
   * Pick and apply a random background from all 400 without immediate repetition
   */
  public selectRandomBackground(): BackgroundEnvironment {
    const randomBg = getRandomBackground(this.currentBg.backgroundId);
    this.currentBg = randomBg;
    this.mode = 'manual';
    this.recordHistory(randomBg.backgroundId);
    this.saveToStorage();
    this.notify();
    return randomBg;
  }

  /**
   * Cycle to next sequential background
   */
  public selectNextBackground(): BackgroundEnvironment {
    const currentNum = parseInt(this.currentBg.backgroundId.replace('BG', ''), 10) || 1;
    const nextNum = (currentNum % 400) + 1;
    const nextBgId = `BG${nextNum.toString().padStart(3, '0')}`;
    this.setManualBackground(nextBgId);
    return this.currentBg;
  }

  /**
   * Cycle to previous sequential background
   */
  public selectPreviousBackground(): BackgroundEnvironment {
    const currentNum = parseInt(this.currentBg.backgroundId.replace('BG', ''), 10) || 1;
    const prevNum = currentNum === 1 ? 400 : currentNum - 1;
    const prevBgId = `BG${prevNum.toString().padStart(3, '0')}`;
    this.setManualBackground(prevBgId);
    return this.currentBg;
  }

  private recordHistory(bgId: string) {
    this.recentHistory.push(bgId);
    if (this.recentHistory.length > 10) {
      this.recentHistory.shift();
    }
  }
}
