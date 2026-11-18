/**
 * Synthesised vault sounds (no audio assets, no network). Browsers only allow audio
 * after a user gesture, which is exactly how these are triggered: wheel click and login.
 */

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

let muted = false;

export function setVaultMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem("gs-vault-muted", value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}

export function isVaultMuted(): boolean {
  try {
    return localStorage.getItem("gs-vault-muted") === "1";
  } catch {
    return muted;
  }
}

function tone(
  ctx: AudioContext,
  options: {
    type: OscillatorType;
    from: number;
    to: number;
    duration: number;
    gain: number;
    delay?: number;
  }
): void {
  const start = ctx.currentTime + (options.delay ?? 0);
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();

  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), start + options.duration);

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(options.gain, start + 0.04);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);

  oscillator.connect(envelope).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + options.duration + 0.05);
}

/** Heavy mechanical wheel: low motor rumble plus a bolt clunk at the end. */
export function playVaultUnlock(): void {
  if (isVaultMuted()) return;
  const ctx = audio();
  if (!ctx) return;

  tone(ctx, { type: "sawtooth", from: 58, to: 96, duration: 1.5, gain: 0.06 });
  tone(ctx, { type: "triangle", from: 120, to: 74, duration: 1.1, gain: 0.03, delay: 0.15 });
  tone(ctx, { type: "square", from: 180, to: 60, duration: 0.14, gain: 0.05, delay: 1.2 });
  tone(ctx, { type: "sine", from: 220, to: 140, duration: 0.5, gain: 0.025, delay: 1.45 });
}

/** Short confirmation chime on granted access; dull double-buzz on failure. */
export function playAccessResult(granted: boolean): void {
  if (isVaultMuted()) return;
  const ctx = audio();
  if (!ctx) return;

  if (granted) {
    tone(ctx, { type: "sine", from: 660, to: 660, duration: 0.18, gain: 0.045 });
    tone(ctx, { type: "sine", from: 880, to: 880, duration: 0.24, gain: 0.04, delay: 0.13 });
    tone(ctx, { type: "sine", from: 1180, to: 1180, duration: 0.3, gain: 0.028, delay: 0.26 });
  } else {
    tone(ctx, { type: "square", from: 150, to: 120, duration: 0.16, gain: 0.035 });
    tone(ctx, { type: "square", from: 120, to: 90, duration: 0.2, gain: 0.03, delay: 0.18 });
  }
}
