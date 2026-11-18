/**
 * Global Top 10 Leaderboard Modal & Score Submission
 * Allows players to see live Firestore community rankings and submit their runs.
 */

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Flame,
  X,
  Send,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { LeaderboardEntry, LeaderboardService } from '../services/leaderboard-service';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  isLoading: boolean;
  currentRun?: {
    score: number;
    maxCombo: number;
    level: number;
    bricksCleared: number;
    mode: 'SOLO' | 'VS_2P';
  };
  onScoreSubmitted?: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  isLoading,
  currentRun,
  onScoreSubmitted,
}) => {
  const [playerName, setPlayerName] = useState<string>(() =>
    LeaderboardService.getSavedPlayerName() || 'NeonPilot'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHasSubmitted(false);
      setSubmittedRank(null);
      setErrorMessage(null);
    }
  }, [isOpen, currentRun?.score, currentRun?.level]);

  if (!isOpen) return null;

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRun || currentRun.score <= 0 || isSubmitting || hasSubmitted) return;

    const trimmed = playerName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter an arcade name (1-20 characters)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await LeaderboardService.submitScore({
        playerName: trimmed,
        score: currentRun.score,
        maxCombo: currentRun.maxCombo,
        levelReached: currentRun.level,
        bricksCleared: currentRun.bricksCleared,
        mode: currentRun.mode,
      });

      setHasSubmitted(true);
      const rank = entries.findIndex((entry) => currentRun.score >= entry.score) + 1;
      setSubmittedRank(rank > 0 && rank <= 10 ? rank : null);

      if (onScoreSubmitted) {
        onScoreSubmitted();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to submit score to Firestore. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-amber-500/30">
            <Crown className="w-4 h-4 fill-slate-950" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-slate-300/20">
            <Medal className="w-4 h-4 fill-slate-950" />
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-xs shadow-md shadow-amber-700/20">
            <Medal className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 font-mono text-xs font-bold">
            #{rank}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-[#090d16] border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-extrabold text-base sm:text-lg tracking-tight text-white">
                  GLOBAL TOP 10 COMMUNITY
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  FIRESTORE LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time synchronized rankings across all players worldwide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Submission Box for current game run */}
        {currentRun && currentRun.score > 0 && !hasSubmitted && (
          <div className="p-4 mx-4 mt-4 rounded-xl bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Submit Your Score to Global Leaderboard
              </span>
              <span className="font-mono-num font-extrabold text-white text-sm">
                {currentRun.score.toLocaleString()} PTS
              </span>
            </div>

            <form onSubmit={handleSubmitScore} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your arcade name..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-white text-xs font-semibold placeholder:text-slate-500"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-500">
                  {playerName.length}/20
                </span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !playerName.trim()}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Score</span>
                  </>
                )}
              </button>
            </form>
            {errorMessage && (
              <p className="mt-1.5 text-[11px] text-rose-400 font-mono">{errorMessage}</p>
            )}
          </div>
        )}

        {hasSubmitted && (
          <div className="p-3 mx-4 mt-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Score successfully registered in global Firestore!{' '}
              {submittedRank ? (
                <strong className="text-amber-400">Ranked #{submittedRank} in Top 10!</strong>
              ) : (
                'Great effort!'
              )}
            </span>
          </div>
        )}

        {/* Top 10 Scores List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
              <RotateCcw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
              <span>Fetching live Firestore records...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs text-center">
              <Trophy className="w-8 h-8 text-slate-600 mb-2" />
              <span className="font-bold text-slate-300">No community high scores yet!</span>
              <span className="text-slate-500 text-[11px] mt-0.5">
                Be the first legend to submit a score to the hall of fame.
              </span>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              const isP1 = rank === 1;
              return (
                <div
                  key={entry.id || idx}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isP1
                      ? 'bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/5 border-amber-500/40 shadow-md shadow-amber-500/10'
                      : rank <= 3
                      ? 'bg-slate-900/90 border-slate-700/80'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Rank & Player info */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {getRankBadge(rank)}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-[180px]">
                          {entry.playerName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase ${
                            entry.mode === 'VS_2P'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {entry.mode === 'VS_2P' ? '2P' : '1P'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono-num">
                        <span>STAGE {entry.levelReached}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-amber-400/90">
                          <Flame className="w-3 h-3 fill-amber-400/80" />
                          {entry.maxCombo}x COMBO
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score Display */}
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-mono-num font-extrabold text-sm sm:text-base tracking-tight ${
                        isP1
                          ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          : rank <= 3
                          ? 'text-cyan-300'
                          : 'text-slate-200'
                      }`}
                    >
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                      POINTS
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#070a12] flex items-center justify-between text-[11px] text-slate-400">
          <span>Total Top 10 Entries: {entries.length}/10</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
