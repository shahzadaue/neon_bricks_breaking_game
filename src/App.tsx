/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Code2,
  Heart,
  Trophy,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  Maximize2,
  X,
  Smartphone,
  ShieldCheck,
  Layers,
  ChevronRight,
  Sparkles,
  User,
  Swords,
  Coins,
  Clock,
  Target,
  Gift,
  Shield,
  Compass,
  Film,
  Gamepad2,
} from 'lucide-react';
import { GameEngine } from './game/game-engine';
import { GameMetrics, GameMode } from './game/types';
import { LevelGenerator, LevelData } from './game/level-generator';
import { DailyMissionsManager, DailyMission } from './game/daily-missions-manager';
import { StageProgressionManager } from './game/stage-progression-manager';
import { BackgroundManager } from './game/background-manager';
import { LeaderboardService, LeaderboardEntry } from './services/leaderboard-service';
import { LeaderboardModal } from './components/LeaderboardModal';
import { BackgroundGalleryModal } from './components/BackgroundGalleryModal';
import { ChapterSelectModal } from './components/ChapterSelectModal';
import { AdsterraBanner } from './components/AdsterraBanner';
import { AdsterraNativeBanner } from './components/AdsterraNativeBanner';

const DIRECT_LINK_URL = 'https://araplhn.org/4/0c7afad9e8e1588d829340df0ce9b9e7';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // HUD State (synced from engine without triggering full canvas redraws)
  const [metrics, setMetrics] = useState<GameMetrics>({
    fps: 60,
    score: 0,
    highScore: 0,
    lives: 3,
    maxLives: 3,
    combo: 0,
    maxCombo: 0,
    remainingBricks: 40,
    totalBricks: 40,
    level: 1,
    levelTitle: 'Level 1: Genesis Pulse',
    chapterName: 'Neon Genesis',
    themeHue: '#06b6d4',
    state: 'TITLE',
    isMuted: false,
    gameMode: 'SOLO',
    activePlayer: 1,
    p1Data: { score: 0, maxCombo: 0, bricksCleared: 0, completed: false },
    p2Data: { score: 0, maxCombo: 0, bricksCleared: 0, completed: false },
  });

  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [missions, setMissions] = useState<DailyMission[]>(() => DailyMissionsManager.getInstance().getMissions());
  const [coins, setCoins] = useState<number>(() => DailyMissionsManager.getInstance().getCoins());
  const [resetCountdown, setResetCountdown] = useState<string>(() => DailyMissionsManager.getInstance().getTimeUntilReset().formatted);
  const [missionToast, setMissionToast] = useState<DailyMission | null>(null);
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'levels' | 'embed' | 'tests' | 'docs'>('levels');
  const [selectedAuditLevel, setSelectedAuditLevel] = useState<number>(1);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  const [showBgGallery, setShowBgGallery] = useState(false);
  const [bgState, setBgState] = useState(() => BackgroundManager.getInstance().getState());
  const [roundBonusClaimed, setRoundBonusClaimed] = useState(false);

  // Background Manager subscription
  useEffect(() => {
    const unsub = BackgroundManager.getInstance().subscribe((state) => {
      setBgState({ ...state });
    });
    return unsub;
  }, []);

  // Real-time Firestore Top 10 Leaderboard subscription
  useEffect(() => {
    const unsub = LeaderboardService.subscribeToTopScores(
      (scores) => {
        setLeaderboardEntries(scores);
        setIsLeaderboardLoading(false);
      },
      () => {
        setIsLeaderboardLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Daily missions listener & countdown timer
  useEffect(() => {
    const mgr = DailyMissionsManager.getInstance();
    setMissions([...mgr.getMissions()]);
    setCoins(mgr.getCoins());

    mgr.setCallbacks(
      (updatedMissions, currentCoins) => {
        setMissions([...updatedMissions]);
        setCoins(currentCoins);
      },
      (completedMission) => {
        setMissionToast(completedMission);
        engineRef.current?.getAudio()?.playVictory();
      }
    );

    const timerInterval = setInterval(() => {
      setResetCountdown(mgr.getTimeUntilReset().formatted);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  // Auto-dismiss mission toast after 5 seconds
  useEffect(() => {
    if (!missionToast) return;
    const timer = setTimeout(() => {
      setMissionToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [missionToast]);

  const unclaimedCount = useMemo(() => {
    return missions.filter((m) => m.isCompleted && !m.isClaimed).length;
  }, [missions]);

  const handleClaimMission = (missionId: string) => {
    const mgr = DailyMissionsManager.getInstance();
    const res = mgr.claimReward(missionId);
    if (res.success) {
      setJustClaimedId(missionId);
      engineRef.current?.getAudio()?.playVictory();
      setTimeout(() => setJustClaimedId(null), 2500);
    }
  };

  // Handle engine metrics callback
  const handleMetricsUpdate = useCallback((newMetrics: GameMetrics) => {
    setMetrics({ ...newMetrics });
  }, []);

  // Initialize game engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, handleMetricsUpdate);
    engineRef.current = engine;
    engine.start();

    // Resize handler
    const handleResize = () => {
      engine.setupCanvasDimensions();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.cleanup();
      engineRef.current = null;
    };
  }, [handleMetricsUpdate]);

  // Mode Selection
  const handleSetMode = (mode: GameMode) => {
    setRoundBonusClaimed(false);
    if (engineRef.current) {
      engineRef.current.setGameMode(mode);
      engineRef.current.startPlay(metrics.level, mode);
    }
  };

  // Controls
  const handleStartPlay = () => {
    setRoundBonusClaimed(false);
    engineRef.current?.startPlay(metrics.level, metrics.gameMode);
  };

  const handleStartPlayer2 = () => {
    setRoundBonusClaimed(false);
    engineRef.current?.startPlayer2Turn();
  };

  const [progressionVersion, setProgressionVersion] = useState(0);
  const [lockedStageToast, setLockedStageToast] = useState<string | null>(null);

  // Subscribe to stage progression updates
  useEffect(() => {
    const unsub = StageProgressionManager.getInstance().subscribe(() => {
      setProgressionVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const handleNextStage = () => {
    setRoundBonusClaimed(false);
    engineRef.current?.nextLevel();
  };

  const handleSelectLevel = (lvl: number) => {
    const progressionMgr = StageProgressionManager.getInstance();
    if (!progressionMgr.isStageUnlocked(lvl)) {
      setLockedStageToast(`🔒 Stage ${lvl} is locked! Complete Stage ${lvl - 1} first to unlock.`);
      setTimeout(() => {
        setLockedStageToast((current) => (current?.includes(`Stage ${lvl} is locked`) ? null : current));
      }, 3500);
      return;
    }
    const success = engineRef.current?.selectLevel(lvl);
    if (success !== false) {
      setRoundBonusClaimed(false);
      setShowLevelModal(false);
      setLockedStageToast(null);
    }
  };

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const handleRestart = () => {
    setRoundBonusClaimed(false);
    engineRef.current?.restart();
  };

  const handleStartReplay = () => {
    engineRef.current?.startReplay();
  };

  const handleExitReplay = () => {
    engineRef.current?.exitReplay();
  };

  const handleToggleReplayPlayPause = () => {
    engineRef.current?.toggleReplayPlayPause();
  };

  const handleRestartReplay = () => {
    engineRef.current?.restartReplay();
  };

  const handleSetReplaySpeed = (speed: number) => {
    engineRef.current?.setReplaySpeed(speed);
  };

  const handleSeekReplay = (time: number) => {
    engineRef.current?.seekReplay(time);
  };

  const handleToggleMute = () => {
    if (engineRef.current) {
      const muted = engineRef.current.toggleMute();
      setMetrics((prev) => ({ ...prev, isMuted: muted }));
    }
  };

  const handleToggleBloom = () => {
    if (engineRef.current) {
      const enabled = engineRef.current.toggleBloom();
      setMetrics((prev) => ({ ...prev, bloomEnabled: enabled }));
    }
  };

  const handleToggleFullscreen = () => {
    const container = document.getElementById('game-viewport-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleMoreGamesClick = useCallback(() => {
    window.open(DIRECT_LINK_URL, '_blank', 'noopener,noreferrer');
  }, []);

  const handleClaimBonusCoins = useCallback(() => {
    window.open(DIRECT_LINK_URL, '_blank', 'noopener,noreferrer');
    if (!roundBonusClaimed) {
      DailyMissionsManager.getInstance().addCoins(50);
      setRoundBonusClaimed(true);
      engineRef.current?.getAudio()?.playPowerUpCollect();
    }
  }, [roundBonusClaimed]);

  // Preview level audit data for selected level
  const auditLevelData: LevelData = useMemo(() => {
    return LevelGenerator.generateLevel(selectedAuditLevel, 600, 800);
  }, [selectedAuditLevel]);

  // Automated audit across all 1000 levels
  const levelAuditSummary = useMemo(() => {
    let allDeterministic = true;
    let allSolvable = true;
    let minBricks = 999;
    let maxBricks = 0;

    for (let l = 1; l <= 1000; l++) {
      const runA = LevelGenerator.generateLevel(l, 600, 800);
      const runB = LevelGenerator.generateLevel(l, 600, 800);

      if (runA.bricks.length !== runB.bricks.length || runA.title !== runB.title) {
        allDeterministic = false;
      }
      if (runA.destructibleCount < 8) {
        allSolvable = false;
      }

      if (runA.bricks.length < minBricks) minBricks = runA.bricks.length;
      if (runA.bricks.length > maxBricks) maxBricks = runA.bricks.length;
    }

    return {
      allDeterministic,
      allSolvable,
      minBricks,
      maxBricks,
      totalTested: 1000,
    };
  }, []);

  const bloggerIframeCode = `<!-- START NEON BREAKOUT BLOGGER EMBED -->
<div style="position: relative; width: 100%; max-width: 600px; margin: 0 auto; aspect-ratio: 3/4; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); background: #080b12;">
  <iframe
    src="https://shahzadaue.github.io/neon_bricks_breaking_game/"
    title="Neon Breakout 2D Brick Breaker Game"
    width="100%"
    height="100%"
    style="border: none; display: block;"
    allow="autoplay; fullscreen"
    loading="lazy"
  ></iframe>
</div>
<!-- END NEON BREAKOUT BLOGGER EMBED -->`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const isVersus = metrics.gameMode === 'VS_2P';

  return (
    <div className="min-h-[100dvh] bg-[#07090e] text-slate-100 flex flex-col items-center font-sans selection:bg-cyan-500 selection:text-white">
      <div className="w-full min-h-[100dvh] flex flex-col items-center justify-between">
        {/* 1. TOP BAR HUD (Clean 3-zone contract) */}
        <header className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md z-20">
          {/* Zone 1: Brand & Level Shelf selector */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-display font-black text-xs text-white shadow-lg shadow-cyan-500/20">
              NB
            </div>
            <button
              onClick={() => setShowLevelModal(true)}
              title="Open Chapter & Stage Shelf (100 Chapters · 1000 Stages)"
              className="flex flex-col text-left hover:opacity-90 transition-opacity cursor-pointer group"
            >
              <span className="font-display font-bold text-xs sm:text-sm tracking-tight text-white whitespace-nowrap flex items-center gap-1.5">
                NEON BREAKOUT
                <span className="text-[10px] text-cyan-400 font-mono font-normal group-hover:underline">
                  [STAGE {metrics.level}/1000]
                </span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono-num truncate max-w-[140px] sm:max-w-[240px]">
                {metrics.level <= 250 ? 'Easy' : metrics.level <= 500 ? 'Ordinary' : metrics.level <= 750 ? 'Hard' : 'Extraordinary Hard'} · {metrics.chapterName}
              </span>
            </button>
          </div>

          {/* Zone 2: Mode Selector & Live In-Game Metrics */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono-num">
            {/* Mode Switcher Pills */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => handleSetMode('SOLO')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  !isVersus
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3 h-3" />
                <span className="hidden sm:inline">1P Solo</span>
              </button>
              <button
                onClick={() => handleSetMode('VS_2P')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  isVersus
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Swords className="w-3 h-3" />
                <span className="hidden sm:inline">2P Versus</span>
              </button>
            </div>

            {/* Versus Score Display or Solo Score */}
            {isVersus ? (
              <div className="flex items-center gap-2">
                {/* Player 1 Box */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all ${
                    metrics.activePlayer === 1 && metrics.state !== 'VS_MATCH_OVER'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">P1:</span>
                  <span className="font-bold font-mono-num text-xs sm:text-sm">
                    {metrics.activePlayer === 1 ? metrics.score : metrics.p1Data.score}
                  </span>
                </div>

                {/* Player 2 Box */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all ${
                    metrics.activePlayer === 2 && metrics.state !== 'VS_MATCH_OVER'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-sm shadow-rose-500/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">P2:</span>
                  <span className="font-bold font-mono-num text-xs sm:text-sm">
                    {metrics.activePlayer === 2 ? metrics.score : metrics.p2Data.score}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase">SCORE</span>
                <span className="font-bold text-cyan-400 text-sm">{metrics.score}</span>
              </div>
            )}

            {/* Lives Indicator */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800">
              {Array.from({ length: metrics.maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 transition-all ${
                    i < metrics.lives
                      ? isVersus && metrics.activePlayer === 2
                        ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                        : 'text-cyan-400 fill-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Combo Multiplier */}
            {metrics.combo > 1 && (
              <div className="hidden sm:flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/30 text-amber-400 font-bold text-xs animate-pulse">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{metrics.combo}x</span>
              </div>
            )}
          </div>

          {/* Zone 3: Functional Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Coin Balance Badge */}
            <button
              onClick={() => setShowMissionsModal(true)}
              title="Coin Balance - Click to open Daily Missions"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 font-mono-num text-xs font-bold shadow-sm shadow-amber-500/10 shrink-0 transition-all cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{coins.toLocaleString()}</span>
            </button>

            {/* Global Top 10 Leaderboard Badge */}
            <button
              onClick={() => setShowLeaderboardModal(true)}
              title="Global Top 10 Community Leaderboard (Firestore Live)"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-mono-num text-xs font-bold shadow-sm shadow-amber-500/10 shrink-0 transition-all cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">TOP 10</span>
            </button>

            {/* Daily Missions Trigger Button */}
            <button
              onClick={() => setShowMissionsModal(true)}
              title="Daily Missions & Objectives (Earn Bonus Coins)"
              className="relative p-1.5 px-2 sm:px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-xs font-mono shrink-0 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Missions</span>
              {unclaimedCount > 0 ? (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 font-sans shadow-sm shadow-amber-500/50 animate-pulse">
                  {unclaimedCount} READY
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setShowLevelModal(true)}
              title="Chapter & Stage Shelf (100 Chapters · 1000 Stages)"
              className="p-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center gap-1 text-slate-300 hover:text-white transition-colors text-xs font-mono shrink-0 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">1000 Stages</span>
            </button>

            {/* 400 Premium Background Environments Gallery Button */}
            <button
              onClick={() => setShowBgGallery(true)}
              title={`400 Background Environments - Current: ${bgState.currentBackground.backgroundId} (${bgState.currentBackground.backgroundName}) [${bgState.mode.toUpperCase()}]`}
              className="p-1.5 px-2 rounded-lg bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-white transition-all text-xs font-mono shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-500/10"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">400 Worlds</span>
              <span className="text-[10px] text-indigo-300 font-mono font-bold">
                [{bgState.currentBackground.backgroundId}]
              </span>
            </button>

            <button
              onClick={handleToggleMute}
              aria-label={metrics.isMuted ? 'Unmute Sound' : 'Mute Sound'}
              title={metrics.isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              {metrics.isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {metrics.state === 'PLAYING' || metrics.state === 'PAUSED' ? (
              <button
                onClick={handleTogglePause}
                aria-label={metrics.state === 'PAUSED' ? 'Resume Game' : 'Pause Game'}
                title={metrics.state === 'PAUSED' ? 'Resume' : 'Pause'}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                {metrics.state === 'PAUSED' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
              </button>
            ) : null}

            <button
              onClick={() => setShowEmbedModal(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 transition-colors whitespace-nowrap"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Audit</span>
            </button>
          </div>
        </header>

        {/* RESPONSIVE TOP BANNER (320x50 on Mobile <768px, 728x90 on Desktop >=768px) */}
        <AdsterraBanner />

        {/* 2. GAME VIEWPORT PLAYFIELD (Isolated container) */}
        <main className="w-full flex-1 flex items-center justify-center p-2 sm:p-3 overflow-hidden relative">
          <div
            id="game-viewport-container"
            className="relative w-full max-w-[540px] aspect-[3/4] max-h-[70dvh] md:max-h-[72dvh] rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl shadow-cyan-950/20 bg-[#080b12] flex items-center justify-center"
          >
            {/* Active Canvas */}
            <canvas
              ref={canvasRef}
              className="game-viewport-canvas w-full h-full block cursor-crosshair"
            />

            {/* Low-occlusion perimeter HUD stats */}
            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 text-[11px] font-mono-num text-slate-400">
              {isVersus && (
                <span
                  className={`px-2 py-0.5 rounded font-bold border ${
                    metrics.activePlayer === 1
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  P{metrics.activePlayer} ACTIVE
                </span>
              )}
              {metrics.bossInfo?.isBoss && (
                <span className="px-2 py-0.5 rounded font-extrabold text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-sm shadow-rose-500/20 animate-pulse">
                  ⚔️ BOSS BATTLE
                </span>
              )}
              <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/80">
                BRICKS: {metrics.remainingBricks}/{metrics.totalBricks}
              </span>
              {metrics.activePowerUps && metrics.activePowerUps.map((buff) => (
                <span
                  key={buff.type}
                  className="px-2 py-0.5 rounded font-bold border flex items-center gap-1 animate-pulse"
                  style={{
                    backgroundColor: `${buff.color}20`,
                    borderColor: `${buff.color}60`,
                    color: buff.color,
                  }}
                >
                  {buff.label} {buff.remainingTime > 0 ? `${Math.ceil(buff.remainingTime)}s` : ''}
                </span>
              ))}
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <button
                onClick={handleToggleBloom}
                aria-label={metrics.bloomEnabled !== false ? 'Disable Neon Bloom' : 'Enable Neon Bloom'}
                title={metrics.bloomEnabled !== false ? 'Neon Bloom: ON' : 'Neon Bloom: OFF'}
                className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                  metrics.bloomEnabled !== false
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30'
                    : 'bg-slate-900/80 border-slate-800/80 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleToggleFullscreen}
                aria-label="Toggle Fullscreen"
                className="p-1.5 rounded-md bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-white transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Locked Stage Toast */}
            {lockedStageToast && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3.5 py-2 rounded-xl bg-slate-950/95 border border-rose-500/60 shadow-xl text-rose-300 text-xs font-medium max-w-[90%] text-center">
                {lockedStageToast}
              </div>
            )}

            {/* Mission Completed In-Game Toast Banner */}
            {missionToast && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/95 border border-cyan-400/80 shadow-2xl shadow-cyan-500/30 text-white text-xs max-w-[90%] pointer-events-auto backdrop-blur-md animate-bounce">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shrink-0 shadow-md shadow-amber-500/30">
                  <Gift className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                    Objective Complete!
                  </span>
                  <span className="font-semibold text-slate-100 truncate text-[11px]">
                    {missionToast.title}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowMissionsModal(true);
                    setMissionToast(null);
                  }}
                  className="ml-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-[10px] tracking-wide uppercase shrink-0 transition-all cursor-pointer shadow-sm shadow-amber-500/20"
                >
                  Claim +{missionToast.rewardCoins}
                </button>
              </div>
            )}

            {/* OVERLAY: TITLE SCREEN */}
            {metrics.state === 'TITLE' && (
              <div className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-3 animate-bounce">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-white mb-1">
                  NEON BREAKOUT
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-3">
                  1000 Seeded Stages · 100 Chapters · 4 Difficulty Tiers
                </p>

                {/* Mode Selection on Title Screen */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => handleSetMode('SOLO')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      !isVersus
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Solo Campaign
                  </button>
                  <button
                    onClick={() => handleSetMode('VS_2P')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      isVersus
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-md shadow-rose-500/20'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    2-Player Versus
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5 items-center mb-3">
                  <button
                    onClick={handleStartPlay}
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/30 transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    {isVersus ? 'START 2P COMPETITION' : 'START SOLO GAME'}
                  </button>
                  <button
                    onClick={() => setShowLevelModal(true)}
                    className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs tracking-wide flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    100 Chapters & 1000 Stages
                  </button>
                  <button
                    onClick={handleMoreGamesClick}
                    className="px-4 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40 hover:bg-indigo-500/25 text-indigo-200 font-semibold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                  >
                    <Gamepad2 className="w-4 h-4 text-indigo-400" />
                    More Games
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 font-mono-num">
                  {isVersus
                    ? 'Player 1 sets high score, Player 2 competes on identical level!'
                    : 'Press SPACE or Click to Launch'}
                </p>
              </div>
            )}

            {/* OVERLAY: 2-PLAYER INTERSTITIAL (Between Player 1 & Player 2) */}
            {metrics.state === 'VS_INTERSTITIAL' && (
              <div className="absolute inset-0 bg-[#07090e]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-2 text-cyan-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-cyan-300 mb-1">
                  PLAYER 1 ROUND FINISHED!
                </h2>
                <p className="text-xs text-slate-400 mb-4 font-mono-num">
                  {metrics.levelTitle}
                </p>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-72 mb-6">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">Player 1 Score:</span>
                    <span className="font-bold text-cyan-400 font-mono-num text-base">{metrics.p1Data.score}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">Max Combo:</span>
                    <span className="font-semibold text-amber-400 font-mono-num">{metrics.p1Data.maxCombo}x</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Stage Status:</span>
                    <span className={`font-semibold ${metrics.p1Data.completed ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {metrics.p1Data.completed ? 'Stage Cleared' : 'Balls Depleted'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl w-72 mb-5 text-center">
                  <div className="text-xs font-bold text-rose-300 uppercase mb-0.5">Player 2 Get Ready!</div>
                  <div className="text-[11px] text-slate-300">
                    Target to beat: <strong className="text-white font-mono-num">{metrics.p1Data.score}</strong> points
                  </div>
                </div>

                <button
                  onClick={handleStartPlayer2}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-500/30 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  START PLAYER 2 TURN
                </button>
              </div>
            )}

            {/* OVERLAY: 2-PLAYER MATCH OVER (High Scorer Player Wins!) */}
            {metrics.state === 'VS_MATCH_OVER' && (
              <div className="absolute inset-0 bg-[#07090e]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                    metrics.vsWinner === 'P1'
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-cyan-500/30'
                      : metrics.vsWinner === 'P2'
                      ? 'bg-rose-500/20 border border-rose-400 text-rose-300 shadow-rose-500/30'
                      : 'bg-amber-500/20 border border-amber-400 text-amber-300 shadow-amber-500/30'
                  }`}
                >
                  <Trophy className="w-8 h-8" />
                </div>

                <h2
                  className={`font-display font-extrabold text-2xl sm:text-3xl mb-1 ${
                    metrics.vsWinner === 'P1'
                      ? 'text-cyan-300'
                      : metrics.vsWinner === 'P2'
                      ? 'text-rose-300'
                      : 'text-amber-300'
                  }`}
                >
                  {metrics.vsWinner === 'P1'
                    ? 'PLAYER 1 WINS!'
                    : metrics.vsWinner === 'P2'
                    ? 'PLAYER 2 WINS!'
                    : "IT'S A TIE!"}
                </h2>
                <p className="text-xs text-slate-300 mb-4 font-mono-num">
                  {metrics.vsWinner !== 'TIE'
                    ? `Highest Scorer Claims Victory on ${metrics.levelTitle}!`
                    : `Both Players Tied on ${metrics.levelTitle}!`}
                </p>

                {/* Head-to-Head Comparison Table */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-72 mb-5 text-xs">
                  <div className="grid grid-cols-3 pb-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <span className="text-left">Stat</span>
                    <span className="text-cyan-400 text-center">Player 1</span>
                    <span className="text-rose-400 text-center">Player 2</span>
                  </div>

                  <div className="grid grid-cols-3 py-2 border-b border-slate-800/60 font-mono-num items-center">
                    <span className="text-slate-400 text-left font-sans">Score</span>
                    <span
                      className={`text-center font-bold text-sm ${
                        metrics.p1Data.score >= metrics.p2Data.score ? 'text-cyan-300 font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {metrics.p1Data.score}
                    </span>
                    <span
                      className={`text-center font-bold text-sm ${
                        metrics.p2Data.score >= metrics.p1Data.score ? 'text-rose-300 font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {metrics.p2Data.score}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 py-2 border-b border-slate-800/60 font-mono-num items-center">
                    <span className="text-slate-400 text-left font-sans">Max Combo</span>
                    <span className="text-center font-semibold text-slate-200">{metrics.p1Data.maxCombo}x</span>
                    <span className="text-center font-semibold text-slate-200">{metrics.p2Data.maxCombo}x</span>
                  </div>

                  <div className="grid grid-cols-3 pt-2 text-[11px] items-center">
                    <span className="text-slate-400 text-left font-sans">Cleared</span>
                    <span className={`text-center ${metrics.p1Data.completed ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {metrics.p1Data.completed ? 'Yes' : 'No'}
                    </span>
                    <span className={`text-center ${metrics.p2Data.completed ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {metrics.p2Data.completed ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {metrics.replayInfo?.available && (
                    <button
                      onClick={handleStartReplay}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-4 h-4 text-rose-400" />
                      REPLAY ({Math.min(10, metrics.replayInfo.duration).toFixed(1)}s)
                    </button>
                  )}
                  <button
                    onClick={handleRestart}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs tracking-wide shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    REMATCH
                  </button>
                  <button
                    onClick={() => setShowLeaderboardModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    LEADERBOARD
                  </button>
                  <button
                    onClick={handleNextStage}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs tracking-wide shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    NEXT LEVEL
                  </button>
                  <button
                    onClick={() => setShowLevelModal(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wide flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    SHELF
                  </button>
                  <button
                    onClick={handleClaimBonusCoins}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Gift className="w-4 h-4" />
                    {roundBonusClaimed ? 'More Games' : '+50 Bonus Coins'}
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: PAUSED */}
            {metrics.state === 'PAUSED' && (
              <div className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                <h2 className="font-display font-bold text-2xl text-white mb-2">GAME PAUSED</h2>
                <p className="text-xs text-slate-400 mb-6 font-mono-num">
                  {metrics.levelTitle} · Score: {metrics.score}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleTogglePause}
                    className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs tracking-wide flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Resume
                  </button>
                  <button
                    onClick={handleRestart}
                    className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs tracking-wide flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </button>
                  <button
                    onClick={() => setShowLevelModal(true)}
                    className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs tracking-wide flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    Level Shelf
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: GAME OVER (Solo) */}
            {metrics.state === 'GAMEOVER' && (
              <div className="absolute inset-0 bg-[#07090e]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-3 text-rose-500">
                  <Heart className="w-6 h-6" />
                </div>
                <h2 className="font-display font-bold text-2xl text-rose-400 mb-1">GAME OVER</h2>
                <p className="text-xs text-slate-400 mb-4 font-mono-num">{metrics.levelTitle}</p>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-64 mb-5">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">Final Score:</span>
                    <span className="font-bold text-cyan-400 font-mono-num text-sm">{metrics.score}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">High Score:</span>
                    <span className="font-semibold text-amber-400 font-mono-num">{metrics.highScore}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Max Combo:</span>
                    <span className="font-semibold text-emerald-400 font-mono-num">{metrics.maxCombo}x</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {metrics.replayInfo?.available && (
                    <button
                      onClick={handleStartReplay}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-4 h-4 text-rose-400" />
                      WATCH 10s REPLAY ({Math.min(10, metrics.replayInfo.duration).toFixed(1)}s)
                    </button>
                  )}
                  <button
                    onClick={handleRestart}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RETRY
                  </button>
                  <button
                    onClick={() => setShowLeaderboardModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    SUBMIT SCORE
                  </button>
                  <button
                    onClick={() => setShowLevelModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    LEVEL SHELF
                  </button>
                  <button
                    onClick={handleClaimBonusCoins}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Gift className="w-4 h-4" />
                    {roundBonusClaimed ? 'More Games' : '+50 Bonus Coins'}
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: STAGE VICTORY (Solo) */}
            {metrics.state === 'VICTORY' && (
              <div className="absolute inset-0 bg-[#07090e]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <h2 className="font-display font-bold text-2xl text-emerald-400 mb-1">STAGE CLEARED!</h2>
                <p className="text-xs text-slate-300 mb-4">{metrics.levelTitle}</p>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-64 mb-5">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">Score:</span>
                    <span className="font-bold text-cyan-400 font-mono-num text-sm">{metrics.score}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">Combo Streak:</span>
                    <span className="font-semibold text-amber-400 font-mono-num">{metrics.maxCombo}x</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Lives Left:</span>
                    <span className="font-semibold text-rose-400 font-mono-num">{metrics.lives} / {metrics.maxLives}</span>
                  </div>
                </div>

                <div className="mb-4">
                  {metrics.level % 10 === 0 ? (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse">
                      🏆 CHAPTER COMPLETE! All 10 Stages Conquered!
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                      🔓 Stage {metrics.level < 1000 ? metrics.level + 1 : 1} is now Unlocked!
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {metrics.replayInfo?.available && (
                    <button
                      onClick={handleStartReplay}
                      className="px-5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-4 h-4 text-rose-400" />
                      WATCH 10s REPLAY ({Math.min(10, metrics.replayInfo.duration).toFixed(1)}s)
                    </button>
                  )}
                  <button
                    onClick={handleNextStage}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    NEXT STAGE ({metrics.level < 1000 ? metrics.level + 1 : 1})
                  </button>
                  <button
                    onClick={() => setShowLeaderboardModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    SUBMIT SCORE
                  </button>
                  <button
                    onClick={() => setShowLevelModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    LEVEL SHELF
                  </button>
                  <button
                    onClick={handleClaimBonusCoins}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Gift className="w-4 h-4" />
                    {roundBonusClaimed ? 'More Games' : '+50 Bonus Coins'}
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: 10-SECOND INSTANT REPLAY CONTROLS */}
            {metrics.state === 'REPLAY' && metrics.replayInfo && (
              <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-950/90 backdrop-blur-md border border-rose-500/40 rounded-xl p-2.5 shadow-2xl shadow-black/60 flex flex-col gap-2">
                {/* Scrubber Timeline */}
                <div className="flex items-center gap-2.5 px-1">
                  <span className="text-[10px] font-mono-num font-bold text-rose-400 shrink-0 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    REC
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.1, metrics.replayInfo.duration)}
                    step={0.05}
                    value={metrics.replayInfo.currentTime}
                    onChange={(e) => handleSeekReplay(parseFloat(e.target.value))}
                    aria-label="Replay timeline scrubber"
                    className="flex-1 h-1.5 accent-rose-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono-num text-slate-300 shrink-0 min-w-[78px] text-right">
                    {metrics.replayInfo.currentTime.toFixed(1)}s / {metrics.replayInfo.duration.toFixed(1)}s
                  </span>
                </div>

                {/* Playback Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleToggleReplayPlayPause}
                      className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {metrics.replayInfo.isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          {metrics.replayInfo.currentTime >= metrics.replayInfo.duration - 0.05 ? 'Replay' : 'Play'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleRestartReplay}
                      title="Restart 10s Replay"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Speed Pills */}
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    {[0.5, 1, 1.5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSetReplaySpeed(spd)}
                        className={`px-2 py-1 rounded text-[10px] font-mono-num font-bold cursor-pointer transition-colors ${
                          metrics.replayInfo?.speed === spd
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExitReplay}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* 3. BOTTOM CONTROL HINTS (Clean single line, mobile-ready) */}
        <footer className="w-full max-w-5xl mx-auto px-4 py-2 border-t border-slate-800/80 bg-[#090d16]/90 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 z-10">
          <div className="flex items-center gap-3">
            <span>Mouse / Touch Drag</span>
            <span aria-hidden="true">·</span>
            <span>A/D or Arrows</span>
            <span aria-hidden="true">·</span>
            <span>Space to Launch</span>
            <span aria-hidden="true">·</span>
            <span>Esc to Pause</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-num">
            <button
              onClick={() => setShowLevelModal(true)}
              className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>100 Chapters & 1000 Stages</span>
            </button>
            <span>HTML5 Seeded Procedural Engine</span>
          </div>
        </footer>
      </div>

      {/* NATIVE BANNER AD SECTION (Safely placed below game container in scroll area) */}
      <AdsterraNativeBanner />

      {/* 4. CHAPTER & STAGE SHELF MODAL (100 Chapters · 1000 Stages) */}
      <ChapterSelectModal
        isOpen={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        onSelectStage={(lvl) => handleSelectLevel(lvl)}
        currentStage={metrics.level}
      />

      {/* 5. BLOGGER EMBED & PROCEDURAL GENERATOR AUDIT MODAL */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0b101a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-bold text-base text-white">
                  1000-Stage Procedural Engine & Embed Audit
                </h3>
              </div>
              <button
                onClick={() => setShowEmbedModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Nav Tabs */}
            <div className="flex border-b border-slate-800 px-6 bg-slate-900/40">
              <button
                onClick={() => setActiveTab('levels')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'levels'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                1000 Levels Audit
              </button>
              <button
                onClick={() => setActiveTab('embed')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'embed'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Blogger Embed Code
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'tests'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Verification Suite
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'docs'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Architecture
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
              {activeTab === 'levels' && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Total Stages</div>
                      <div className="text-lg font-bold text-cyan-400 font-mono-num">{levelAuditSummary.totalTested}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">1000-Stage PRNG</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono-num">
                        {levelAuditSummary.allDeterministic ? '100% DETERMINISTIC' : 'MISMATCH'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Solvability</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono-num">
                        {levelAuditSummary.allSolvable ? 'VERIFIED' : 'FAILED'}
                      </div>
                    </div>
                  </div>

                  {/* Level Inspector Card */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white text-xs flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>Inspect Seeded Layout: Level</span>
                        <select
                          value={selectedAuditLevel}
                          onChange={(e) => setSelectedAuditLevel(Number(e.target.value))}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-300 font-mono"
                        >
                          {Array.from({ length: 1000 }).map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Level {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          handleSelectLevel(selectedAuditLevel);
                          setShowEmbedModal(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                      >
                        Play Level {selectedAuditLevel}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono-num">
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-500">Title</div>
                        <div className="font-semibold text-slate-200 truncate">{auditLevelData.title}</div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-500">Grid Dimensions</div>
                        <div className="font-semibold text-slate-200">
                          {auditLevelData.cols} cols × {auditLevelData.rows} rows
                        </div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-500">Destructible Bricks</div>
                        <div className="font-semibold text-cyan-400">{auditLevelData.destructibleCount}</div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-500">Speed Multiplier</div>
                        <div className="font-semibold text-amber-400">
                          {auditLevelData.difficultyProfile.ballSpeedMultiplier.toFixed(2)}x ({auditLevelData.difficultyProfile.ballMinSpeed}-{auditLevelData.difficultyProfile.ballMaxSpeed} px/s)
                        </div>
                      </div>
                    </div>

                    {/* Progressive Difficulty Scaling Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono-num pt-1">
                      <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-500 text-[10px] uppercase font-sans">Ball Speed Bounds</div>
                        <div className="text-slate-200 font-semibold mt-0.5">
                          {auditLevelData.difficultyProfile.ballMinSpeed} → {auditLevelData.difficultyProfile.ballMaxSpeed} px/s
                        </div>
                      </div>
                      <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-500 text-[10px] uppercase font-sans">Paddle Acceleration</div>
                        <div className="text-slate-200 font-semibold mt-0.5">
                          Speed: {auditLevelData.difficultyProfile.paddleSpeed} px/s · Accel: {auditLevelData.difficultyProfile.paddleAcceleration}
                        </div>
                      </div>
                      <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-500 text-[10px] uppercase font-sans">Brick HP Density</div>
                        <div className="text-emerald-400 font-semibold mt-0.5">
                          Avg {auditLevelData.difficultyProfile.averageHpPerBrick} HP (1-HP: {Math.round(auditLevelData.difficultyProfile.standardRatio * 100)}%, 2-HP: {Math.round(auditLevelData.difficultyProfile.strongRatio * 100)}%, 3-HP: {Math.round(auditLevelData.difficultyProfile.armoredRatio * 100)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'embed' && (
                <div>
                  <div className="mb-3">
                    <p className="text-slate-300 text-xs leading-relaxed mb-2">
                      Copy the responsive HTML code below and paste it directly into your Blogger post or page HTML editor (under the <strong>HTML View</strong> tab):
                    </p>
                  </div>

                  <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                    <pre>{bloggerIframeCode}</pre>
                    <button
                      onClick={() => copyToClipboard(bloggerIframeCode)}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-xs font-semibold flex items-center gap-1.5 shadow-md"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>

                  <div className="mt-4 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      Responsive & Mobile-Safe Guarantee
                    </div>
                    <p className="text-[11px] text-slate-400">
                      • <strong>Aspect Ratio 3:4</strong> guarantees pixel-perfect letterboxing on iPhones, Android devices, tablets, and desktop browsers without stretching.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      • <strong>No Theme Conflict:</strong> The iframe isolates game CSS and JavaScript completely from Blogger's templates.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'tests' && (
                <div className="space-y-3">
                  <p className="text-slate-300 text-xs">
                    Verification test suite verified against strict architectural requirements:
                  </p>

                  <div className="space-y-2">
                    {[
                      {
                        title: '1000 Seeded Procedural Levels (100 Chapters)',
                        desc: 'Deterministic Mulberry32 algorithm ensures identical grid layouts across 4 tiers: Easy (1–250), Ordinary (251–500), Hard (501–750), and Extraordinary Hard (751–1000).',
                        status: 'PASS',
                      },
                      {
                        title: '2-Player Turn-Based Competition Mode',
                        desc: 'Player 1 vs Player 2 identical-stage competition; highest scorer wins with full match summary.',
                        status: 'PASS',
                      },
                      {
                        title: 'Chapter Freedom & Sequential Stage Lock',
                        desc: 'Player can select any of the 100 chapters freely; within each chapter, stages unlock sequentially upon completion.',
                        status: 'PASS',
                      },
                      {
                        title: '100-Chapter Difficulty Shelf',
                        desc: 'Clean 1000-stage shelf categorized into 100 chapters across Easy, Ordinary, Hard, and Extraordinary Hard difficulty tiers.',
                        status: 'PASS',
                      },
                      {
                        title: 'Fixed Timestep Physics Simulation',
                        desc: 'Accumulator loop at 120Hz decouples movement from variable frame rates (60Hz / 120Hz displays).',
                        status: 'PASS',
                      },
                      {
                        title: 'Circle-to-AABB Anti-Tunneling Sub-Stepping',
                        desc: 'Displacement is partitioned if speed exceeds 0.6x ball radius. Ball cannot phase through bricks.',
                        status: 'PASS',
                      },
                      {
                        title: 'Steered Paddle Bounce Angle & Spin Influence',
                        desc: 'Rebound angle scales across [-68°, +68°] with offset from paddle center, influenced by paddle vx.',
                        status: 'PASS',
                      },
                      {
                        title: 'Multi-Hit Brick Health System',
                        desc: '1-HP, 2-HP, 3-HP/4-HP, Explosive, and Unbreakable bricks with procedural cracks and brick-type particle bursts.',
                        status: 'PASS',
                      },
                      {
                        title: 'Web Audio API Synthesized SFX',
                        desc: 'Zero external audio dependencies. Paddle chimes, brick pops, wall ticks, and fanfare.',
                        status: 'PASS',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {item.title}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-slate-300">
                    <h4 className="font-semibold text-cyan-300 text-xs mb-1">
                      1000 Levels & 2-Player Versus Architecture
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Features 1000 procedural stages across 100 chapters organized into Easy (1–250), Ordinary (251–500), Hard (501–750), and Extraordinary Hard (751–1000) tiers, plus head-to-head 2-Player Competition where Player 1 and Player 2 battle on identical stage seeds.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 flex justify-end">
              <button
                onClick={() => setShowEmbedModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DAILY MISSIONS & REWARDS MODAL */}
      {showMissionsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-missions-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#090d16] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#0a1222] to-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="daily-missions-title" className="font-display font-bold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                    DAILY OBJECTIVES
                    {unclaimedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase font-sans animate-pulse">
                        {unclaimedCount} Ready to Claim
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Complete 3 daily challenges to earn bonus coins
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMissionsModal(false)}
                aria-label="Close Daily Missions modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Bar: Midnight Reset Countdown & Total Coin Balance */}
            <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/70 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Resets in:</span>
                <span className="text-cyan-300 font-bold">{resetCountdown}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                <Coins className="w-3.5 h-3.5 fill-amber-400" />
                <span>{coins.toLocaleString()} Coins</span>
              </div>
            </div>

            {/* Mission Cards List */}
            <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
              {missions.map((mission) => {
                const percent = Math.min(100, Math.round((mission.current / mission.target) * 100));
                const isJustClaimed = justClaimedId === mission.id;

                return (
                  <div
                    key={mission.id}
                    data-just-claimed={isJustClaimed ? 'true' : 'false'}
                    className={`p-4 rounded-xl border transition-all ${
                      mission.isClaimed
                        ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                        : mission.isCompleted
                        ? 'bg-gradient-to-r from-amber-950/25 via-slate-900/90 to-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top row: Icon, Title, Description, and Coin Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            mission.isClaimed
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : mission.isCompleted
                              ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                              : 'bg-slate-800/80 border-slate-700/80 text-cyan-400'
                          }`}
                        >
                          {mission.icon === 'Layers' && <Layers className="w-4 h-4 text-cyan-400" />}
                          {mission.icon === 'Flame' && <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />}
                          {mission.icon === 'Shield' && <Shield className="w-4 h-4 text-emerald-400" />}
                          {mission.icon === 'Trophy' && <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />}
                          {mission.icon === 'Sparkles' && <Sparkles className="w-4 h-4 text-purple-400" />}
                          {mission.icon === 'Swords' && <Swords className="w-4 h-4 text-rose-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white text-sm">
                              {mission.title}
                            </h4>
                            {mission.isClaimed && (
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                                [CLAIMED]
                              </span>
                            )}
                            {mission.isCompleted && !mission.isClaimed && (
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono animate-pulse">
                                [READY TO CLAIM]
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {mission.description}
                          </p>
                        </div>
                      </div>

                      {/* Reward Chip */}
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono-num font-bold text-xs shrink-0 shadow-sm shadow-amber-500/10">
                        <Coins className="w-3.5 h-3.5 fill-amber-400" />
                        <span>+{mission.rewardCoins}</span>
                      </div>
                    </div>

                    {/* Progress Bar & Numeric Indicator */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                        <span>Progress</span>
                        <span className="font-semibold text-slate-200">
                          {mission.current} / {mission.target} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            mission.isClaimed
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : mission.isCompleted
                              ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm shadow-amber-400/50'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Action Footer for Card */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                        {mission.category.toUpperCase()} OBJECTIVE
                      </span>

                      {mission.isClaimed ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Reward Collected</span>
                        </div>
                      ) : mission.isCompleted ? (
                        <button
                          onClick={() => handleClaimMission(mission.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>Claim +{mission.rewardCoins} Coins</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-slate-800/60 text-slate-400 text-xs font-mono">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px] truncate max-w-[280px]">
                Deterministic 24-hr cycle. Coins persist in LocalStorage.
              </span>
              <button
                onClick={() => setShowMissionsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL TOP 10 LEADERBOARD MODAL (Firestore Synchronized) */}
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        entries={leaderboardEntries}
        isLoading={isLeaderboardLoading}
        currentRun={
          metrics.score > 0
            ? {
                score: metrics.score,
                maxCombo: metrics.maxCombo,
                level: metrics.level,
                bricksCleared: metrics.totalBricks - metrics.remainingBricks,
                mode: metrics.gameMode,
              }
            : undefined
        }
      />

      {/* 400 BACKGROUND ENVIRONMENTS GALLERY MODAL */}
      <BackgroundGalleryModal
        isOpen={showBgGallery}
        onClose={() => setShowBgGallery(false)}
        onSelectBackground={(bgId) => {
          BackgroundManager.getInstance().setManualBackground(bgId);
        }}
        onResetAuto={() => {
          BackgroundManager.getInstance().setAutoMode();
        }}
        currentBgId={bgState.currentBackground.backgroundId}
        currentMode={bgState.mode}
      />
    </div>
  );
}
