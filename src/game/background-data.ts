/**
 * 400 Stage Expansion: Background Environment Configurations
 * 40 Dedicated Chapters x 10 Unique Stages = Exactly 400 Backgrounds (BG001 - BG400)
 * 
 * Each stage (1 to 400) has its own distinct visual identity, tailored palette,
 * celestial bodies, procedural silhouettes, and ambient particle animations.
 */

export interface BackgroundPalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  horizonGlow: string;
  silhouetteColor: string;
  silhouetteSecondary: string;
  accentColor: string;
  accentGlow: string;
  particleColor: string;
  gridColor?: string;
  /** Vignette density to guarantee bricks & ball remain 100% visible */
  vignetteAlpha: number;
}

export type CelestialType =
  | 'NONE'
  | 'CYBER_MOON'
  | 'GALAXY_SPIRAL'
  | 'NEBULA_CLOUD'
  | 'SOLAR_CORONA'
  | 'BLACK_HOLE'
  | 'PLANET_RINGS'
  | 'SYNTH_SUN'
  | 'AURORA_WAVE'
  | 'PYRAMID_BEACON'
  | 'JAPANESE_SUN'
  | 'UNDERWATER_SUNBEAMS'
  | 'MAGMA_ORB'
  | 'ICE_STAR'
  | 'CLOCKWORK_SUN'
  | 'DATA_ORB'
  | 'FLOATING_CASTLE'
  | 'GEOMETRIC_TESSERACT'
  | 'ARCADE_LOGO'
  | 'CANDY_MOON';

export type SilhouetteType =
  | 'CYBER_SKYLINE'
  | 'SPACE_HORIZON'
  | 'UNDERWATER_CORAL'
  | 'MAGIC_TREES'
  | 'LAVA_VOLCANO'
  | 'ICE_SPIRES'
  | 'EGYPT_PYRAMIDS'
  | 'SAKURA_PAGODA'
  | 'CANDY_HILLS'
  | 'ATLANTIS_COLUMNS'
  | 'MATRIX_COLUMNS'
  | 'TROPICAL_PALMS'
  | 'ALIEN_SPIRES'
  | 'STEAMPUNK_GEARS'
  | 'MEDIEVAL_BATTLEMENTS'
  | 'SYNTH_WIREFRAME'
  | 'JUNGLE_RUINS'
  | 'SKY_CLOUDS'
  | 'ABSTRACT_POLYGONS'
  | 'ARCADE_CABINETS';

export type ParticleStyle =
  | 'NONE'
  | 'SPARKS'
  | 'STARS'
  | 'BUBBLES'
  | 'SPORES'
  | 'EMBERS'
  | 'SNOW'
  | 'DUST'
  | 'PETALS'
  | 'SUGAR'
  | 'MATRIX_GLYPHS'
  | 'POLLEN'
  | 'STEAM'
  | 'SMOKE'
  | 'RETRO_GRID'
  | 'GEOMETRIC_SHARDS'
  | 'PIXELS';

export interface RenderConfig {
  celestial: CelestialType;
  silhouette: SilhouetteType;
  particleStyle: ParticleStyle;
  particleCount: number;
  hasGrid: boolean;
  gridPerspective: boolean;
  starfieldIntensity: number; // 0.0 to 1.0
  lightRayIntensity: number;  // 0.0 to 1.0
  hasHorizonHaze: boolean;
}

export interface BackgroundEnvironment {
  backgroundId: string;       // BG001 to BG400
  categoryId: string;         // CAT01 to CAT40
  categoryName: string;
  categoryIndex: number;      // 1 to 40
  localIndex: number;         // 1 to 10 inside chapter
  stageNumber: number;        // 1 to 400
  backgroundName: string;
  palette: BackgroundPalette;
  renderConfig: RenderConfig;
  atmosphereDescription: string;
}

export interface BackgroundCategory {
  categoryId: string;
  categoryIndex: number;
  name: string;
  tagline: string;
  themeHue: string;
  startLevel: number;
  endLevel: number;
  startBgId: string;
  endBgId: string;
}

export function formatBgId(index: number): string {
  return `BG${index.toString().padStart(3, '0')}`;
}

export function formatCatId(index: number): string {
  return `CAT${index.toString().padStart(2, '0')}`;
}

export const CHAPTER_DEFINITIONS: Array<{
  name: string;
  tagline: string;
  hue: string;
  celestial: CelestialType;
  silhouette: SilhouetteType;
  particle: ParticleStyle;
}> = [
  // Space & Cosmos (Ch 1 - 10)
  { name: 'Galaxy Nebula', tagline: 'Vast interstellar clouds and newborn starlight', hue: '#06b6d4', celestial: 'NEBULA_CLOUD', silhouette: 'SPACE_HORIZON', particle: 'STARS' },
  { name: 'Planet Saturn', tagline: 'Majestic ice rings and golden orbital horizons', hue: '#eab308', celestial: 'PLANET_RINGS', silhouette: 'SPACE_HORIZON', particle: 'STARS' },
  { name: 'Moon Base', tagline: 'Lunar outposts under silver crater domes', hue: '#94a3b8', celestial: 'CYBER_MOON', silhouette: 'SPACE_HORIZON', particle: 'DUST' },
  { name: 'Mars Surface', tagline: 'Crimson rust dunes, canyons, and dust storms', hue: '#ef4444', celestial: 'SOLAR_CORONA', silhouette: 'SPACE_HORIZON', particle: 'EMBERS' },
  { name: 'Black Hole', tagline: 'Gravitational singularity warping light and space', hue: '#8b5cf6', celestial: 'BLACK_HOLE', silhouette: 'SPACE_HORIZON', particle: 'STARS' },
  { name: 'Starfield', tagline: 'Dense star clusters drifting across deep cosmos', hue: '#38bdf8', celestial: 'GALAXY_SPIRAL', silhouette: 'SPACE_HORIZON', particle: 'STARS' },
  { name: 'Alien Planet', tagline: 'Strange purple flora and exotic atmospheric rings', hue: '#a855f7', celestial: 'PLANET_RINGS', silhouette: 'ALIEN_SPIRES', particle: 'SPORES' },
  { name: 'Space Station', tagline: 'Orbital titanium hubs and solar array corridors', hue: '#0ea5e9', celestial: 'CYBER_MOON', silhouette: 'CYBER_SKYLINE', particle: 'SPARKS' },
  { name: 'Meteor Shower', tagline: 'Blazing comets streaking through atmospheric fire', hue: '#f97316', celestial: 'SOLAR_CORONA', silhouette: 'SPACE_HORIZON', particle: 'SPARKS' },
  { name: 'Cosmic Portal', tagline: 'Warp conduits bridging distant galaxies', hue: '#d946ef', celestial: 'GEOMETRIC_TESSERACT', silhouette: 'SPACE_HORIZON', particle: 'GEOMETRIC_SHARDS' },

  // Oceanic & Underwater Realms (Ch 11 - 20)
  { name: 'Coral Reef', tagline: 'Bioluminescent polyps and vibrant coral gardens', hue: '#14b8a6', celestial: 'UNDERWATER_SUNBEAMS', silhouette: 'UNDERWATER_CORAL', particle: 'BUBBLES' },
  { name: 'Deep Ocean', tagline: 'Abyssal waters beneath midnight sunbeams', hue: '#0284c7', celestial: 'UNDERWATER_SUNBEAMS', silhouette: 'UNDERWATER_CORAL', particle: 'BUBBLES' },
  { name: 'Atlantis City', tagline: 'Submerged marble columns and orichalcum energy', hue: '#06b6d4', celestial: 'DATA_ORB', silhouette: 'ATLANTIS_COLUMNS', particle: 'BUBBLES' },
  { name: 'Shark Kingdom', tagline: 'Apex predator trenches and deep blue reefs', hue: '#0f766e', celestial: 'UNDERWATER_SUNBEAMS', silhouette: 'UNDERWATER_CORAL', particle: 'BUBBLES' },
  { name: 'Sunken Ship', tagline: 'Haunted pirate galleons on the ocean floor', hue: '#475569', celestial: 'NONE', silhouette: 'UNDERWATER_CORAL', particle: 'BUBBLES' },
  { name: 'Jellyfish Cave', tagline: 'Phosphorescent drifters illuminating subsea grottos', hue: '#ec4899', celestial: 'NONE', silhouette: 'UNDERWATER_CORAL', particle: 'SPORES' },
  { name: 'Pearl Palace', tagline: 'Opalescent shells and underwater crystalline sanctuaries', hue: '#fbcfe8', celestial: 'UNDERWATER_SUNBEAMS', silhouette: 'ATLANTIS_COLUMNS', particle: 'BUBBLES' },
  { name: 'Underwater Volcano', tagline: 'Hydrothermal vents and smoking ocean vents', hue: '#ea580c', celestial: 'MAGMA_ORB', silhouette: 'LAVA_VOLCANO', particle: 'EMBERS' },
  { name: 'Ocean Trench', tagline: 'The Mariana depths with glowing benthic life', hue: '#1e1b4b', celestial: 'NONE', silhouette: 'UNDERWATER_CORAL', particle: 'BUBBLES' },
  { name: 'Crystal Lagoon', tagline: 'Shimmering turquoise waters reflecting prism light', hue: '#22d3ee', celestial: 'UNDERWATER_SUNBEAMS', silhouette: 'TROPICAL_PALMS', particle: 'BUBBLES' },

  // Fantasy & Elemental Kingdoms (Ch 21 - 30)
  { name: 'Enchanted Forest', tagline: 'Elder willows and dancing fairy lantern motes', hue: '#10b981', celestial: 'CYBER_MOON', silhouette: 'MAGIC_TREES', particle: 'SPORES' },
  { name: 'Dragon Valley', tagline: 'Smoking crags, wyrm perches, and fiery gorges', hue: '#dc2626', celestial: 'MAGMA_ORB', silhouette: 'LAVA_VOLCANO', particle: 'EMBERS' },
  { name: 'Crystal Mountains', tagline: 'Towering quartz spires splitting light into rainbows', hue: '#a7f3d0', celestial: 'ICE_STAR', silhouette: 'ICE_SPIRES', particle: 'GEOMETRIC_SHARDS' },
  { name: 'Fairy Kingdom', tagline: 'Glowing toadstool groves and starlight glades', hue: '#f472b6', celestial: 'CYBER_MOON', silhouette: 'MAGIC_TREES', particle: 'PETALS' },
  { name: 'Magic Castle', tagline: 'Arcane towers casting glowing runic barriers', hue: '#8b5cf6', celestial: 'FLOATING_CASTLE', silhouette: 'MEDIEVAL_BATTLEMENTS', particle: 'SPARKS' },
  { name: 'Lava Kingdom', tagline: 'Rivers of molten rock and roaring caldera peaks', hue: '#f97316', celestial: 'MAGMA_ORB', silhouette: 'LAVA_VOLCANO', particle: 'EMBERS' },
  { name: 'Ice Palace', tagline: 'Glacial thrones and auroras dancing across frozen skies', hue: '#38bdf8', celestial: 'AURORA_WAVE', silhouette: 'ICE_SPIRES', particle: 'SNOW' },
  { name: 'Jungle Temple', tagline: 'Overgrown stepped pyramids hidden by rainforests', hue: '#65a30d', celestial: 'PYRAMID_BEACON', silhouette: 'JUNGLE_RUINS', particle: 'POLLEN' },
  { name: 'Waterfall Paradise', tagline: 'Cascading misty torrents flowing into emerald pools', hue: '#0284c7', celestial: 'UNDERWATER_SUNBEAMS', silhouette: 'TROPICAL_PALMS', particle: 'BUBBLES' },
  { name: 'Rainbow Valley', tagline: 'Prismatic spectral fields glowing in harmony', hue: '#c084fc', celestial: 'AURORA_WAVE', silhouette: 'SKY_CLOUDS', particle: 'PETALS' },

  // Cybernetic & Ancient Realms (Ch 31 - 40)
  { name: 'Cyberpunk City', tagline: 'Holographic billboards, rainy streets, and neon alleys', hue: '#06b6d4', celestial: 'CYBER_MOON', silhouette: 'CYBER_SKYLINE', particle: 'SPARKS' },
  { name: 'Neon Arcade', tagline: 'Coin-op cabinets, glowing marquees, and pixel vectors', hue: '#f59e0b', celestial: 'ARCADE_LOGO', silhouette: 'ARCADE_CABINETS', particle: 'PIXELS' },
  { name: 'Robot Factory', tagline: 'Automated assembly belts, sparks, and copper steam', hue: '#d97706', celestial: 'CLOCKWORK_SUN', silhouette: 'STEAMPUNK_GEARS', particle: 'STEAM' },
  { name: 'Digital Matrix', tagline: 'Cascading green code rain and glowing silicon logic', hue: '#22c55e', celestial: 'DATA_ORB', silhouette: 'MATRIX_COLUMNS', particle: 'MATRIX_GLYPHS' },
  { name: 'Hologram World', tagline: 'Hard-light holographic citadels and wireframe grids', hue: '#38bdf8', celestial: 'GEOMETRIC_TESSERACT', silhouette: 'SYNTH_WIREFRAME', particle: 'RETRO_GRID' },
  { name: 'Desert Pyramid', tagline: 'Towering golden tombs emerging from sandstorms', hue: '#eab308', celestial: 'PYRAMID_BEACON', silhouette: 'EGYPT_PYRAMIDS', particle: 'DUST' },
  { name: 'Ancient Egypt', tagline: 'Nile obelisks, Sphinx horizons, and starlit hieroglyphs', hue: '#f59e0b', celestial: 'PYRAMID_BEACON', silhouette: 'EGYPT_PYRAMIDS', particle: 'DUST' },
  { name: 'Haunted Mansion', tagline: 'Moonlit gothic cathedrals, mist, and wandering phantoms', hue: '#64748b', celestial: 'CYBER_MOON', silhouette: 'MEDIEVAL_BATTLEMENTS', particle: 'SMOKE' },
  { name: 'Candy Wonderland', tagline: 'Cotton candy clouds, lollipop hills, and chocolate falls', hue: '#ec4899', celestial: 'CANDY_MOON', silhouette: 'CANDY_HILLS', particle: 'SUGAR' },
  { name: 'Golden Treasure Kingdom', tagline: 'Gilded sovereign spires, jewel vaults, and midas glows', hue: '#facc15', celestial: 'SOLAR_CORONA', silhouette: 'MEDIEVAL_BATTLEMENTS', particle: 'SPARKS' },
];

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = CHAPTER_DEFINITIONS.map((def, idx) => {
  const catIdx = idx + 1;
  const startLevel = (catIdx - 1) * 10 + 1;
  const endLevel = catIdx * 10;
  return {
    categoryId: formatCatId(catIdx),
    categoryIndex: catIdx,
    name: def.name,
    tagline: def.tagline,
    themeHue: def.hue,
    startLevel,
    endLevel,
    startBgId: formatBgId(startLevel),
    endBgId: formatBgId(endLevel),
  };
});

// Stage sub-archetype titles for each of the 10 stages in a chapter
const STAGE_TITLES_PATTERN = [
  'Genesis Outpost',
  'Prism Formation',
  'Kinetic Drift',
  'Armored Bastion',
  'Volatile Core',
  'Hazard Descent',
  'Precision Gate',
  'Overdrive Frenzy',
  'Labyrinth Matrix',
  'Boss Apex Titan',
];

function buildAll400Environments(): BackgroundEnvironment[] {
  const environments: BackgroundEnvironment[] = [];

  for (let ch = 0; ch < CHAPTER_DEFINITIONS.length; ch++) {
    const chapterDef = CHAPTER_DEFINITIONS[ch];
    const catIdx = ch + 1;
    const catId = formatCatId(catIdx);

    for (let st = 0; st < 10; st++) {
      const stageNumber = ch * 10 + (st + 1);
      const bgId = formatBgId(stageNumber);
      const localIndex = st + 1;
      const stagePatternName = STAGE_TITLES_PATTERN[st];
      const bgName = `${chapterDef.name} · ${stagePatternName}`;

      // Progressive tone shift across the 10 stages of the chapter
      const v = st / 9; // 0.0 to 1.0

      // Compute hue offset
      const baseHueMatch = chapterDef.hue.match(/#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
      let hueNum = 200;
      if (baseHueMatch) {
        const r = parseInt(baseHueMatch[1], 16) / 255;
        const g = parseInt(baseHueMatch[2], 16) / 255;
        const b = parseInt(baseHueMatch[3], 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        if (max !== min) {
          const d = max - min;
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        hueNum = Math.round(h * 360);
      }

      const stageHue = (hueNum + Math.round(v * 28)) % 360;

      const palette: BackgroundPalette = {
        skyTop: `hsl(${stageHue}, 85%, ${Math.max(4, 5 + v * 3)}%)`,
        skyMid: `hsl(${(stageHue + 15) % 360}, 80%, ${Math.max(7, 8 + v * 4)}%)`,
        skyBottom: `hsl(${(stageHue + 30) % 360}, 85%, ${Math.max(10, 12 + v * 4)}%)`,
        horizonGlow: `hsl(${stageHue}, 95%, 48%)`,
        silhouetteColor: `hsl(${stageHue}, 70%, 4%)`,
        silhouetteSecondary: `hsl(${stageHue}, 60%, 8%)`,
        accentColor: chapterDef.hue,
        accentGlow: `hsla(${stageHue}, 90%, 50%, 0.45)`,
        particleColor: `hsl(${(stageHue + 180) % 360}, 90%, 75%)`,
        gridColor: `hsla(${stageHue}, 80%, 60%, 0.12)`,
        vignetteAlpha: 0.62,
      };

      const renderConfig: RenderConfig = {
        celestial: st === 9 ? 'SOLAR_CORONA' : st % 3 === 0 ? chapterDef.celestial : 'NONE',
        silhouette: chapterDef.silhouette,
        particleStyle: chapterDef.particle,
        particleCount: 18 + st * 2,
        hasGrid: st === 2 || st === 4 || st === 9,
        gridPerspective: true,
        starfieldIntensity: ch < 10 ? 0.75 : 0.35,
        lightRayIntensity: st === 0 || st === 9 ? 0.4 : 0.2,
        hasHorizonHaze: true,
      };

      environments.push({
        backgroundId: bgId,
        categoryId: catId,
        categoryName: chapterDef.name,
        categoryIndex: catIdx,
        localIndex,
        stageNumber,
        backgroundName: bgName,
        palette,
        renderConfig,
        atmosphereDescription: `Chapter ${catIdx}: ${chapterDef.name} (Stage ${stageNumber}) - ${stagePatternName}.`,
      });
    }
  }

  return environments;
}

export const BACKGROUND_ENVIRONMENTS: BackgroundEnvironment[] = buildAll400Environments();

export const BACKGROUND_BY_ID: Map<string, BackgroundEnvironment> = new Map(
  BACKGROUND_ENVIRONMENTS.map((bg) => [bg.backgroundId, bg])
);

export const BACKGROUNDS_BY_CATEGORY: Map<string, BackgroundEnvironment[]> = new Map(
  BACKGROUND_CATEGORIES.map((cat) => [
    cat.categoryId,
    BACKGROUND_ENVIRONMENTS.filter((bg) => bg.categoryId === cat.categoryId),
  ])
);

export const TOTAL_BACKGROUNDS_COUNT = BACKGROUND_ENVIRONMENTS.length; // Exactly 400

export function getBackgroundById(id: string): BackgroundEnvironment {
  return BACKGROUND_BY_ID.get(id) || BACKGROUND_ENVIRONMENTS[0];
}

/**
 * Stage S (1 to 1000) maps cleanly across the 400 unique backgrounds (1:1 for 1-400, rotated deterministically for 401-1000)
 */
export function getBackgroundForLevel(levelNumber: number): BackgroundEnvironment {
  const clamped = Math.max(1, Math.min(1000, Math.floor(levelNumber)));
  if (clamped <= BACKGROUND_ENVIRONMENTS.length) {
    return BACKGROUND_ENVIRONMENTS[clamped - 1] || BACKGROUND_ENVIRONMENTS[0];
  }
  const chapterOffset = Math.floor((clamped - 1) / 10) * 17;
  const idx = (clamped - 1 + chapterOffset) % BACKGROUND_ENVIRONMENTS.length;
  return BACKGROUND_ENVIRONMENTS[idx] || BACKGROUND_ENVIRONMENTS[0];
}

export function getRandomBackground(excludeId?: string): BackgroundEnvironment {
  let pick: BackgroundEnvironment;
  let attempts = 0;
  do {
    const idx = Math.floor(Math.random() * BACKGROUND_ENVIRONMENTS.length);
    pick = BACKGROUND_ENVIRONMENTS[idx];
    attempts++;
  } while (excludeId && pick.backgroundId === excludeId && attempts < 10);
  return pick;
}

export function searchBackgrounds(query: string): BackgroundEnvironment[] {
  const q = query.trim().toLowerCase();
  if (!q) return BACKGROUND_ENVIRONMENTS;

  return BACKGROUND_ENVIRONMENTS.filter((bg) => {
    return (
      bg.backgroundId.toLowerCase().includes(q) ||
      bg.backgroundName.toLowerCase().includes(q) ||
      bg.categoryName.toLowerCase().includes(q) ||
      bg.categoryId.toLowerCase().includes(q) ||
      `stage ${bg.stageNumber}`.includes(q)
    );
  });
}
