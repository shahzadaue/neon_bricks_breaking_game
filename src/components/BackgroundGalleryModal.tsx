/**
 * Background Gallery Modal:
 * Interactive gallery for browsing and previewing all 400 premium backgrounds across 20 categories.
 * Supports Category Tabs, Live Canvas Previews, Search/Filter, Random Selection,
 * Apply Background, and Reset to Auto Level Sync.
 */

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
  X,
  Sparkles,
  Shuffle,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';
import {
  BackgroundEnvironment,
  BackgroundCategory,
  BACKGROUND_CATEGORIES,
  BACKGROUNDS_BY_CATEGORY,
  BACKGROUND_ENVIRONMENTS,
  searchBackgrounds,
} from '../game/background-data';
import { BackgroundManager, BackgroundSelectionMode } from '../game/background-manager';
import { BackgroundRenderer } from '../game/background-renderer';

interface BackgroundGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBackground: (bgId: string) => void;
  onResetAuto: () => void;
  currentBgId: string;
  currentMode: BackgroundSelectionMode;
}

/**
 * Individual Thumbnail Card with optimized canvas render
 */
const BackgroundThumbnailCard = memo(function BackgroundThumbnailCard({
  bg,
  isSelected,
  onSelect,
}: {
  bg: BackgroundEnvironment;
  isSelected: boolean;
  onSelect: (bg: BackgroundEnvironment) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      BackgroundRenderer.renderThumbnail(canvasRef.current, bg);
    }
  }, [bg]);

  return (
    <button
      onClick={() => onSelect(bg)}
      className={`group relative text-left rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-[#0b0f19] ${
        isSelected
          ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/20'
          : 'border-slate-800/90 hover:border-slate-600 hover:shadow-md'
      }`}
    >
      {/* Canvas preview */}
      <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={192}
          height={120}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Selected badge overlay */}
        {isSelected && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950 text-[10px] font-bold shadow-md">
            <Check className="w-3 h-3 stroke-[3]" />
            ACTIVE
          </div>
        )}

        {/* ID tag */}
        <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-cyan-300">
          {bg.backgroundId}
        </div>
      </div>

      {/* Info bar */}
      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1">
        <div className="font-semibold text-xs sm:text-sm text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
          {bg.backgroundName}
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>{bg.categoryName}</span>
          <span className="text-slate-500">Stage {bg.stageNumber}</span>
        </div>
      </div>
    </button>
  );
});

export function BackgroundGalleryModal({
  isOpen,
  onClose,
  onSelectBackground,
  onResetAuto,
  currentBgId,
  currentMode,
}: BackgroundGalleryModalProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>('CAT01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewBg, setPreviewBg] = useState<BackgroundEnvironment | null>(null);

  // Large preview canvas ref
  const largePreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Current category object
  const currentCategory = useMemo(() => {
    return BACKGROUND_CATEGORIES.find((c) => c.categoryId === selectedCatId) || BACKGROUND_CATEGORIES[0];
  }, [selectedCatId]);

  // Environments for current view (filtered by search or current category)
  const displayedBackgrounds = useMemo(() => {
    if (searchQuery.trim()) {
      return searchBackgrounds(searchQuery.trim());
    }
    return BACKGROUNDS_BY_CATEGORY.get(selectedCatId) || [];
  }, [searchQuery, selectedCatId]);

  // Set initial preview to current background
  useEffect(() => {
    if (isOpen) {
      const active = BACKGROUND_ENVIRONMENTS.find((b) => b.backgroundId === currentBgId) || BACKGROUND_ENVIRONMENTS[0];
      setPreviewBg(active);
      setSelectedCatId(active.categoryId);
    }
  }, [isOpen, currentBgId]);

  // Render large preview whenever previewBg changes
  useEffect(() => {
    if (previewBg && largePreviewRef.current) {
      BackgroundRenderer.renderThumbnail(largePreviewRef.current, previewBg);
    }
  }, [previewBg]);

  if (!isOpen) return null;

  const handleNextCategory = () => {
    const idx = BACKGROUND_CATEGORIES.findIndex((c) => c.categoryId === selectedCatId);
    const nextIdx = (idx + 1) % BACKGROUND_CATEGORIES.length;
    setSelectedCatId(BACKGROUND_CATEGORIES[nextIdx].categoryId);
    setSearchQuery('');
  };

  const handlePrevCategory = () => {
    const idx = BACKGROUND_CATEGORIES.findIndex((c) => c.categoryId === selectedCatId);
    const prevIdx = (idx - 1 + BACKGROUND_CATEGORIES.length) % BACKGROUND_CATEGORIES.length;
    setSelectedCatId(BACKGROUND_CATEGORIES[prevIdx].categoryId);
    setSearchQuery('');
  };

  const handleRandomSelect = () => {
    const mgr = BackgroundManager.getInstance();
    const picked = mgr.selectRandomBackground();
    setPreviewBg(picked);
    setSelectedCatId(picked.categoryId);
    setSearchQuery('');
    onSelectBackground(picked.backgroundId);
  };

  const handleApplyPreview = () => {
    if (previewBg) {
      onSelectBackground(previewBg.backgroundId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-[#0a0f1c]/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base sm:text-lg text-white tracking-tight">
                  Background Environments
                </h2>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-md">
                  400 Worlds · 40 Chapters
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                High-contrast procedural atmospheres engineered for optimal brick and ball legibility.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomSelect}
              title="Pick Random Background from 400"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Random (1 of 400)</span>
            </button>

            <button
              onClick={onResetAuto}
              title="Sync background automatically with stage level (Level 1-20 -> Cat 1, etc.)"
              className={`px-2.5 py-1.5 rounded-lg border transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer ${
                currentMode === 'auto'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto Level Sync</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close Background Gallery"
              className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-4 py-2.5 sm:px-6 bg-[#070b14] border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search 400 environments (e.g. Neon, Sakura, BG042)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Step Nav buttons */}
          {!searchQuery && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs font-mono">
              <button
                onClick={handlePrevCategory}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev Category</span>
              </button>
              <span className="text-slate-400 text-center font-semibold">
                {currentCategory.categoryId}: {currentCategory.name}
              </span>
              <button
                onClick={handleNextCategory}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <span className="hidden sm:inline">Next Category</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Category Horizontal Scroll Tab Bar (20 Categories) */}
        {!searchQuery && (
          <div className="px-4 py-2 sm:px-6 bg-[#080d17] border-b border-slate-800/70 overflow-x-auto scrollbar-none flex items-center gap-1.5">
            {BACKGROUND_CATEGORIES.map((cat) => {
              const isActive = cat.categoryId === selectedCatId;
              return (
                <button
                  key={cat.categoryId}
                  onClick={() => setSelectedCatId(cat.categoryId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.themeHue }}
                  />
                  <span>{cat.categoryIndex}. {cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Content Area: Grid + Preview Drawer */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Grid of Background Cards */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono">
              <span>
                {searchQuery
                  ? `Found ${displayedBackgrounds.length} matching environments`
                  : `${currentCategory.name} (Levels ${currentCategory.startLevel}–${currentCategory.endLevel})`}
              </span>
              <span>Showing {displayedBackgrounds.length} environments</span>
            </div>

            {displayedBackgrounds.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-mono text-sm border border-dashed border-slate-800 rounded-xl">
                No background found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {displayedBackgrounds.map((bg) => (
                  <BackgroundThumbnailCard
                    key={bg.backgroundId}
                    bg={bg}
                    isSelected={bg.backgroundId === currentBgId}
                    onSelect={(selected) => setPreviewBg(selected)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Col: Focused Preview Inspector & Apply Controls */}
          {previewBg && (
            <div className="lg:col-span-1 bg-[#0b0f19] border border-slate-800 rounded-xl p-4 flex flex-col justify-between self-start sticky top-0 shadow-lg">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    Environment Inspector
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {previewBg.backgroundId}
                  </span>
                </div>

                {/* Large Preview Canvas */}
                <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-800 bg-black mb-3">
                  <canvas
                    ref={largePreviewRef}
                    width={320}
                    height={240}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="font-display font-bold text-base text-white">
                  {previewBg.backgroundName}
                </h3>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  {previewBg.atmosphereDescription}
                </p>

                {/* Environment Attributes */}
                <div className="space-y-1.5 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="text-slate-200">{previewBg.categoryName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Celestial:</span>
                    <span className="text-slate-300">{previewBg.renderConfig.celestial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Silhouette:</span>
                    <span className="text-slate-300">{previewBg.renderConfig.silhouette}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Particles:</span>
                    <span className="text-slate-300">{previewBg.renderConfig.particleStyle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contrast Safe:</span>
                    <span className="text-emerald-400 font-semibold">100% Guaranteed</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                <button
                  onClick={handleApplyPreview}
                  disabled={previewBg.backgroundId === currentBgId && currentMode === 'manual'}
                  className={`w-full py-2.5 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    previewBg.backgroundId === currentBgId && currentMode === 'manual'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 active:scale-[0.98]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {previewBg.backgroundId === currentBgId && currentMode === 'manual'
                    ? 'Currently Applied'
                    : `Apply ${previewBg.backgroundId}`}
                </button>

                <p className="text-[10px] text-slate-500 text-center font-mono">
                  Applying locks this background manually across all stages until Auto Sync is enabled.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
