export class AudioSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public playWhistle(type: 'short' | 'long' | 'foul' | 'double' | 'fulltime' = 'short'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const triggerBlast = (startTime: number, duration: number, baseFreq: number = 3850) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const mainGain = ctx.createGain();

      // Pea-whistle trill modulation (~38Hz pea rattle)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(38, startTime);
      lfoGain.gain.setValueAtTime(140, startTime);
      lfo.connect(lfoGain);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, startTime);
      lfoGain.connect(osc.frequency);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 1.015, startTime);
      lfoGain.connect(osc2.frequency);

      mainGain.gain.setValueAtTime(0.001, startTime);
      mainGain.gain.linearRampToValueAtTime(0.22, startTime + 0.025);
      mainGain.gain.setValueAtTime(0.2, startTime + Math.max(0.03, duration - 0.05));
      mainGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(mainGain);
      osc2.connect(mainGain);
      mainGain.connect(ctx.destination);

      osc.start(startTime);
      osc2.start(startTime);
      lfo.start(startTime);

      osc.stop(startTime + duration);
      osc2.stop(startTime + duration);
      lfo.stop(startTime + duration);
    };

    if (type === 'short') {
      triggerBlast(now, 0.28, 3900);
    } else if (type === 'long') {
      triggerBlast(now, 0.65, 3850);
    } else if (type === 'foul') {
      // Sharp urgent referee foul whistle
      triggerBlast(now, 0.55, 4050);
    } else if (type === 'double') {
      triggerBlast(now, 0.22, 3900);
      triggerBlast(now + 0.28, 0.45, 3850);
    } else if (type === 'fulltime') {
      triggerBlast(now, 0.22, 3900);
      triggerBlast(now + 0.28, 0.22, 3900);
      triggerBlast(now + 0.56, 0.75, 3800);
    }
  }

  public playKick(power: number = 0.6): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clamped = Math.min(1.2, Math.max(0.2, power));

    // Low leather thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135 + clamped * 45, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.14);

    gain.gain.setValueAtTime(0.32 * clamped, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playTackleHit(isFoul: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isFoul ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isFoul ? 95 : 120, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.18);

    gain.gain.setValueAtTime(isFoul ? 0.28 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playCardSound(isRed: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = isRed ? [520, 370, 260] : [587.33, 880];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isRed ? 'sawtooth' : 'triangle';
      const t = now + idx * 0.11;
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playPostHit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.25);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playGoalCheer(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Stadium roar using filtered white noise + triumphant chord
    const bufferSize = ctx.sampleRate * 2.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 2.2);

    // Goal fanfare chord
    [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      oGain.gain.setValueAtTime(0.11, now + i * 0.06);
      oGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc.connect(oGain);
      oGain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + 1.45);
    });
  }
}
