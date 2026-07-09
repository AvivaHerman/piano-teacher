import { FREQ } from './music';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playNote(note: string, durationSec = 1.2): void {
  const freq = FREQ[note];
  if (!freq) return;
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  // Piano-like ADSR
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.7, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

  osc.start(now);
  osc.stop(now + durationSec + 0.05);
}
