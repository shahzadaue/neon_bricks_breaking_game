/**
 * Chapter Select & Stage Selection Modal:
 * Interactive 100-Chapter Navigator and 10-Stage Progression Drawer across 1000 stages.
 * Supports filtering across all 4 Difficulty Tiers:
 * Easy (1-250), Ordinary (251-500), Hard (501-750), and Extraordinary Hard (751-1000).
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Lock,
  CheckCircle2,
  ChevronLeft,
  Search,
  Trophy,
  Star,
  Layers,
  ArrowRight,
  Flame,
  Shield,
  Zap,
  Sparkles,
} from 'lucide-react';
import { LevelGenerator, ChapterInfo } from '../game/level-generator';
import { StageProgressionManager, ChapterProgressInfo } from '../game/stage-progression-manager';
import { DifficultyManager, DifficultyTier } from '../game/difficulty-manager';

interface ChapterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStage: (stageNumber: number) => void;
  currentStage: number;
}

type TierFilter = 'ALL' | 'EASY' | 'ORDINARY' | 'HARD' | 'EXTRAORDINARY';

function getChapterTier(chapterIndex: number): DifficultyTier {
  if (chapterIndex <= 25) return 'Easy';
  if (chapterIndex <= 50) return 'Ordinary';
  if (chapterIndex <= 75) return 'Hard';
  return 'Extraordinary Hard';
}

function getTierBadgeStyle(tier: DifficultyTier): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (tier) {
    case 'Easy':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-300',
        border: 'border-emerald-500/40',
        label: 'EASY',
      };
    case 'Ordinary':
      return {
        bg: 'bg-cyan-500/15',
        text: 'text-cyan-300',
        border: 'border-cyan-500/40',
        label: 'ORDINARY',
      };
    case 'Hard':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/40',
        label: 'HARD',
      };
    case 'Extraordinary Hard':
      return {
        bg: 'bg-rose-500/15',
        text: 'text-rose-300',
        border: 'border-rose-500/40',
        label: 'EXTRAORDINARY HARD',
      };
  }
}

export function ChapterSelectModal({
  isOpen,
  onClose,
  onSelectStage,
  currentStage,
}: ChapterSelectModalProps) {
  const progressionMgr = StageProgressionManager.getInstance();

  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalProgress = useMemo(() => {
    return progressionMgr.getTotalProgress();
  }, [progressionMgr, isOpen]);

  const filteredChapters: ChapterInfo[] = useMemo(() => {
    let list = LevelGenerator.CHAPTERS;

    if (tierFilter === 'EASY') {
      list = list.filter((c) => c.chapterIndex >= 1 && c.chapterIndex <= 25);
    } else if (tierFilter === 'ORDINARY') {
      list = list.filter((c) => c.chapterIndex >= 26 && c.chapterIndex <= 50);
    } else if (tierFilter === 'HARD') {
      list = list.filter((c) => c.chapterIndex >= 51 && c.chapterIndex <= 75);
    } else if (tierFilter === 'EXTRAORDINARY') {
      list = list.filter((c) => c.chapterIndex >= 76 && c.chapterIndex <= 100);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const numericStage = parseInt(q, 10);
      list = list.filter((c) => {
        const tier = getChapterTier(c.chapterIndex).toLowerCase();
        const startStage = (c.chapterIndex - 1) * 10 + 1;
        const endStage = c.chapterIndex * 10;
        const matchesStage =
          !isNaN(numericStage) && numericStage >= startStage && numericStage <= endStage;
        const matchesName = c.chapterName.toLowerCase().includes(q);
        const matchesDesc = c.description.toLowerCase().includes(q);
        const matchesIndex = `chapter ${c.chapterIndex}`.includes(q) || `ch ${c.chapterIndex}`.includes(q);
        const matchesTier = tier.includes(q);
        return matchesName || matchesDesc || matchesIndex || matchesTier || matchesStage;
      });
    }

    return list;
  }, [tierFilter, searchQuery]);

  if (!isOpen) return null;

  const selectedChapterInfo: ChapterInfo | undefined = activeChapterIndex
    ? LevelGenerator.CHAPTERS.find((c) => c.chapterIndex === activeChapterIndex)
    : undefined;

  const selectedChapterProgress: ChapterProgressInfo | undefined = activeChapterIndex
    ? progressionMgr.getChapterProgress(activeChapterIndex)
    : undefined;

  const selectedChapterTier: DifficultyTier | undefined = activeChapterIndex
    ? getChapterTier(activeChapterIndex)
    : undefined;

  const STAGE_PATTERN_LABELS = [
    { title: 'Genesis Formation', desc: 'Clean formations scaled to your selected difficulty tier.' },
    { title: 'Multicolor Spectrum', desc: 'Vibrant rainbow rows with multi-tone deflection.' },
    { title: 'Kinetic Drift', desc: 'Moving horizontal brick clusters in harmonic patrol.' },
    { title: 'Armored Bastion', desc: 'Heavy multi-hit titanium walls requiring persistent volleys.' },
    { title: 'Explosive Core', desc: 'Volatile blast bricks triggering chain detonations.' },
    { title: 'Hazard Descent', desc: 'Steep defensive walls with dense downward obstacles.' },
    { title: 'Precision Gate', desc: 'Narrow deflector corridors flanked by unbreakable barriers.' },
    { title: 'Multi-Ball Frenzy', desc: 'Dense cluster designed for chaotic multi-ball bounces.' },
    { title: 'Labyrinth Maze', desc: 'Intricate multi-tier maze requiring deep penetration.' },
    { title: '⚔️ BOSS APEX TITAN', desc: 'Moving armored command structure firing plasma volleys.' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#0a0f1c]/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-base sm:text-lg text-white tracking-tight">
                  {activeChapterIndex
                    ? `Chapter ${activeChapterIndex}: ${selectedChapterInfo?.chapterName}`
                    : '100 Chapters · 1000 Stages'}
                </h2>
                {selectedChapterTier && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      getTierBadgeStyle(selectedChapterTier).bg
                    } ${getTierBadgeStyle(selectedChapterTier).text} ${
                      getTierBadgeStyle(selectedChapterTier).border
                    }`}
                  >
                    {getTierBadgeStyle(selectedChapterTier).label}
                  </span>
                )}
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-md">
                  {totalProgress.totalCompletedStages}/1000 Cleared ({totalProgress.totalGamePercentage}%)
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {activeChapterIndex
                  ? selectedChapterInfo?.description
                  : 'Choose Easy (1–250), Ordinary (251–500), Hard (501–750), or Extraordinary Hard (751–1000).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeChapterIndex && (
              <button
                onClick={() => setActiveChapterIndex(null)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>All Chapters</span>
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Close Level Selector"
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="px-4 py-2 sm:px-6 bg-[#070b14] border-b border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4 text-slate-300 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Stages: <strong className="text-white">{totalProgress.totalCompletedStages}</strong>/1000</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span>Stars: <strong className="text-white">{totalProgress.totalStars}</strong>/{totalProgress.maxStars}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chapters: <strong className="text-white">{totalProgress.completedChaptersCount}</strong>/100</span>
            </div>
          </div>

          <div className="w-full sm:w-48 h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${totalProgress.totalGamePercentage}%` }}
            />
          </div>
        </div>

        {/* View 1: 100 Chapters Overview */}
        {!activeChapterIndex && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Difficulty Tier Filter Tabs & Search Bar */}
            <div className="px-4 py-2.5 sm:px-6 bg-[#080d17] border-b border-slate-800/70 flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800 overflow-x-auto w-full lg:w-auto scrollbar-none">
                <button
                  onClick={() => setTierFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    tierFilter === 'ALL'
                      ? 'bg-slate-700 text-white border border-slate-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All (1–1000)
                </button>
                <button
                  onClick={() => setTierFilter('EASY')}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    tierFilter === 'EASY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Easy (1–250)
                </button>
                <button
                  onClick={() => setTierFilter('ORDINARY')}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    tierFilter === 'ORDINARY'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-cyan-300'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  Ordinary (251–500)
                </button>
                <button
                  onClick={() => setTierFilter('HARD')}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    tierFilter === 'HARD'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Hard (501–750)
                </button>
                <button
                  onClick={() => setTierFilter('EXTRAORDINARY')}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    tierFilter === 'EXTRAORDINARY'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  Extraordinary Hard (751–1000)
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full lg:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search chapter, tier, or 1-1000..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>

            {/* Chapters Grid (100 Cards) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredChapters.map((ch) => {
                const prog = progressionMgr.getChapterProgress(ch.chapterIndex);
                const isCurrent = StageProgressionManager.getChapterForStage(currentStage) === ch.chapterIndex;
                const tier = getChapterTier(ch.chapterIndex);
                const badge = getTierBadgeStyle(tier);

                return (
                  <button
                    key={ch.chapterIndex}
                    onClick={() => setActiveChapterIndex(ch.chapterIndex)}
                    className={`group relative text-left rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between bg-[#0b0f19] hover:bg-[#0d1322] ${
                      isCurrent
                        ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                        : prog.isFullyCompleted
                        ? 'border-emerald-500/40 hover:border-emerald-400'
                        : 'border-slate-800/90 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      {/* Top Chapter Tag & Stars */}
                      <div className="flex items-center justify-between mb-2 gap-1">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider"
                          style={{
                            backgroundColor: `${ch.themeHue}22`,
                            color: ch.themeHue,
                            border: `1px solid ${ch.themeHue}44`,
                          }}
                        >
                          CH {ch.chapterIndex.toString().padStart(3, '0')}
                        </span>

                        <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>{prog.totalStars}/30</span>
                        </div>
                      </div>

                      {/* Difficulty Tier Label */}
                      <div className="mb-1.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Chapter Title */}
                      <h3 className="font-display font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                        {ch.chapterName}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {ch.description}
                      </p>
                    </div>

                    {/* Progress Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-800/70">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                        <span>Stages {prog.startStage}–{prog.endStage}</span>
                        <span className={prog.isFullyCompleted ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                          {prog.completedCount}/10 ({prog.completionPercentage}%)
                        </span>
                      </div>

                      {/* Mini bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${prog.completionPercentage}%`,
                            backgroundColor: prog.isFullyCompleted ? '#10b981' : ch.themeHue,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View 2: 10 Stages of Selected Chapter */}
        {activeChapterIndex && selectedChapterInfo && selectedChapterProgress && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Chapter Header Banner */}
            <div className="px-4 py-3 sm:px-6 bg-[#080d17] border-b border-slate-800/80 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedChapterInfo.themeHue }}
                  />
                  <h3 className="font-display font-bold text-sm sm:text-base text-white">
                    Chapter {activeChapterIndex}: {selectedChapterInfo.chapterName}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    (Stages {selectedChapterProgress.startStage}–{selectedChapterProgress.endStage})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedChapterProgress.completedCount}/10 Stages Cleared · {selectedChapterProgress.totalStars}/30 Stars Earned
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-300 font-bold">
                  {selectedChapterProgress.completionPercentage}%
                </span>
                <div className="w-24 h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedChapterProgress.completionPercentage}%`,
                      backgroundColor: selectedChapterInfo.themeHue,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 10 Stages List Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => {
                const stageNum = selectedChapterProgress.startStage + i;
                const isUnlocked = progressionMgr.isStageUnlocked(stageNum);
                const isCompleted = progressionMgr.isStageCompleted(stageNum);
                const stars = progressionMgr.getStageStars(stageNum);
                const pattern = STAGE_PATTERN_LABELS[i];
                const isCurrent = currentStage === stageNum;
                const isBoss = i === 9;
                const tier = DifficultyManager.getTierForLevel(stageNum);
                const tierBadge = getTierBadgeStyle(tier);

                return (
                  <div
                    key={stageNum}
                    className={`relative rounded-xl p-3.5 border flex flex-col justify-between transition-all bg-[#0b0f19] ${
                      isCurrent
                        ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/20'
                        : isCompleted
                        ? 'border-emerald-500/40 bg-[#09111e]'
                        : isUnlocked
                        ? 'border-slate-800 hover:border-slate-600'
                        : 'border-slate-900/60 opacity-60 bg-[#07090e]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-white">
                          Stage {stageNum}
                        </span>

                        {isUnlocked ? (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 3 }).map((_, s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s < stars
                                    ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>

                      <div className="mb-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono border ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}>
                          {tier}
                        </span>
                      </div>

                      <div className={`font-semibold text-xs mb-1 line-clamp-1 ${isBoss ? 'text-amber-400 font-bold' : 'text-slate-200'}`}>
                        {pattern.title}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {pattern.desc}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-slate-800/70">
                      {isUnlocked ? (
                        <button
                          onClick={() => {
                            onSelectStage(stageNum);
                            onClose();
                          }}
                          className={`w-full py-1.5 px-2 rounded-lg font-mono font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isCurrent
                              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                              : isBoss
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold'
                              : 'bg-slate-900 border border-slate-700 hover:border-cyan-400 hover:text-white text-slate-300'
                          }`}
                        >
                          {isCurrent ? (
                            'Current Stage'
                          ) : (
                            <>
                              <span>Play {stageNum}</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="py-1 px-2 text-[10px] font-mono text-slate-500 text-center flex items-center justify-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Clear Stage {stageNum - 1}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
