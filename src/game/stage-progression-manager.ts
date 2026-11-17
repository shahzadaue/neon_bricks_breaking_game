/**
 * Stage Progression Manager:
 * Enforces chapter selection freedom with strict sequential stage progression within each chapter.
 * 
 * Rules:
 * 1. Player can select ANY Chapter (1 to 40) freely at any time.
 * 2. In any chosen chapter, only the first stage is initially unlocked (e.g., Ch 1 -> 1, Ch 2 -> 11, ..., Ch 40 -> 391).
 * 3. Inside a chapter, players CANNOT jump to subsequent stages until the preceding stage is completed.
 *    If stage N is not completed, moving to stage N+1 is impossible.
 * 4. Tracks 1 to 3 stars per stage based on performance.
 * 5. Progress is persisted in localStorage so unlocked stages and stars remain saved across sessions.
 */

export interface ChapterProgressInfo {
  chapterIndex: number;
  startStage: number;
  endStage: number;
  highestUnlockedStage: number;
  completedCount: number;
  isFullyCompleted: boolean;
  totalStars: number;
  maxStars: number;
  completionPercentage: number;
}

export interface TotalGameProgress {
  totalCompletedStages: number;
  maxStages: number;
  totalGamePercentage: number;
  totalStars: number;
  maxStars: number;
  completedChaptersCount: number;
  totalChapters: number;
}

export class StageProgressionManager {
  private static instance: StageProgressionManager | null = null;
  private static readonly STORAGE_KEY = 'neon_breakout_completed_stages';
  private static readonly STARS_STORAGE_KEY = 'neon_breakout_stage_stars';

  public static readonly TOTAL_CHAPTERS = 100;
  public static readonly STAGES_PER_CHAPTER = 10;
  public static readonly MAX_STAGES = 1000;

  private completedStages: Set<number> = new Set();
  private stageStars: Map<number, number> = new Map();
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): StageProgressionManager {
    if (!StageProgressionManager.instance) {
      StageProgressionManager.instance = new StageProgressionManager();
    }
    return StageProgressionManager.instance;
  }

  /**
   * Return the chapter index (1-100) for a given level number (1-1000)
   */
  public static getChapterForStage(stageNumber: number): number {
    const clamped = Math.max(1, Math.min(StageProgressionManager.MAX_STAGES, stageNumber));
    return Math.floor((clamped - 1) / StageProgressionManager.STAGES_PER_CHAPTER) + 1;
  }

  /**
   * Return starting stage for chapter (1 -> 1, 2 -> 11, 100 -> 991)
   */
  public static getStartStageForChapter(chapterIndex: number): number {
    const clamped = Math.max(1, Math.min(StageProgressionManager.TOTAL_CHAPTERS, chapterIndex));
    return (clamped - 1) * StageProgressionManager.STAGES_PER_CHAPTER + 1;
  }

  /**
   * Return ending stage for chapter (1 -> 10, 2 -> 20, 100 -> 1000)
   */
  public static getEndStageForChapter(chapterIndex: number): number {
    const clamped = Math.max(1, Math.min(StageProgressionManager.TOTAL_CHAPTERS, chapterIndex));
    return clamped * StageProgressionManager.STAGES_PER_CHAPTER;
  }

  /**
   * Check if a stage is completed
   */
  public isStageCompleted(stageNumber: number): boolean {
    return this.completedStages.has(stageNumber);
  }

  /**
   * Return stars earned on a stage (0 to 3)
   */
  public getStageStars(stageNumber: number): number {
    return this.stageStars.get(stageNumber) || 0;
  }

  /**
   * Check if a stage is unlocked:
   * - First stage of any chapter is ALWAYS unlocked.
   * - Stage S is unlocked if stage S - 1 is completed.
   */
  public isStageUnlocked(stageNumber: number): boolean {
    if (stageNumber < 1 || stageNumber > StageProgressionManager.MAX_STAGES) return false;

    const chapter = StageProgressionManager.getChapterForStage(stageNumber);
    const startStage = StageProgressionManager.getStartStageForChapter(chapter);

    // First stage in any chapter is always open to play
    if (stageNumber === startStage) {
      return true;
    }

    // A subsequent stage requires the previous stage in the chapter to be completed
    return this.completedStages.has(stageNumber - 1);
  }

  /**
   * Get highest unlocked stage in a specific chapter
   */
  public getHighestUnlockedStageInChapter(chapterIndex: number): number {
    const start = StageProgressionManager.getStartStageForChapter(chapterIndex);
    const end = StageProgressionManager.getEndStageForChapter(chapterIndex);

    let highest = start;
    for (let s = start + 1; s <= end; s++) {
      if (this.completedStages.has(s - 1)) {
        highest = s;
      } else {
        break; // Cannot skip an incomplete stage
      }
    }
    return highest;
  }

  /**
   * Get detailed progress summary for a chapter
   */
  public getChapterProgress(chapterIndex: number): ChapterProgressInfo {
    const startStage = StageProgressionManager.getStartStageForChapter(chapterIndex);
    const endStage = StageProgressionManager.getEndStageForChapter(chapterIndex);
    const highestUnlockedStage = this.getHighestUnlockedStageInChapter(chapterIndex);

    let completedCount = 0;
    let totalStars = 0;
    for (let s = startStage; s <= endStage; s++) {
      if (this.completedStages.has(s)) {
        completedCount++;
      }
      totalStars += this.getStageStars(s);
    }

    return {
      chapterIndex,
      startStage,
      endStage,
      highestUnlockedStage,
      completedCount,
      isFullyCompleted: completedCount === StageProgressionManager.STAGES_PER_CHAPTER,
      totalStars,
      maxStars: StageProgressionManager.STAGES_PER_CHAPTER * 3,
      completionPercentage: Math.round((completedCount / StageProgressionManager.STAGES_PER_CHAPTER) * 100),
    };
  }

  /**
   * Get overall game progression metrics across all 400 stages
   */
  public getTotalProgress(): TotalGameProgress {
    let completedCount = 0;
    let totalStars = 0;
    let completedChapters = 0;

    for (let ch = 1; ch <= StageProgressionManager.TOTAL_CHAPTERS; ch++) {
      const p = this.getChapterProgress(ch);
      completedCount += p.completedCount;
      totalStars += p.totalStars;
      if (p.isFullyCompleted) {
        completedChapters++;
      }
    }

    return {
      totalCompletedStages: completedCount,
      maxStages: StageProgressionManager.MAX_STAGES,
      totalGamePercentage: Number(((completedCount / StageProgressionManager.MAX_STAGES) * 100).toFixed(1)),
      totalStars,
      maxStars: StageProgressionManager.MAX_STAGES * 3,
      completedChaptersCount: completedChapters,
      totalChapters: StageProgressionManager.TOTAL_CHAPTERS,
    };
  }

  /**
   * Record stage completion upon clearing a level with performance stars
   */
  public recordStageCompleted(
    stageNumber: number,
    starsEarned: number = 3
  ): {
    newlyUnlocked: number | null;
    chapterCompleted: boolean;
  } {
    if (stageNumber < 1 || stageNumber > StageProgressionManager.MAX_STAGES) {
      return { newlyUnlocked: null, chapterCompleted: false };
    }

    const wasAlreadyCompleted = this.completedStages.has(stageNumber);
    this.completedStages.add(stageNumber);

    // Save best star performance
    const prevStars = this.stageStars.get(stageNumber) || 0;
    if (starsEarned > prevStars) {
      this.stageStars.set(stageNumber, starsEarned);
    }

    this.saveToStorage();

    const chapter = StageProgressionManager.getChapterForStage(stageNumber);
    const endStage = StageProgressionManager.getEndStageForChapter(chapter);

    let newlyUnlocked: number | null = null;
    if (stageNumber < endStage) {
      newlyUnlocked = stageNumber + 1;
    }

    const progress = this.getChapterProgress(chapter);
    this.notifyListeners();

    return {
      newlyUnlocked,
      chapterCompleted: progress.isFullyCompleted && !wasAlreadyCompleted,
    };
  }

  /**
   * Subscribe to progress updates
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in StageProgressionManager listener', err);
      }
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(StageProgressionManager.STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.completedStages = new Set(
            arr.filter((n) => typeof n === 'number' && n >= 1 && n <= StageProgressionManager.MAX_STAGES)
          );
        }
      }

      const rawStars = localStorage.getItem(StageProgressionManager.STARS_STORAGE_KEY);
      if (rawStars) {
        const parsed = JSON.parse(rawStars);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [k, v] of Object.entries(parsed)) {
            const stageNum = parseInt(k, 10);
            if (stageNum >= 1 && stageNum <= StageProgressionManager.MAX_STAGES && typeof v === 'number') {
              this.stageStars.set(stageNum, v);
            }
          }
        }
      }
    } catch {
      this.completedStages = new Set();
      this.stageStars = new Map();
    }
  }

  private saveToStorage() {
    try {
      const arr = Array.from(this.completedStages);
      localStorage.setItem(StageProgressionManager.STORAGE_KEY, JSON.stringify(arr));

      const starsObj: Record<string, number> = {};
      this.stageStars.forEach((stars, stage) => {
        starsObj[stage] = stars;
      });
      localStorage.setItem(StageProgressionManager.STARS_STORAGE_KEY, JSON.stringify(starsObj));
    } catch {}
  }

  /**
   * Reset progression for testing/auditing
   */
  public resetProgress() {
    this.completedStages.clear();
    this.stageStars.clear();
    this.saveToStorage();
    this.notifyListeners();
  }
}
