/**
 * Daily Missions Manager: Generates, tracks, and persists 3 randomized
 * daily objectives with coin rewards and midnight resets.
 */

import { SeededRandom } from './level-generator';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  category: 'bricks' | 'stages' | 'combo' | 'score' | 'paddle' | 'versus';
  target: number;
  current: number;
  rewardCoins: number;
  isCompleted: boolean;
  isClaimed: boolean;
  icon: 'Flame' | 'Trophy' | 'Layers' | 'Sparkles' | 'Swords' | 'Shield';
}

interface MissionTemplate {
  idTemplate: string;
  title: string;
  descriptionTemplate: string;
  category: DailyMission['category'];
  baseTarget: number;
  targetOptions: number[];
  baseReward: number;
  icon: DailyMission['icon'];
}

export class DailyMissionsManager {
  private static instance: DailyMissionsManager | null = null;
  private missions: DailyMission[] = [];
  private coins: number = 0;
  private currentDateStr: string = '';
  private onMissionUpdated?: (missions: DailyMission[], coins: number) => void;
  private onMissionCompletedToast?: (mission: DailyMission) => void;

  private static readonly TEMPLATES: MissionTemplate[] = [
    {
      idTemplate: 'destroy_bricks',
      title: 'Brick Annihilator',
      descriptionTemplate: 'Destroy {target} bricks in any game mode.',
      category: 'bricks',
      baseTarget: 50,
      targetOptions: [40, 60, 80],
      baseReward: 120,
      icon: 'Layers',
    },
    {
      idTemplate: 'combo_master',
      title: 'Combo Striker',
      descriptionTemplate: 'Reach a {target}x combo streak.',
      category: 'combo',
      baseTarget: 5,
      targetOptions: [4, 5, 6],
      baseReward: 150,
      icon: 'Flame',
    },
    {
      idTemplate: 'paddle_bouncer',
      title: 'Paddle Acrobat',
      descriptionTemplate: 'Reflect the ball {target} times with your paddle.',
      category: 'paddle',
      baseTarget: 35,
      targetOptions: [30, 45, 60],
      baseReward: 100,
      icon: 'Shield',
    },
    {
      idTemplate: 'stage_clearer',
      title: 'Stage Champion',
      descriptionTemplate: 'Clear {target} stages on the level shelf.',
      category: 'stages',
      baseTarget: 2,
      targetOptions: [1, 2, 3],
      baseReward: 200,
      icon: 'Trophy',
    },
    {
      idTemplate: 'score_chaser',
      title: 'Score Hunter',
      descriptionTemplate: 'Score {target} total points.',
      category: 'score',
      baseTarget: 4000,
      targetOptions: [3000, 5000, 7500],
      baseReward: 160,
      icon: 'Sparkles',
    },
    {
      idTemplate: 'versus_challenger',
      title: 'Versus Competitor',
      descriptionTemplate: 'Complete {target} round of 2-Player Versus mode.',
      category: 'versus',
      baseTarget: 1,
      targetOptions: [1, 2],
      baseReward: 180,
      icon: 'Swords',
    },
  ];

  constructor(
    onMissionUpdated?: (missions: DailyMission[], coins: number) => void,
    onMissionCompletedToast?: (mission: DailyMission) => void
  ) {
    this.onMissionUpdated = onMissionUpdated;
    this.onMissionCompletedToast = onMissionCompletedToast;
    this.loadCoins();
    this.checkAndGenerateDailyMissions();
  }

  public static getInstance(): DailyMissionsManager {
    if (!DailyMissionsManager.instance) {
      DailyMissionsManager.instance = new DailyMissionsManager();
    }
    return DailyMissionsManager.instance;
  }

  public setCallbacks(
    onMissionUpdated?: (missions: DailyMission[], coins: number) => void,
    onMissionCompletedToast?: (mission: DailyMission) => void
  ) {
    this.onMissionUpdated = onMissionUpdated;
    this.onMissionCompletedToast = onMissionCompletedToast;
  }

  /**
   * Get current formatted date string (YYYY-MM-DD)
   */
  private getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Load coin balance from localStorage
   */
  private loadCoins() {
    try {
      const saved = localStorage.getItem('neon_breakout_coins');
      if (saved) {
        this.coins = parseInt(saved, 10) || 0;
      } else {
        // Starter bonus coins
        this.coins = 200;
        this.saveCoins();
      }
    } catch {
      this.coins = 200;
    }
  }

  private saveCoins() {
    try {
      localStorage.setItem('neon_breakout_coins', String(this.coins));
    } catch {}
  }

  public getCoins(): number {
    return this.coins;
  }

  public addCoins(amount: number): number {
    this.coins += amount;
    this.saveCoins();
    this.notifyUpdate();
    return this.coins;
  }

  /**
   * Load or generate 3 randomized deterministic daily missions for today
   */
  public checkAndGenerateDailyMissions(): DailyMission[] {
    const today = this.getTodayDateString();

    if (this.currentDateStr === today && this.missions.length === 3) {
      return this.missions;
    }

    this.currentDateStr = today;
    const storageKey = `neon_breakout_missions_${today}`;

    // 1. Try to load saved missions for today
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) {
          this.missions = parsed;
          this.notifyUpdate();
          return this.missions;
        }
      }
    } catch {}

    // 2. Generate 3 unique, seeded daily missions for today
    // Seed using date string characters (e.g. 20261107)
    const seedNum = parseInt(today.replace(/-/g, ''), 10) || 20261107;
    const rng = new SeededRandom(seedNum ^ 0x9e3779b9);

    // Pick 3 distinct template indices
    const availableIndices = Array.from({ length: DailyMissionsManager.TEMPLATES.length }, (_, i) => i);
    const chosenTemplates: MissionTemplate[] = [];

    for (let i = 0; i < 3; i++) {
      const pickIdx = rng.rangeInt(0, availableIndices.length - 1);
      const templateIdx = availableIndices.splice(pickIdx, 1)[0];
      chosenTemplates.push(DailyMissionsManager.TEMPLATES[templateIdx]);
    }

    this.missions = chosenTemplates.map((template, idx) => {
      const target = rng.choice(template.targetOptions);
      const rewardCoins = Math.round(template.baseReward * (target / template.baseTarget));
      const description = template.descriptionTemplate.replace('{target}', target.toLocaleString());

      return {
        id: `mission_${today}_${idx}_${template.idTemplate}`,
        title: template.title,
        description,
        category: template.category,
        target,
        current: 0,
        rewardCoins,
        isCompleted: false,
        isClaimed: false,
        icon: template.icon,
      };
    });

    this.saveMissions();
    this.notifyUpdate();
    return this.missions;
  }

  private saveMissions() {
    try {
      const storageKey = `neon_breakout_missions_${this.currentDateStr}`;
      localStorage.setItem(storageKey, JSON.stringify(this.missions));
    } catch {}
  }

  public getMissions(): DailyMission[] {
    return this.missions;
  }

  /**
   * Claim reward for a completed mission
   */
  public claimReward(missionId: string): { success: boolean; coinsAwarded: number } {
    const mission = this.missions.find((m) => m.id === missionId);
    if (!mission || !mission.isCompleted || mission.isClaimed) {
      return { success: false, coinsAwarded: 0 };
    }

    mission.isClaimed = true;
    this.coins += mission.rewardCoins;
    this.saveCoins();
    this.saveMissions();
    this.notifyUpdate();

    return { success: true, coinsAwarded: mission.rewardCoins };
  }

  /**
   * Live Tracker: Bricks Destroyed
   */
  public trackBricksDestroyed(count: number = 1) {
    this.checkAndGenerateDailyMissions();
    let updated = false;

    for (const m of this.missions) {
      if (m.category === 'bricks' && !m.isCompleted) {
        m.current = Math.min(m.target, m.current + count);
        if (m.current >= m.target) {
          m.isCompleted = true;
          this.triggerCompletionToast(m);
        }
        updated = true;
      }
    }

    if (updated) {
      this.saveMissions();
      this.notifyUpdate();
    }
  }

  /**
   * Live Tracker: Paddle Bounce
   */
  public trackPaddleBounce() {
    this.checkAndGenerateDailyMissions();
    let updated = false;

    for (const m of this.missions) {
      if (m.category === 'paddle' && !m.isCompleted) {
        m.current = Math.min(m.target, m.current + 1);
        if (m.current >= m.target) {
          m.isCompleted = true;
          this.triggerCompletionToast(m);
        }
        updated = true;
      }
    }

    if (updated) {
      this.saveMissions();
      this.notifyUpdate();
    }
  }

  /**
   * Live Tracker: Combo Streak
   */
  public trackCombo(combo: number) {
    this.checkAndGenerateDailyMissions();
    let updated = false;

    for (const m of this.missions) {
      if (m.category === 'combo' && !m.isCompleted) {
        if (combo > m.current) {
          m.current = Math.min(m.target, combo);
          if (m.current >= m.target) {
            m.isCompleted = true;
            this.triggerCompletionToast(m);
          }
          updated = true;
        }
      }
    }

    if (updated) {
      this.saveMissions();
      this.notifyUpdate();
    }
  }

  /**
   * Live Tracker: Cumulative Score
   */
  public trackScore(scoreDelta: number) {
    this.checkAndGenerateDailyMissions();
    let updated = false;

    for (const m of this.missions) {
      if (m.category === 'score' && !m.isCompleted) {
        m.current = Math.min(m.target, m.current + scoreDelta);
        if (m.current >= m.target) {
          m.isCompleted = true;
          this.triggerCompletionToast(m);
        }
        updated = true;
      }
    }

    if (updated) {
      this.saveMissions();
      this.notifyUpdate();
    }
  }

  /**
   * Live Tracker: Stage Clear
   */
  public trackStageCleared() {
    this.checkAndGenerateDailyMissions();
    let updated = false;

    for (const m of this.missions) {
      if (m.category === 'stages' && !m.isCompleted) {
        m.current = Math.min(m.target, m.current + 1);
        if (m.current >= m.target) {
          m.isCompleted = true;
          this.triggerCompletionToast(m);
        }
        updated = true;
      }
    }

    if (updated) {
      this.saveMissions();
      this.notifyUpdate();
    }
  }

  /**
   * Live Tracker: Versus Match Round
   */
  public trackVersusRound() {
    this.checkAndGenerateDailyMissions();
    let updated = false;

    for (const m of this.missions) {
      if (m.category === 'versus' && !m.isCompleted) {
        m.current = Math.min(m.target, m.current + 1);
        if (m.current >= m.target) {
          m.isCompleted = true;
          this.triggerCompletionToast(m);
        }
        updated = true;
      }
    }

    if (updated) {
      this.saveMissions();
      this.notifyUpdate();
    }
  }

  private triggerCompletionToast(mission: DailyMission) {
    if (this.onMissionCompletedToast) {
      this.onMissionCompletedToast(mission);
    }
  }

  private notifyUpdate() {
    if (this.onMissionUpdated) {
      this.onMissionUpdated([...this.missions], this.coins);
    }
  }

  /**
   * Time remaining until midnight local reset
   */
  public getTimeUntilReset(): { hours: number; minutes: number; seconds: number; formatted: string } {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const diffMs = Math.max(0, midnight.getTime() - now.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

    return { hours, minutes, seconds, formatted };
  }
}
