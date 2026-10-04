/**
 * Optional, fully synthesized sound. Nothing is loaded and no permission is requested.
 * The AudioContext is only created after the user turns sound on.
 */
class AmbientSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drones: OscillatorNode[] = [];

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  start() {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    void ctx.resume();
    if (this.drones.length === 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 420;
      filter.Q.value = 0.6;
      filter.connect(this.master);
      [55, 82.4, 110.3].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 2 ? "triangle" : "sine";
        osc.frequency.value = freq;
        osc.detune.value = (i - 1) * 6;
        gain.gain.value = i === 2 ? 0.05 : 0.18;
        osc.connect(gain).connect(filter);
        osc.start();
        this.drones.push(osc);
      });
    }
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.09, ctx.currentTime, 0.8);
  }

  stop() {
    if (!this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  }

  /** Short soft ping for selections. */
  blip(pitch = 1) {
    if (!this.ctx || !this.master || this.master.gain.value < 0.01) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660 * pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330 * pitch, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  }
}

export const ambientSound = new AmbientSound();
