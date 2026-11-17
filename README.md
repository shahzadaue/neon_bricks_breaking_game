# Neon Breakout – 2D Hyper-Casual Brick Breaker Game
## 100 Seeded Stages & 2-Player Versus Competition

Neon Breakout is a production-quality 2D HTML5 Canvas Brick Breaker game engineered specifically for deployment on desktop browsers, mobile touch devices, and seamless embedding inside **Blogger** gaming posts via responsive iframes.

---

## 1. Features Added

### A. Player 1 vs Player 2 High-Scorer Competition Mode
- **Turn-Based Competitive Match**: Player 1 and Player 2 compete on the exact same seeded level layout.
- **Round Flow**:
  1. Player 1 plays Round 1 with Neon Cyan theme (`#06b6d4`), racking up points, combos, and destroyed bricks.
  2. Upon ball depletion or stage clearance, Player 1's stats are locked in and an interstitial banner notifies Player 2.
  3. Player 2 plays Round 2 on the identical stage with Neon Rose theme (`#f43f5e`).
  4. Once Player 2 finishes, the match concludes with the **"High Scorer Player Wins!"** winner celebration, trophy podium, and head-to-head breakdown (Score, Max Combo, Cleared status).
- **Dual Scoreboard HUD**: Clean active player indicators and live score comparison in the top bar.

### B. 100 Procedural Stages Across 10 Chapters
- Expanded from 50 to **100 deterministic stages**:
  - Chapter 1: **Neon Genesis** (Levels 1–10) - Cyan `#06b6d4`
  - Chapter 2: **Emerald Matrix** (Levels 11–20) - Emerald `#10b981`
  - Chapter 3: **Amber Vault** (Levels 21–30) - Amber `#f59e0b`
  - Chapter 4: **Crimson Sector** (Levels 31–40) - Magenta `#ec4899`
  - Chapter 5: **Quantum Void** (Levels 41–50) - Violet `#8b5cf6`
  - Chapter 6: **Solar Flare** (Levels 51–60) - Solar Orange `#f97316`
  - Chapter 7: **Cyber Abyss** (Levels 61–70) - Electric Indigo `#6366f1`
  - Chapter 8: **Toxic Neon** (Levels 71–80) - Acid Lime `#84cc16`
  - Chapter 9: **Vortex Rift** (Levels 81–90) - Ultraviolet `#d946ef`
  - Chapter 10: **Hyper Zenith** (Levels 91–100) - Apex Gold `#eab308`
- 17 structural archetypes including `Hourglass`, `Double Cross`, `Zigzag Maze`, `Shielded Hex`, `Titan Wall`, `Chaos Galaxy`, and `Vortex Ring`.
- Escalated difficulty scaling with speed multipliers from $1.00\times$ up to $1.28\times$.

### C. Customer Level Shelf (Stages 1 - 100)
- Customers select any stage from the 100-stage shelf with difficulty ratings (`Normal`, `Hard`, `Expert`, `Master`, `Extreme`), search/jump filter, and chapter tabs. No manual stage customization needed—all 100 stages are pre-configured, tested, and playable immediately.

---

## 2. Core Physics Specifications

### Fixed-Timestep Accumulator
- **Timestep**: $\Delta t = 1/120\text{ s}$ ($8.33\text{ ms}$)
- Movement is delta-time independent, ensuring identical ball velocities and trajectories on 60Hz, 90Hz, 120Hz, and 144Hz monitors.
- Frame clamping prevents physics explosion when browser tabs are backgrounded or restored.

### Anti-Tunneling Sub-Stepping
- When ball velocity is high, displacement per frame is divided into sub-steps:
  $$\text{subSteps} = \max\left(1, \left\lceil \frac{\text{speed} \cdot dt}{0.6 \cdot \text{radius}} \right\rceil\right)$$
- The ball never moves more than $60\%$ of its radius in a single test, preventing high-speed tunneling through thin bricks or paddle boundaries.

### Steered Paddle Reflection
- Collision angle is calculated based on distance from the paddle center:
  $$t = \frac{\text{ball}.x - \text{paddle.center}}{\text{paddle.width} / 2}, \quad t \in [-1.0, 1.0]$$
- Rebound angle spans $[-68^\circ, +68^\circ]$, enriched with instantaneous paddle horizontal velocity ($v_x$) for spin and momentum transfer.

### Trajectory Stabilization
- Minimum vertical velocity threshold prevents endless horizontal bouncing between vertical walls.
- Speed is dynamically clamped between $380\text{ px/s}$ and $750\text{ px/s}$.

---

## 3. How to Run Locally

1. Clone or extract the repository:
   ```bash
   npm install
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:3000`.

---

## 4. Blogger Integration (Option A: Responsive Iframe)

To publish this game in any Blogger post or page:

1. Open Blogger dashboard -> **Posts** -> **Create / Edit Post**.
2. Switch the editor view to **HTML View** (click the pencil/HTML icon in the top left of the editor toolbar).
3. Paste the following responsive embed code:

```html
<!-- START NEON BREAKOUT BLOGGER EMBED -->
<div style="position: relative; width: 100%; max-width: 600px; margin: 0 auto; aspect-ratio: 3/4; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); background: #080b12;">
  <iframe
    src="https://ais-dev-wfmsb2joqcfaizruoudlqa-57151763148.asia-southeast1.run.app/"
    title="Neon Breakout 2D Brick Breaker Game"
    width="100%"
    height="100%"
    style="border: none; display: block;"
    allow="autoplay; fullscreen"
    loading="lazy"
  ></iframe>
</div>
<!-- END NEON BREAKOUT BLOGGER EMBED -->
```

4. Click **Publish** or **Update**. The game will automatically adapt to mobile screens, tablets, and desktop browsers without theme layout breakage.

---

## 5. Phase 1 Acceptance Criteria & Verification

| Requirement | Acceptance Test | Status |
| :--- | :--- | :--- |
| **Canvas Setup** | 600x800 logical coordinate space with retina DPR scaling | **PASSED** |
| **Fixed Timestep** | Delta-time independent movement at 120Hz physics sub-step | **PASSED** |
| **Collision Math** | Circle-to-AABB nearest-point with normal ejection | **PASSED** |
| **Anti-Tunneling** | Sub-stepping when displacement $> 0.6 \times \text{radius}$ | **PASSED** |
| **Paddle Steering** | Rebound angle $\theta \in [-68^\circ, +68^\circ]$ + spin influence | **PASSED** |
| **Brick Health** | 1-HP (Cyan), 2-HP (Emerald), 3-HP (Amber), Unbreakable (Slate) | **PASSED** |
| **Visual Indicators**| Procedural cracks, HP numeral, white hit flash | **PASSED** |
| **Web Audio API** | Pure synthesizers for bounce, break, pop, lost & fanfare | **PASSED** |
| **Controls** | Touch drag, mouse follow, Arrow keys / WASD, Space & Esc | **PASSED** |

---

## 6. Honest Limitations of Phase 1

1. **Levels**: Phase 1 includes the foundational arcade layout proving all 4 brick types and stage completion. The 3,000 deterministic procedural level generator will be introduced in **Phase 2**.
2. **Collectibles & Shop**: Coin economy, custom ball skins, and inventory are slated for **Phase 5**.
3. **Monetization & Ads**: Monetization integration points (AdSense / AdMob architecture) are scheduled for **Phase 6**.
