import { Brick, BrickType } from './types';
import { DifficultyManager, DifficultyProfile, DifficultyTier } from './difficulty-manager';
import { BossManager } from './boss-manager';

/**
 * Deterministic 32-bit Mulberry32 Pseudo-Random Number Generator.
 * Guarantees identical output across all browsers, runtimes, and devices.
 */
export class SeededRandom {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /**
   * Return a pseudo-random float in [0, 1)
   */
  public next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Return float in [min, max)
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Return integer in [min, max] inclusive
   */
  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Pick random element from an array
   */
  public choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Return boolean with specified probability
   */
  public chance(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

export interface ChapterInfo {
  chapterIndex: number;
  chapterName: string;
  themeHue: string;
  themeGlow: string;
  description: string;
}

export interface LevelData {
  levelNumber: number;
  chapter: ChapterInfo;
  title: string;
  bricks: Brick[];
  cols: number;
  rows: number;
  destructibleCount: number;
  totalPoints: number;
  recommendedSpeedMultiplier: number;
  difficultyRating: DifficultyTier;
  difficultyProfile: DifficultyProfile;
}

export type LayoutArchetype =
  | 'CLASSIC_PYRAMID'
  | 'HORIZONTAL_MIRROR'
  | 'CHECKERBOARD'
  | 'STRIPES_TIER'
  | 'FORTRESS_CORE'
  | 'DIAMOND_SHRINE'
  | 'CHEVRON_WAVE'
  | 'TWIN_PILLARS'
  | 'INVADER_GRID'
  | 'LABYRINTH_GATE'
  | 'HOURGLASS'
  | 'DOUBLE_CROSS'
  | 'ZIGZAG_MAZE'
  | 'SHIELDED_HEX'
  | 'TITAN_WALL'
  | 'CHAOS_GALAXY'
  | 'VORTEX_RING';

export class LevelGenerator {
  /**
   * 100 Thematic Chapters covering all 1000 levels (10 levels each):
   * - Chapters 1-25 (1-250): Easy
   * - Chapters 26-50 (251-500): Ordinary
   * - Chapters 51-75 (501-750): Hard
   * - Chapters 76-100 (751-1000): Extraordinary Hard
   */
  public static readonly CHAPTERS: ChapterInfo[] = [
    // 1-10 Space & Cosmos (Easy)
    { chapterIndex: 1, chapterName: 'Galaxy Nebula', themeHue: '#06b6d4', themeGlow: 'rgba(6, 182, 212, 0.45)', description: 'Interstellar gas corridors and introductory pulse barriers.' },
    { chapterIndex: 2, chapterName: 'Planet Saturn', themeHue: '#eab308', themeGlow: 'rgba(234, 179, 8, 0.45)', description: 'Golden ring arcs and rotating gravitational clusters.' },
    { chapterIndex: 3, chapterName: 'Moon Base', themeHue: '#94a3b8', themeGlow: 'rgba(148, 163, 184, 0.45)', description: 'Lunar dome outposts with titanium reinforced defenses.' },
    { chapterIndex: 4, chapterName: 'Mars Surface', themeHue: '#ef4444', themeGlow: 'rgba(239, 68, 68, 0.45)', description: 'Crimson canyon barriers and aggressive multi-hit grids.' },
    { chapterIndex: 5, chapterName: 'Black Hole', themeHue: '#8b5cf6', themeGlow: 'rgba(139, 92, 246, 0.45)', description: 'Gravitational singularity clusters with rapid velocity channels.' },
    { chapterIndex: 6, chapterName: 'Starfield', themeHue: '#38bdf8', themeGlow: 'rgba(56, 189, 248, 0.45)', description: 'Dense cosmic star corridors with high-altitude deflection grids.' },
    { chapterIndex: 7, chapterName: 'Alien Planet', themeHue: '#a855f7', themeGlow: 'rgba(168, 85, 247, 0.45)', description: 'Exotic purple crystal spires and shifting bio-plates.' },
    { chapterIndex: 8, chapterName: 'Space Station', themeHue: '#0ea5e9', themeGlow: 'rgba(14, 165, 233, 0.45)', description: 'Orbital titanium bulkheads and solar panel shielding.' },
    { chapterIndex: 9, chapterName: 'Meteor Shower', themeHue: '#f97316', themeGlow: 'rgba(249, 115, 22, 0.45)', description: 'High-speed flaming obstacles and explosive impact formations.' },
    { chapterIndex: 10, chapterName: 'Cosmic Portal', themeHue: '#d946ef', themeGlow: 'rgba(217, 70, 239, 0.45)', description: 'Dimension warp gateways with apex chapter guardian.' },

    // 11-20 Oceanic & Underwater (Easy)
    { chapterIndex: 11, chapterName: 'Coral Reef', themeHue: '#14b8a6', themeGlow: 'rgba(20, 184, 166, 0.45)', description: 'Bioluminescent reef shelves and organic coral columns.' },
    { chapterIndex: 12, chapterName: 'Deep Ocean', themeHue: '#0284c7', themeGlow: 'rgba(2, 132, 199, 0.45)', description: 'Midnight bathypelagic trenches and heavy water pressure.' },
    { chapterIndex: 13, chapterName: 'Atlantis City', themeHue: '#06b6d4', themeGlow: 'rgba(6, 182, 212, 0.45)', description: 'Sunken marble temples with ancient orichalcum technology.' },
    { chapterIndex: 14, chapterName: 'Shark Kingdom', themeHue: '#0f766e', themeGlow: 'rgba(15, 118, 110, 0.45)', description: 'Apex predator canyons with sharp hydrodynamic barriers.' },
    { chapterIndex: 15, chapterName: 'Sunken Ship', themeHue: '#475569', themeGlow: 'rgba(71, 85, 105, 0.45)', description: 'Galleon timber hulls and spectral sunken treasure barriers.' },
    { chapterIndex: 16, chapterName: 'Jellyfish Cave', themeHue: '#ec4899', themeGlow: 'rgba(236, 72, 153, 0.45)', description: 'Phosphorescent tentacles and glowing deep-sea grottos.' },
    { chapterIndex: 17, chapterName: 'Pearl Palace', themeHue: '#fbcfe8', themeGlow: 'rgba(251, 207, 232, 0.45)', description: 'Iridescent shell formations and crystalline royal gates.' },
    { chapterIndex: 18, chapterName: 'Underwater Volcano', themeHue: '#ea580c', themeGlow: 'rgba(234, 88, 12, 0.45)', description: 'Subsea hydrothermal vents and glowing magma crusts.' },
    { chapterIndex: 19, chapterName: 'Ocean Trench', themeHue: '#1e1b4b', themeGlow: 'rgba(30, 27, 75, 0.55)', description: 'Mariana abyss with impenetrable benthic bedrock.' },
    { chapterIndex: 20, chapterName: 'Crystal Lagoon', themeHue: '#22d3ee', themeGlow: 'rgba(34, 211, 238, 0.45)', description: 'Prismatic turquoise shoals with refracting sunlight beams.' },

    // 21-25 Fantasy Realms (Easy)
    { chapterIndex: 21, chapterName: 'Enchanted Forest', themeHue: '#10b981', themeGlow: 'rgba(16, 185, 129, 0.45)', description: 'Elder willow groves and mystical spore tree barriers.' },
    { chapterIndex: 22, chapterName: 'Dragon Valley', themeHue: '#dc2626', themeGlow: 'rgba(220, 38, 38, 0.45)', description: 'Volcanic wyrm roosts and scorched obsidian battlements.' },
    { chapterIndex: 23, chapterName: 'Crystal Mountains', themeHue: '#a7f3d0', themeGlow: 'rgba(167, 243, 208, 0.45)', description: 'Glittering quartz pinnacles and geometric crystal plates.' },
    { chapterIndex: 24, chapterName: 'Fairy Kingdom', themeHue: '#f472b6', themeGlow: 'rgba(244, 114, 182, 0.45)', description: 'Bioluminescent glades and dancing fairy dust corridors.' },
    { chapterIndex: 25, chapterName: 'Magic Castle', themeHue: '#8b5cf6', themeGlow: 'rgba(139, 92, 246, 0.45)', description: 'Floating arcane towers and runic forcefield gates.' },

    // 26-50 Ordinary Realms
    { chapterIndex: 26, chapterName: 'Lava Kingdom', themeHue: '#f97316', themeGlow: 'rgba(249, 115, 22, 0.45)', description: 'Crater magma lakes and explosive cinder formations.' },
    { chapterIndex: 27, chapterName: 'Ice Palace', themeHue: '#38bdf8', themeGlow: 'rgba(56, 189, 248, 0.45)', description: 'Permafrost spires and crystalline subzero barriers.' },
    { chapterIndex: 28, chapterName: 'Jungle Temple', themeHue: '#65a30d', themeGlow: 'rgba(101, 163, 13, 0.45)', description: 'Overgrown stepped pyramids and vine-covered monoliths.' },
    { chapterIndex: 29, chapterName: 'Waterfall Paradise', themeHue: '#0284c7', themeGlow: 'rgba(2, 132, 199, 0.45)', description: 'Misty river gorge rapids and emerald plunge pools.' },
    { chapterIndex: 30, chapterName: 'Rainbow Valley', themeHue: '#c084fc', themeGlow: 'rgba(192, 132, 252, 0.45)', description: 'Prismatic spectrum fields with harmonic multi-hue waves.' },
    { chapterIndex: 31, chapterName: 'Cyberpunk City', themeHue: '#06b6d4', themeGlow: 'rgba(6, 182, 212, 0.45)', description: 'Neon skyscraper canyons and holographic expressway grids.' },
    { chapterIndex: 32, chapterName: 'Neon Arcade', themeHue: '#f59e0b', themeGlow: 'rgba(245, 158, 11, 0.45)', description: 'Coin-op pixel cabinets and retro CRT vector barriers.' },
    { chapterIndex: 33, chapterName: 'Robot Factory', themeHue: '#d97706', themeGlow: 'rgba(217, 119, 6, 0.45)', description: 'Steam piston corridors and automated assembly defenses.' },
    { chapterIndex: 34, chapterName: 'Digital Matrix', themeHue: '#22c55e', themeGlow: 'rgba(34, 197, 94, 0.45)', description: 'Cascading green code streams and binary mainframe gates.' },
    { chapterIndex: 35, chapterName: 'Hologram World', themeHue: '#38bdf8', themeGlow: 'rgba(56, 189, 248, 0.45)', description: 'Hard-light holographic citadels and wireframe grids.' },
    { chapterIndex: 36, chapterName: 'Desert Pyramid', themeHue: '#eab308', themeGlow: 'rgba(234, 179, 8, 0.45)', description: 'Golden sand dunes and sun god obelisk sentinels.' },
    { chapterIndex: 37, chapterName: 'Ancient Egypt', themeHue: '#f59e0b', themeGlow: 'rgba(245, 158, 11, 0.45)', description: 'Hieroglyphic chambers and sacred pharaoh tomb portals.' },
    { chapterIndex: 38, chapterName: 'Haunted Mansion', themeHue: '#64748b', themeGlow: 'rgba(100, 116, 139, 0.45)', description: 'Gothic stone battlements and ethereal spectral walls.' },
    { chapterIndex: 39, chapterName: 'Candy Wonderland', themeHue: '#ec4899', themeGlow: 'rgba(236, 72, 153, 0.45)', description: 'Sugar crystal peaks and sweet gumdrop labyrinth barriers.' },
    { chapterIndex: 40, chapterName: 'Golden Treasure Kingdom', themeHue: '#facc15', themeGlow: 'rgba(250, 204, 21, 0.55)', description: 'Gilded sovereign fortresses and midas gold defenses.' },
    { chapterIndex: 41, chapterName: 'Cloud Citadel', themeHue: '#38bdf8', themeGlow: 'rgba(56, 189, 248, 0.45)', description: 'High-altitude sky temples anchored above rolling cumulus banks.' },
    { chapterIndex: 42, chapterName: 'Clockwork Sky', themeHue: '#d97706', themeGlow: 'rgba(217, 119, 6, 0.45)', description: 'Brass gear towers and synchronized steampunk pendulums.' },
    { chapterIndex: 43, chapterName: 'Emerald Canyon', themeHue: '#10b981', themeGlow: 'rgba(16, 185, 129, 0.45)', description: 'Jade cliffside formations and wind-carved mineral gates.' },
    { chapterIndex: 44, chapterName: 'Solar Observatory', themeHue: '#fbbf24', themeGlow: 'rgba(251, 191, 36, 0.45)', description: 'Heliocentric lens arrays focusing radiant sunbeams.' },
    { chapterIndex: 45, chapterName: 'Bamboo Sanctuary', themeHue: '#84cc16', themeGlow: 'rgba(132, 204, 22, 0.45)', description: 'Serene jade forest terraces and balanced timber walls.' },
    { chapterIndex: 46, chapterName: 'Aurora Borealis', themeHue: '#2dd4bf', themeGlow: 'rgba(45, 212, 191, 0.45)', description: 'Polar geomagnetic ribbons illuminating glacial ridges.' },
    { chapterIndex: 47, chapterName: 'Starlight Harbor', themeHue: '#60a5fa', themeGlow: 'rgba(96, 165, 250, 0.45)', description: 'Astral dockyards moored with luminous celestial vessels.' },
    { chapterIndex: 48, chapterName: 'Obsidian Cavern', themeHue: '#a855f7', themeGlow: 'rgba(168, 85, 247, 0.45)', description: 'Volcanic glass chambers echoing with crystalline resonance.' },
    { chapterIndex: 49, chapterName: 'Mystic Ruins', themeHue: '#c084fc', themeGlow: 'rgba(192, 132, 252, 0.45)', description: 'Runic monoliths suspended over forgotten astral arches.' },
    { chapterIndex: 50, chapterName: 'Meteor Forge', themeHue: '#f97316', themeGlow: 'rgba(249, 115, 22, 0.45)', description: 'Molten star-iron anvils tempering ordinary tier champions.' },

    // 51-75 Hard Realms
    { chapterIndex: 51, chapterName: 'Plasma Reactor', themeHue: '#06b6d4', themeGlow: 'rgba(6, 182, 212, 0.5)', description: 'High-voltage containment rings pulsing with ionized plasma.' },
    { chapterIndex: 52, chapterName: 'Cyber Gridlock', themeHue: '#3b82f6', themeGlow: 'rgba(59, 130, 246, 0.5)', description: 'Encrypted firewall sectors guarded by kinetic defense drones.' },
    { chapterIndex: 53, chapterName: 'Magma Core', themeHue: '#ea580c', themeGlow: 'rgba(234, 88, 12, 0.5)', description: 'Subterranean mantle chambers overflowing with liquid basalt.' },
    { chapterIndex: 54, chapterName: 'Abyssal Rift', themeHue: '#4f46e5', themeGlow: 'rgba(79, 70, 229, 0.5)', description: 'Tectonic sea-floor chasms crackling with dark energy.' },
    { chapterIndex: 55, chapterName: 'Storm Tempest', themeHue: '#0ea5e9', themeGlow: 'rgba(14, 165, 233, 0.5)', description: 'Supercell thunderheads hurling high-velocity deflections.' },
    { chapterIndex: 56, chapterName: 'Quantum Labyrinth', themeHue: '#8b5cf6', themeGlow: 'rgba(139, 92, 246, 0.5)', description: 'Phase-shifted corridors that punish imprecise ricochets.' },
    { chapterIndex: 57, chapterName: 'Titanium Bastion', themeHue: '#94a3b8', themeGlow: 'rgba(148, 163, 184, 0.5)', description: 'Dense alloy bulwarks engineered to withstand relentless impacts.' },
    { chapterIndex: 58, chapterName: 'Crimson Nebula', themeHue: '#e11d48', themeGlow: 'rgba(225, 29, 72, 0.5)', description: 'Blood-red stellar nurseries swarming with armored clusters.' },
    { chapterIndex: 59, chapterName: 'Frostbite Spire', themeHue: '#67e8f9', themeGlow: 'rgba(103, 232, 249, 0.5)', description: 'Razor-sharp cryo towers locked inside arctic blizzards.' },
    { chapterIndex: 60, chapterName: 'Venom Jungle', themeHue: '#22c55e', themeGlow: 'rgba(34, 197, 94, 0.5)', description: 'Toxic spore canopies concealing volatile explosive traps.' },
    { chapterIndex: 61, chapterName: 'Phantom Shipyard', themeHue: '#6366f1', themeGlow: 'rgba(99, 102, 241, 0.5)', description: 'Spectral dreadnought hulls patrolling misty void waters.' },
    { chapterIndex: 62, chapterName: 'Neon Overdrive', themeHue: '#ec4899', themeGlow: 'rgba(236, 72, 153, 0.5)', description: 'Hyper-accelerated synthwave highways at maximum voltage.' },
    { chapterIndex: 63, chapterName: 'Gravity Well', themeHue: '#7c3aed', themeGlow: 'rgba(124, 58, 237, 0.5)', description: 'Dense orbital sinks bending trajectories around steel cores.' },
    { chapterIndex: 64, chapterName: 'Eclipse Temple', themeHue: '#f59e0b', themeGlow: 'rgba(245, 158, 11, 0.5)', description: 'Sun-blotted obsidian altars shielded by golden monoliths.' },
    { chapterIndex: 65, chapterName: 'Inferno Foundry', themeHue: '#dc2626', themeGlow: 'rgba(220, 38, 38, 0.5)', description: 'Blazing blast furnaces forging heavy multi-hit armaments.' },
    { chapterIndex: 66, chapterName: 'Glacier Fortress', themeHue: '#38bdf8', themeGlow: 'rgba(56, 189, 248, 0.5)', description: 'Fortified ice citadels flanked by impenetrable bergs.' },
    { chapterIndex: 67, chapterName: 'Volt Citadel', themeHue: '#facc15', themeGlow: 'rgba(250, 204, 21, 0.5)', description: 'Arc-lightning battlements discharging rapid energy arcs.' },
    { chapterIndex: 68, chapterName: 'Shadow Corridor', themeHue: '#64748b', themeGlow: 'rgba(100, 116, 139, 0.5)', description: 'Darkened stealth tunnels packed with tactical barriers.' },
    { chapterIndex: 69, chapterName: 'Chrono Vault', themeHue: '#14b8a6', themeGlow: 'rgba(20, 184, 166, 0.5)', description: 'Temporal lockboxes guarded by shifting armored matrices.' },
    { chapterIndex: 70, chapterName: 'Hyper Tunnel', themeHue: '#06b6d4', themeGlow: 'rgba(6, 182, 212, 0.5)', description: 'Subspace acceleration tubes pushing reflexes to the brink.' },
    { chapterIndex: 71, chapterName: 'Dread Trench', themeHue: '#1d4ed8', themeGlow: 'rgba(29, 78, 216, 0.5)', description: 'Crushing abyssal depths reinforced with benthic armor.' },
    { chapterIndex: 72, chapterName: 'Reactor Nine', themeHue: '#84cc16', themeGlow: 'rgba(132, 204, 22, 0.5)', description: 'Unstable isotope chambers lined with chain-blast cells.' },
    { chapterIndex: 73, chapterName: 'Comet Wasteland', themeHue: '#fb923c', themeGlow: 'rgba(251, 146, 60, 0.5)', description: 'Shattered ice-and-iron debris fields hurtling through space.' },
    { chapterIndex: 74, chapterName: 'Sentinel Tower', themeHue: '#f43f5e', themeGlow: 'rgba(244, 63, 94, 0.5)', description: 'Automated orbital watchtowers locked in synchronized defense.' },
    { chapterIndex: 75, chapterName: 'Iron Colossus', themeHue: '#cbd5e1', themeGlow: 'rgba(203, 213, 225, 0.5)', description: 'Titan-scale armored dreadnought sealing the Hard frontier.' },

    // 76-100 Extraordinary Hard Realms
    { chapterIndex: 76, chapterName: 'Singularity Abyss', themeHue: '#a855f7', themeGlow: 'rgba(168, 85, 247, 0.6)', description: 'Event-horizon gauntlet where only razor precision survives.' },
    { chapterIndex: 77, chapterName: 'Dark Matter Core', themeHue: '#6366f1', themeGlow: 'rgba(99, 102, 241, 0.6)', description: 'Invisible-mass shields wrapped in ultra-dense 4-HP armor.' },
    { chapterIndex: 78, chapterName: 'Supernova Rift', themeHue: '#f97316', themeGlow: 'rgba(249, 115, 22, 0.6)', description: 'Collapsing stellar shockwaves packed with volatile mines.' },
    { chapterIndex: 79, chapterName: 'Omega Firewall', themeHue: '#ef4444', themeGlow: 'rgba(239, 68, 68, 0.6)', description: 'Military-grade crimson security grids at maximum velocity.' },
    { chapterIndex: 80, chapterName: 'Celestial Throne', themeHue: '#facc15', themeGlow: 'rgba(250, 204, 21, 0.6)', description: 'Gilded astral sanctum protected by immortal sky sentinels.' },
    { chapterIndex: 81, chapterName: 'Void Sovereign', themeHue: '#8b5cf6', themeGlow: 'rgba(139, 92, 246, 0.6)', description: 'Ruling abyssal strongholds with relentless moving shields.' },
    { chapterIndex: 82, chapterName: 'Hypernova Crucible', themeHue: '#fb7185', themeGlow: 'rgba(251, 113, 133, 0.6)', description: 'White-hot plasma cauldrons demanding flawless multi-ball control.' },
    { chapterIndex: 83, chapterName: 'Astral Cataclysm', themeHue: '#06b6d4', themeGlow: 'rgba(6, 182, 212, 0.6)', description: 'Shattered starlight citadels drifting in chaotic formation.' },
    { chapterIndex: 84, chapterName: 'Quantum Apex', themeHue: '#22d3ee', themeGlow: 'rgba(34, 211, 238, 0.6)', description: 'High-speed harmonic lattices with minimal margin for error.' },
    { chapterIndex: 85, chapterName: 'Titan Pantheon', themeHue: '#f59e0b', themeGlow: 'rgba(245, 158, 11, 0.6)', description: 'Colossal multi-hit monuments built for grandmasters.' },
    { chapterIndex: 86, chapterName: 'Chaos Nexus', themeHue: '#d946ef', themeGlow: 'rgba(217, 70, 239, 0.6)', description: 'Converging dimensional storms surging with kinetic shields.' },
    { chapterIndex: 87, chapterName: 'Infinity Spire', themeHue: '#38bdf8', themeGlow: 'rgba(56, 189, 248, 0.6)', description: 'Endless vertical bastions stretching across the upper arena.' },
    { chapterIndex: 88, chapterName: 'Doom Reactor', themeHue: '#dc2626', themeGlow: 'rgba(220, 38, 38, 0.6)', description: 'Critical fusion chambers laced with chain-reaction cores.' },
    { chapterIndex: 89, chapterName: 'Star Destroyer', themeHue: '#94a3b8', themeGlow: 'rgba(148, 163, 184, 0.6)', description: 'Dreadnought fleet superstructures with titanium bulkheads.' },
    { chapterIndex: 90, chapterName: 'Oblivion Gate', themeHue: '#7c3aed', themeGlow: 'rgba(124, 58, 237, 0.6)', description: 'Threshold of the void guarded by relentless twin cannons.' },
    { chapterIndex: 91, chapterName: 'Antimatter Forge', themeHue: '#ec4899', themeGlow: 'rgba(236, 72, 153, 0.6)', description: 'Volatile positron matrices shimmering with lethal brilliance.' },
    { chapterIndex: 92, chapterName: 'Eternal Eclipse', themeHue: '#fbbf24', themeGlow: 'rgba(251, 191, 36, 0.6)', description: 'Perpetual corona shadows shielding 4-HP obsidian walls.' },
    { chapterIndex: 93, chapterName: 'Genesis Zero', themeHue: '#10b981', themeGlow: 'rgba(16, 185, 129, 0.6)', description: 'Primeval source code reborn at extraordinary velocity.' },
    { chapterIndex: 94, chapterName: 'Apex Overlord', themeHue: '#f43f5e', themeGlow: 'rgba(244, 63, 94, 0.6)', description: 'Supreme tactical war-grids forged for elite reflex masters.' },
    { chapterIndex: 95, chapterName: 'Paradox Matrix', themeHue: '#22c55e', themeGlow: 'rgba(34, 197, 94, 0.6)', description: 'Self-interlocking binary mazes with razor-thin deflection angles.' },
    { chapterIndex: 96, chapterName: 'Valkyrie Vault', themeHue: '#60a5fa', themeGlow: 'rgba(96, 165, 250, 0.6)', description: 'Armored celestial armory defended by rapid-patrol wings.' },
    { chapterIndex: 97, chapterName: 'Nemesis Core', themeHue: '#ef4444', themeGlow: 'rgba(239, 68, 68, 0.6)', description: 'Relentless AI defense core operating at hyper-speed.' },
    { chapterIndex: 98, chapterName: 'Cosmic Judgment', themeHue: '#c084fc', themeGlow: 'rgba(192, 132, 252, 0.6)', description: 'Final trial of stars combining every hazard and armor class.' },
    { chapterIndex: 99, chapterName: 'Transcendence Realm', themeHue: '#2dd4bf', themeGlow: 'rgba(45, 212, 191, 0.6)', description: 'Luminous ascent before the 1000th-stage sovereign.' },
    { chapterIndex: 100, chapterName: 'Final Millennium', themeHue: '#facc15', themeGlow: 'rgba(250, 204, 21, 0.7)', description: 'The 1000th stage pinnacle: ultimate test of mastery.' },
  ];

  /**
   * Title descriptors for generating thematic stage names
   */
  private static readonly TITLE_NOUNS = [
    'Pulse', 'Vector', 'Bastion', 'Nexus', 'Horizon',
    'Circuit', 'Prism', 'Beacon', 'Matrix', 'Zenith',
    'Vanguard', 'Sanctum', 'Spire', 'Fortress', 'Eclipse',
    'Catalyst', 'Monolith', 'Apex', 'Core', 'Cascade',
    'Pinnacle', 'Citadel', 'Singularity', 'Tempest', 'Dominion'
  ];

  /**
   * Retrieve chapter configuration for a given level (1-1000)
   */
  public static getChapterForLevel(levelNumber: number): ChapterInfo {
    const clamped = Math.max(1, Math.min(1000, Math.floor(levelNumber)));
    const chapterIdx = Math.floor((clamped - 1) / 10);
    return this.CHAPTERS[Math.min(chapterIdx, this.CHAPTERS.length - 1)] || this.CHAPTERS[0];
  }

  /**
   * Generate 100% deterministic level configuration
   * @param levelNumber Level number (1 to 1000)
   * @param arenaWidth Arena logical width (default 600)
   * @param arenaHeight Arena logical height (default 800)
   */
  public static generateLevel(
    levelNumber: number,
    arenaWidth: number = 600,
    arenaHeight: number = 800
  ): LevelData {
    // Clamped level in [1, 1000]
    const lvl = Math.max(1, Math.min(1000, Math.floor(levelNumber)));

    // Salted seed guarantees deterministic repeatability
    const seed = (lvl * 15485863) ^ 0x5bd1e995;
    const rng = new SeededRandom(seed);

    // Chapter metadata & Stage pattern within chapter (1 to 10)
    const chapter = this.getChapterForLevel(lvl);
    const stageInChapter = ((lvl - 1) % 10) + 1;

    // Check if this level is a Boss Stage (every 10 levels, stage 10 of each chapter)
    if (BossManager.isBossLevel(lvl)) {
      const { bricks: bossBricks, config } = BossManager.generateBossBricks(lvl, arenaWidth, chapter.themeHue);
      const totalPoints = bossBricks.reduce((acc, b) => acc + b.points, 0) + 15000 + lvl * 50;
      const difficulty = DifficultyManager.getDifficultyForLevel(lvl);
      return {
        levelNumber: lvl,
        chapter,
        title: `Level ${lvl}: ⚔️ BOSS - ${config.name}`,
        bricks: bossBricks,
        cols: 10,
        rows: 12,
        destructibleCount: bossBricks.filter((b) => b.isDestructible).length,
        totalPoints,
        recommendedSpeedMultiplier: difficulty.ballSpeedMultiplier * 1.05,
        difficultyRating: difficulty.difficultyRating,
        difficultyProfile: difficulty,
      };
    }

    // Standard Stage Title generation
    const STAGE_PATTERN_LABELS = [
      'Genesis Formation',
      'Multicolor Spectrum',
      'Kinetic Drift',
      'Armored Bastion',
      'Explosive Core',
      'Hazard Descent',
      'Precision Gate',
      'Multi-Ball Frenzy',
      'Labyrinth Maze',
      'Apex Boss Titan',
    ];
    const patternLabel = STAGE_PATTERN_LABELS[stageInChapter - 1] || 'Sector';
    const noun = this.TITLE_NOUNS[(lvl - 1) % this.TITLE_NOUNS.length];
    const title = `Level ${lvl}: ${chapter.chapterName} · ${patternLabel} (${noun})`;

    // Grid Dimensions scaled with progression
    // Cols: 10 standard, 11 on higher difficulty chapters (level 60+)
    let cols = 10;
    if (lvl > 60) {
      cols = rng.chance(0.5) ? 11 : 10;
    }

    // Rows: 15 to 18 rows across all stages to guarantee bricks occupy MORE THAN HALF the 800px canvas!
    // 15 rows: 48 + 15 * 24 = 408px (> 51% of canvas)
    // 18 rows: 48 + 18 * 24 = 480px (60% of canvas)
    const minRows = Math.min(15 + Math.floor(lvl / 35), 17);
    const maxRows = Math.min(16 + Math.floor(lvl / 25), 18);
    const rows = rng.rangeInt(minRows, maxRows);

    // Brick layout geometry - precisely engineered to span > half the 800px arena
    const sidePadding = 18;
    const topOffset = 48;
    const brickMargin = 6;
    const availableWidth = arenaWidth - sidePadding * 2;
    const brickWidth = (availableWidth - (cols - 1) * brickMargin) / cols;
    const brickHeight = 18;

    // Archetype selection (17 archetypes cycling deterministically)
    const archetypes: LayoutArchetype[] = [
      'CLASSIC_PYRAMID',
      'HORIZONTAL_MIRROR',
      'CHECKERBOARD',
      'STRIPES_TIER',
      'FORTRESS_CORE',
      'DIAMOND_SHRINE',
      'CHEVRON_WAVE',
      'TWIN_PILLARS',
      'INVADER_GRID',
      'LABYRINTH_GATE',
      'HOURGLASS',
      'DOUBLE_CROSS',
      'ZIGZAG_MAZE',
      'SHIELDED_HEX',
      'TITAN_WALL',
      'CHAOS_GALAXY',
      'VORTEX_RING',
    ];
    const archetype = archetypes[(lvl - 1) % archetypes.length];

    // Retrieve progressive difficulty profile from DifficultyManager
    const difficulty = DifficultyManager.getDifficultyForLevel(lvl);
    const strongRatio = difficulty.strongRatio;
    const armoredRatio = difficulty.armoredRatio;
    const hasUnbreakable = difficulty.unbreakableChance > 0 && rng.chance(difficulty.unbreakableChance);

    const bricks: Brick[] = [];
    let idCounter = 0;
    let totalPoints = 0;

    // Build raw grid matrix: 0 = empty, 1 = standard, 2 = strong, 3 = armored, 9 = unbreakable
    const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

    this.populateGridArchetype(grid, rows, cols, archetype, rng);

    // Safeguard: Ensure at least 2 clear vertical channels never blocked by unbreakable bricks
    const unbreakableBlockedCols = new Set<number>();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0) continue;

        const roll = rng.next();
        let hp = 1;
        let type: BrickType = 'standard';
        let color = chapter.themeHue;
        let glowColor = chapter.themeGlow;
        let points = 100;
        let isDestructible = true;

        // Unbreakable brick assignment
        if (hasUnbreakable && grid[r][c] === 9) {
          // Keep side edges and at least 2 central paths free
          if (c > 0 && c < cols - 1 && unbreakableBlockedCols.size < cols - 3) {
            type = 'unbreakable';
            hp = 999;
            points = 0;
            color = '#475569';
            glowColor = 'rgba(148, 163, 184, 0.2)';
            isDestructible = false;
            unbreakableBlockedCols.add(c);
          } else {
            // Revert to heavy armored
            grid[r][c] = 3;
          }
        }

        // Gameplay pattern variation tuning
        let isMoving = false;
        let isExplosive = false;

        if (type !== 'unbreakable') {
          const isExtraordinary = difficulty.difficultyRating === 'Extraordinary Hard';
          const isHardTier = difficulty.difficultyRating === 'Hard';

          if (stageInChapter === 1) {
            // Stage 1: Clean formation scaled to current tier
            type = isExtraordinary && roll < 0.35 ? 'strong' : 'standard';
            hp = type === 'strong' ? 2 : 1;
            points = hp * 100;
            color = type === 'strong' ? '#10b981' : chapter.themeHue;
            glowColor = type === 'strong' ? 'rgba(16, 185, 129, 0.45)' : chapter.themeGlow;
          } else if (stageInChapter === 2) {
            // Stage 2: Multicolor rainbow spectrum
            const rainbowPalette = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#38bdf8', '#d946ef', '#84cc16'];
            color = rainbowPalette[r % rainbowPalette.length];
            glowColor = `${color}66`;
            type = isExtraordinary && r % 3 === 0 ? 'armored' : r % 3 === 2 ? 'strong' : 'standard';
            hp = type === 'armored' ? 3 : type === 'strong' ? 2 : 1;
            points = hp * 100;
          } else if (stageInChapter === 3) {
            // Stage 3: Moving bricks (alternating rows drift horizontally)
            if (r % 2 === 1 && c > 0 && c < cols - 1) {
              isMoving = true;
            }
            type = roll < armoredRatio ? 'armored' : roll < armoredRatio + 0.3 ? 'strong' : 'standard';
            hp = type === 'armored' ? (isExtraordinary ? 4 : 3) : type === 'strong' ? 2 : 1;
            points = hp * 110;
            if (type === 'armored') {
              color = '#f59e0b';
              glowColor = 'rgba(245, 158, 11, 0.45)';
            } else if (type === 'strong') {
              color = '#10b981';
              glowColor = 'rgba(16, 185, 129, 0.45)';
            }
          } else if (stageInChapter === 4) {
            // Stage 4: Strong multi-hit armored bastion
            if (roll < (isExtraordinary ? 0.6 : 0.45)) {
              type = 'armored';
              hp = isExtraordinary ? 4 : 3;
              points = hp * 120;
              color = isExtraordinary ? '#e11d48' : '#f59e0b';
              glowColor = isExtraordinary ? 'rgba(225, 29, 72, 0.55)' : 'rgba(245, 158, 11, 0.45)';
            } else {
              type = 'strong';
              hp = 2;
              points = 200;
              color = '#10b981';
              glowColor = 'rgba(16, 185, 129, 0.45)';
            }
          } else if (stageInChapter === 5) {
            // Stage 5: Explosive bricks (detonate neighbor clusters on impact)
            if (roll < (isExtraordinary ? 0.22 : 0.16) && r > 1 && r < rows - 2) {
              type = 'explosive';
              isExplosive = true;
              hp = 1;
              points = 250;
              color = '#f97316';
              glowColor = 'rgba(249, 115, 22, 0.7)';
            } else if (roll < armoredRatio + 0.12) {
              type = 'armored';
              hp = isExtraordinary ? 4 : 3;
              points = hp * 120;
              color = '#f59e0b';
              glowColor = 'rgba(245, 158, 11, 0.45)';
            } else {
              type = 'standard';
              hp = 1;
              points = 100;
              color = chapter.themeHue;
              glowColor = chapter.themeGlow;
            }
          } else {
            // Stages 6-9: Progressive tier scaling
            if (roll < armoredRatio) {
              type = 'armored';
              hp = isExtraordinary ? 4 : 3;
              points = hp * 120;
              color = isExtraordinary ? '#e11d48' : '#f59e0b';
              glowColor = isExtraordinary ? 'rgba(225, 29, 72, 0.5)' : 'rgba(245, 158, 11, 0.45)';
            } else if (roll < armoredRatio + strongRatio) {
              type = 'strong';
              hp = 2;
              points = 200;
              color = '#10b981';
              glowColor = 'rgba(16, 185, 129, 0.45)';
            } else {
              type = 'standard';
              hp = 1;
              points = 100;
              color = chapter.themeHue;
              glowColor = chapter.themeGlow;
            }

            // In Hard & Extraordinary Hard stages 7-9, add kinetic moving defenders
            if ((isHardTier || isExtraordinary) && stageInChapter >= 8 && r === rows - 2 && c > 0 && c < cols - 1) {
              isMoving = true;
            }
          }
        }

        const x = sidePadding + c * (brickWidth + brickMargin);
        const y = topOffset + r * (brickHeight + brickMargin);
        const tierMoveSpeed =
          difficulty.difficultyRating === 'Extraordinary Hard'
            ? 2.15
            : difficulty.difficultyRating === 'Hard'
            ? 1.7
            : difficulty.difficultyRating === 'Ordinary'
            ? 1.35
            : 1.1;

        bricks.push({
          id: `lvl-${lvl}-b-${idCounter++}`,
          x,
          y,
          baseX: x,
          baseY: y,
          width: brickWidth,
          height: brickHeight,
          maxHp: hp,
          currentHp: hp,
          type,
          color,
          glowColor,
          points,
          isDestructible,
          hitFlashTime: 0,
          isMoving,
          moveRange: isMoving ? 26 : undefined,
          moveSpeed: isMoving ? tierMoveSpeed : undefined,
          movePhase: isMoving ? r * 0.4 + c * 0.2 : undefined,
          isExplosive,
        });

        if (isDestructible) {
          totalPoints += points;
        }
      }
    }

    // Solvability safeguard: if fewer than 8 destructible bricks, inject baseline row
    const destructibleBricks = bricks.filter((b) => b.isDestructible);
    if (destructibleBricks.length < 8) {
      for (let c = 0; c < cols; c++) {
        const x = sidePadding + c * (brickWidth + brickMargin);
        const y = topOffset + rows * (brickHeight + brickMargin);
        bricks.push({
          id: `lvl-${lvl}-fallback-${c}`,
          x,
          y,
          width: brickWidth,
          height: brickHeight,
          maxHp: 1,
          currentHp: 1,
          type: 'standard',
          color: chapter.themeHue,
          glowColor: chapter.themeGlow,
          points: 100,
          isDestructible: true,
          hitFlashTime: 0,
        });
        totalPoints += 100;
      }
    }

    return {
      levelNumber: lvl,
      chapter,
      title,
      bricks,
      cols,
      rows,
      destructibleCount: bricks.filter((b) => b.isDestructible).length,
      totalPoints,
      recommendedSpeedMultiplier: difficulty.ballSpeedMultiplier,
      difficultyRating: difficulty.difficultyRating,
      difficultyProfile: difficulty,
    };
  }

  /**
   * Shape the grid matrix according to the chosen archetype, scaled for 15-18 rows
   */
  private static populateGridArchetype(
    grid: number[][],
    rows: number,
    cols: number,
    archetype: LayoutArchetype,
    rng: SeededRandom
  ) {
    const halfCols = Math.ceil(cols / 2);

    switch (archetype) {
      case 'CLASSIC_PYRAMID': {
        // Multi-tiered stepped ziggurats across the tall grid
        const tierRows = Math.ceil(rows / 2);
        for (let r = 0; r < rows; r++) {
          const localR = r % tierRows;
          const indent = Math.min(localR, halfCols - 1);
          const startCol = indent;
          const endCol = cols - 1 - startCol;
          for (let c = startCol; c <= endCol; c++) {
            grid[r][c] = (localR === 0 || r === rows - 1) ? 2 : 1;
          }
        }
        break;
      }

      case 'DIAMOND_SHRINE': {
        // Stacked dual crystalline diamonds
        const halfRows = Math.floor(rows / 2);
        for (let r = 0; r < rows; r++) {
          const subR = r < halfRows ? r : r - halfRows;
          const subMid = Math.floor(halfRows / 2);
          const dist = Math.abs(subR - subMid);
          const indent = Math.min(dist, halfCols - 2);
          for (let c = indent; c < cols - indent; c++) {
            const isCore = subR === subMid && (c === halfCols - 1 || c === halfCols);
            grid[r][c] = isCore ? 9 : (c % 2 === 0 ? 2 : 1);
          }
        }
        break;
      }

      case 'CHECKERBOARD': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
            if (isBorder || (r + c) % 2 === 0) {
              grid[r][c] = (r % 4 === 0) ? 2 : 1;
            }
          }
        }
        break;
      }

      case 'STRIPES_TIER': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            grid[r][c] = (r % 3 === 0) ? 2 : (r % 3 === 1 ? 1 : 3);
          }
        }
        break;
      }

      case 'FORTRESS_CORE': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
            const isBelt = r === Math.floor(rows / 3) || r === Math.floor((rows * 2) / 3);
            if (isBorder) {
              grid[r][c] = 1;
            } else if (isBelt && (c === 2 || c === cols - 3)) {
              grid[r][c] = 9; // Unbreakable fortress turrets
            } else if (c === halfCols - 1 || c === halfCols) {
              grid[r][c] = 3; // Reinforced center core
            } else {
              grid[r][c] = 2;
            }
          }
        }
        break;
      }

      case 'CHEVRON_WAVE': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const offset = Math.abs(c - (cols - 1) / 2);
            if ((r + Math.floor(offset)) % 3 !== 0) {
              grid[r][c] = (r % 2 === 0) ? 2 : 1;
            }
          }
        }
        break;
      }

      case 'TWIN_PILLARS': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isPillar = c === 2 || c === cols - 3;
            const isBridge = r === 2 || r === Math.floor(rows / 2) || r === rows - 3;
            if (isPillar) {
              grid[r][c] = (r % 4 === 0) ? 9 : 3;
            } else if (isBridge) {
              grid[r][c] = 2;
            } else {
              grid[r][c] = 1;
            }
          }
        }
        break;
      }

      case 'INVADER_GRID': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < halfCols; c++) {
            const isEdge = c === 0 && (r === 0 || r === rows - 1);
            const active = !isEdge && rng.chance(0.78);
            const val = active ? (r % 3 === 0 ? 2 : 1) : 0;
            grid[r][c] = val;
            grid[r][cols - 1 - c] = val;
          }
        }
        break;
      }

      case 'LABYRINTH_GATE': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isGate = (r % 2 === 1) && (
              (r % 4 === 1 && c >= cols - 2) ||
              (r % 4 === 3 && c <= 1)
            );
            if (isGate) {
              grid[r][c] = 0;
            } else {
              grid[r][c] = (r % 4 === 0) ? 2 : 1;
            }
          }
        }
        break;
      }

      case 'HOURGLASS': {
        const halfRows = Math.floor(rows / 2);
        for (let r = 0; r < rows; r++) {
          const subR = r < halfRows ? r : r - halfRows;
          const subMid = Math.floor(halfRows / 2);
          const indent = Math.min(Math.abs(subR - subMid), halfCols - 2);
          for (let c = indent; c < cols - indent; c++) {
            grid[r][c] = (subR === subMid && c === halfCols - 1) ? 9 : (r % 2 === 0 ? 2 : 1);
          }
        }
        break;
      }

      case 'DOUBLE_CROSS': {
        const crossRows = [2, Math.floor(rows / 2), rows - 3];
        const crossCols = [2, cols - 3];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isCrossRow = crossRows.includes(r);
            const isCrossCol = crossCols.includes(c);
            if (isCrossRow || isCrossCol) {
              grid[r][c] = (isCrossRow && isCrossCol) ? 9 : 2;
            } else {
              grid[r][c] = (r + c) % 2 === 0 ? 1 : 0;
            }
          }
        }
        break;
      }

      case 'ZIGZAG_MAZE': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const track = (r % 3 === 1 && (c === (r % 6 === 1 ? cols - 2 : 1)));
            grid[r][c] = track ? 0 : (r % 2 === 0 ? 2 : 1);
          }
        }
        break;
      }

      case 'SHIELDED_HEX': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isRim = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
            const isMidBelt = r === Math.floor(rows / 2);
            if (isRim) {
              grid[r][c] = (c % 2 === 0) ? 2 : 1;
            } else if (isMidBelt && (c >= 2 && c <= cols - 3)) {
              grid[r][c] = 3;
            } else {
              grid[r][c] = (r + c) % 3 === 0 ? 2 : 1;
            }
          }
        }
        break;
      }

      case 'TITAN_WALL': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (r === rows - 1) {
              grid[r][c] = (c === 2 || c === cols - 3) ? 0 : 3;
            } else if (r === 0) {
              grid[r][c] = 1;
            } else {
              grid[r][c] = (r % 3 === 0) ? 3 : (r % 2 === 0 ? 2 : 1);
            }
          }
        }
        break;
      }

      case 'CHAOS_GALAXY': {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if ((r * 3 + c * 5) % 8 < 6) {
              grid[r][c] = (r + c) % 3 === 0 ? 2 : 1;
            }
          }
        }
        break;
      }

      case 'VORTEX_RING': {
        const halfRows = Math.floor(rows / 2);
        for (let r = 0; r < rows; r++) {
          const subR = r < halfRows ? r : r - halfRows;
          const subMid = Math.floor(halfRows / 2);
          for (let c = 0; c < cols; c++) {
            const dist = Math.max(Math.abs(subR - subMid), Math.abs(c - halfCols));
            if (dist === 1 || dist === 2 || dist === 3) {
              grid[r][c] = dist === 2 ? 2 : 1;
            } else if (dist === 0) {
              grid[r][c] = 9;
            }
          }
        }
        break;
      }

      case 'HORIZONTAL_MIRROR':
      default: {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < halfCols; c++) {
            const active = rng.chance(0.82);
            const val = active ? (r % 3 === 0 ? 2 : 1) : 0;
            grid[r][c] = val;
            grid[r][cols - 1 - c] = val;
          }
        }
        break;
      }
    }
  }
}
