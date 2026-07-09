// ── Pitch map (two octaves C4–C6) ──────────────────────────────────────────
export const FREQ: Record<string, number> = {
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'D#4': 311.13,
  E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.00,
  'G#4': 415.30, A4: 440.00, 'A#4': 466.16, B4: 493.88,
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25,
  E5: 659.25, F5: 698.46, 'F#5': 739.99, G5: 783.99,
  'G#5': 830.61, A5: 880.00, 'A#5': 932.33, B5: 987.77,
  C6: 1046.50,
};

// White keys left-to-right, two octaves
export const WHITE_KEYS = [
  'C4','D4','E4','F4','G4','A4','B4',
  'C5','D5','E5','F5','G5','A5','B5',
];

// Black keys aligned to white-key indices (null = no black key between these whites)
export const BLACK_KEYS: (string | null)[] = [
  'C#4','D#4',null,'F#4','G#4','A#4',null,
  'C#5','D#5',null,'F#5','G#5','A#5',null,
];

// ── Types ──────────────────────────────────────────────────────────────────
export type SongNote = { note: string; beats: number };

export interface Song {
  id: string;
  title: string;
  bpm: number;
  notes: SongNote[];
  builtin?: boolean;
}

// ── Staff geometry ─────────────────────────────────────────────────────────
// Diatonic step from E4 (treble bottom line = step 0).
// Each step = one half-space (LINE_SPACING / 2 pixels).
// Sharps/flats share their lower natural's step (C#4 → step -2, same as C4).
export const DIATONIC_STEPS: Record<string, number> = {
  C4: -2, 'C#4': -2,
  D4: -1, 'D#4': -1,
  E4:  0,
  F4:  1, 'F#4':  1,
  G4:  2, 'G#4':  2,
  A4:  3, 'A#4':  3,
  B4:  4,
  C5:  5, 'C#5':  5,
  D5:  6, 'D#5':  6,
  E5:  7,
  F5:  8, 'F#5':  8,
  G5:  9, 'G#5':  9,
  A5: 10, 'A#5': 10,
  B5: 11,
  C6: 12,
};

export function isSharp(note: string): boolean {
  return note.includes('#');
}

/** Display letter: "C#4" → "C#", "D4" → "D" */
export function noteLetter(note: string): string {
  return note.slice(0, note.length - 1); // strip trailing octave digit
}
