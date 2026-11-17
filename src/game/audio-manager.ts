/**
 * Audio Manager: Pure Web Audio API synthesized sound effects.
 * Requires zero external audio files, ensuring instant offline loading
 * and guaranteed compatibility inside Blogger iframes.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Restore mute preference from localStorage if available
    try {
      const saved = localStorage.getItem('neon_breakout_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      // LocalStorage unavailable in restrictive iframe
    }
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Web Audio not supported
    }
  }

  private ensureRunning() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('neon_breakout_muted', String(this.isMuted));
    } catch {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Paddle collision sound: frequency modulated by hit position from center
   */
  public playPaddleHit(hitOffset: number) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch: 280Hz at center up to 480Hz at tips
      const baseFreq = 300 + Math.abs(hitOffset) * 160;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  /**
   * Pentatonic melodic frequency helper for rhythmic combo escalation
   */
  private getComboMelodicFreq(combo: number, rootHz: number = 293.66): number {
    // Minor/Major hybrid arcade pentatonic steps across 2.5 octaves
    const pentatonicSemitones = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31];
    const step = Math.max(0, combo - 1);
    const octaveWrap = Math.floor(step / pentatonicSemitones.length);
    const semitone = pentatonicSemitones[step % pentatonicSemitones.length] + Math.min(octaveWrap * 12, 12);
    return rootHz * Math.pow(2, semitone / 12);
  }

  /**
   * Brick collision ping (melodically pitch-shifted up the scale with combo)
   */
  public playBrickHit(combo: number = 1) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = this.getComboMelodicFreq(combo, 392.0); // G4 root melodic escalation

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.085);

      gain.gain.setValueAtTime(0.36, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * Brick destruction pop: punchy sub-thump + pitch-shifted melodic pop escalation synced to combo
   */
  public playBrickDestroy(combo: number = 1) {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const clampedCombo = Math.max(1, combo);

      // 1. Pitch-shifted melodic pop (primary tone climbing pentatonic scale with combo)
      const noteFreq = this.getComboMelodicFreq(clampedCombo, 261.63); // C4 root ascending to C6+
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();

      popOsc.type = 'sine';
      // Crisp upward "pop" transient from 0.85x into exact melodic pitch
      popOsc.frequency.setValueAtTime(noteFreq * 0.82, now);
      popOsc.frequency.exponentialRampToValueAtTime(noteFreq, now + 0.025);
      popOsc.frequency.exponentialRampToValueAtTime(noteFreq * 1.03, now + 0.13);

      popGain.gain.setValueAtTime(0.001, now);
      popGain.gain.linearRampToValueAtTime(0.36, now + 0.01);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      popOsc.connect(popGain);
      popGain.connect(this.masterGain);
      popOsc.start(now);
      popOsc.stop(now + 0.15);

      // 2. Rhythmic harmonic shimmer overtone on escalated combos (combo >= 3)
      if (clampedCombo >= 3) {
        const harmOsc = this.ctx.createOscillator();
        const harmGain = this.ctx.createGain();
        const harmFreq = clampedCombo >= 7 ? noteFreq * 2 : noteFreq * 1.5; // Fifth -> Octave shimmer

        harmOsc.type = 'triangle';
        harmOsc.frequency.setValueAtTime(harmFreq, now + 0.018);

        const harmAmp = Math.min(0.22, 0.08 + (clampedCombo - 2) * 0.018);
        harmGain.gain.setValueAtTime(0.001, now + 0.018);
        harmGain.gain.linearRampToValueAtTime(harmAmp, now + 0.03);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        harmOsc.connect(harmGain);
        harmGain.connect(this.masterGain);
        harmOsc.start(now + 0.018);
        harmOsc.stop(now + 0.17);
      }

      // 3. Punchy low arcade pop thump (also subtly pitch-nudged upward with combo)
      const thumpOsc = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      const thumpStart = 165 + Math.min(clampedCombo * 10, 120);

      thumpOsc.type = 'square';
      thumpOsc.frequency.setValueAtTime(thumpStart, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(48, now + 0.1);

      thumpGain.gain.setValueAtTime(0.2, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      thumpOsc.connect(thumpGain);
      thumpGain.connect(this.masterGain);

      thumpOsc.start(now);
      thumpOsc.stop(now + 0.11);
    } catch {}
  }

  /**
   * Wall bounce tick
   */
  public playWallHit() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.04);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  /**
   * Ball launch sound
   */
  public playLaunch() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  /**
   * Ball lost sound
   */
  public playBallLost() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Stage victory fanfare
   */
  public playVictory() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const noteStart = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(noteStart);
        osc.stop(noteStart + 0.3);
      });
    } catch {}
  }

  /**
   * Power-up dropped from brick
   */
  public playPowerUpSpawn() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  /**
   * Power-up collected by paddle
   */
  public playPowerUpCollect() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const noteStart = now + idx * 0.045;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.15, noteStart + 0.15);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(noteStart);
        osc.stop(noteStart + 0.24);
      });
    } catch {}
  }

  /**
   * Power-up duration expired
   */
  public playPowerUpExpire() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  /**
   * Shield barrier deflection
   */
  public playShieldDeflect() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  /**
   * Game State Transitions: Pause, Resume, Game Over
   */
  public playStateTransition(state: 'PAUSE' | 'RESUME' | 'GAMEOVER') {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (state === 'PAUSE') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (state === 'RESUME') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (state === 'GAMEOVER') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.6);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }

      osc.connect(gain);
      gain.connect(this.masterGain);
    } catch {}
  }

  /**
   * Boss targeting warning beep
   */
  public playBossWarning() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1180, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  /**
   * Boss firing laser projectile
   */
  public playBossFire() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  /**
   * Paddle impacted by boss projectile
   */
  public playPaddleHitByBoss() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Boss obliterated fanfare
   */
  public playBossDefeated() {
    if (this.isMuted) return;
    this.ensureRunning();
    if (!this.ctx || !this.masterGain) return;

    try {
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteStart = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.28, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(noteStart);
        osc.stop(noteStart + 0.25);
      });
    } catch {}
  }
}
