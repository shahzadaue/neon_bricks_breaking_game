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
