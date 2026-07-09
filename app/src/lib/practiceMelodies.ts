import type { Song, SongNote } from './music';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type MelodyType = 'scale' | 'melody' | 'arpeggio';

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  return function () {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Level configuration ────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  beginner: {
    pool:          ['C4','D4','E4','F4','G4','A4','B4','C5'],
    arpPool:       ['C4','E4','G4','C5'],
    rhythms:       [1, 2] as number[],
    rhythmWeights: [0.8, 0.2],
    bars:          3,       // melody bars (+ 1 final whole-note bar = 4 total)
    bpm:           80,
  },
  intermediate: {
    pool:          ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'],
    arpPool:       ['C4','E4','G4','C5','E5','G5'],
    rhythms:       [0.5, 1, 2] as number[],
    rhythmWeights: [0.2, 0.65, 0.15],
    bars:          4,
    bpm:           100,
  },
  advanced: {
    pool:          ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5','C#5','F#4','G#4'],
    arpPool:       ['C4','E4','G4','C5','E5','G5','C6'],
    rhythms:       [0.5, 1, 1.5, 2] as number[],
    rhythmWeights: [0.25, 0.5, 0.1, 0.15],
    bars:          4,
    bpm:           120,
  },
};

// Diatonic index for melodic-distance calculation (ignores accidentals)
const NOTE_INDEX: Record<string, number> = {
  C4:0, D4:1, E4:2, F4:3, G4:4, A4:5, B4:6,
  C5:7, D5:8, E5:9, F5:10, G5:11, A5:12, B5:13, C6:14,
  'C#4':0,'D#4':1,'F#4':3,'G#4':4,'A#4':5,
  'C#5':7,'D#5':8,'F#5':10,'G#5':11,'A#5':12,
};

function weightedPick<T>(rand: () => number, items: T[], weights: number[]): T {
  const r = rand();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r < cum) return items[i];
  }
  return items[items.length - 1];
}

// ── Generator ─────────────────────────────────────────────────────────────
export function generateMelody(level: Level, type: MelodyType, seed: number): Song {
  const cfg = LEVEL_CONFIG[level];
  const rand = mulberry32(seed);
  const beatsPerBar = 4;
  const melodyBeats = cfg.bars * beatsPerBar; // beats before the final hold
  const tonic = cfg.pool[0]; // C4

  const notes: SongNote[] = [];
  let beatsUsed = 0;

  if (type === 'scale') {
    // Ping-pong ascending/descending through pool
    const pool = cfg.pool;
    let idx = 0, dir = 1;
    while (beatsUsed < melodyBeats) {
      const remaining = melodyBeats - beatsUsed;
      const beat = Math.min(1, remaining);
      notes.push({ note: pool[idx], beats: beat });
      beatsUsed += beat;
      idx += dir;
      if (idx >= pool.length) { idx = pool.length - 2; dir = -1; }
      if (idx < 0)            { idx = 1;               dir = 1;  }
    }
  } else if (type === 'arpeggio') {
    const pool = cfg.arpPool;
    let idx = 0;
    while (beatsUsed < melodyBeats) {
      const remaining = melodyBeats - beatsUsed;
      const beat = Math.min(1, remaining);
      notes.push({ note: pool[idx % pool.length], beats: beat });
      beatsUsed += beat;
      idx++;
    }
  } else {
    // Stepwise melody
    let currentNote = tonic;
    while (beatsUsed < melodyBeats) {
      const remaining = melodyBeats - beatsUsed;
      const nearEnd = remaining <= beatsPerBar;

      // Pick rhythm
      let beats = weightedPick(rand, cfg.rhythms, cfg.rhythmWeights);
      while (beats > remaining && beats > 0.5) beats /= 2;
      beats = Math.min(beats, remaining);
      if (beats <= 0) beats = 1;

      // Pick next note
      const currentIdx = NOTE_INDEX[currentNote] ?? 0;
      let candidates: string[];
      if (nearEnd) {
        // Guide back to tonic
        candidates = cfg.pool.filter(n => {
          const d = Math.abs((NOTE_INDEX[n] ?? 0) - (NOTE_INDEX[tonic] ?? 0));
          return d <= 2;
        });
      } else {
        const stepwise = cfg.pool.filter(n => {
          const d = Math.abs((NOTE_INDEX[n] ?? 0) - currentIdx);
          return d >= 1 && d <= 3;
        });
        const leaps = cfg.pool.filter(n => {
          const d = Math.abs((NOTE_INDEX[n] ?? 0) - currentIdx);
          return d > 3;
        });
        candidates = rand() < 0.8 && stepwise.length > 0
          ? stepwise
          : leaps.length > 0 ? leaps : cfg.pool;
      }
      if (candidates.length === 0) candidates = cfg.pool;
      const next = candidates[Math.floor(rand() * candidates.length)];
      notes.push({ note: next, beats });
      beatsUsed += beats;
      currentNote = next;
    }
  }

  // Always end with a held whole note on the tonic
  notes.push({ note: tonic, beats: 4 });

  const titlesBySeed: Record<Level, string[]> = {
    beginner:     ['Morning Walk', 'Stepping Stones', 'First Steps', 'Gentle Path'],
    intermediate: ['Mountain Path', 'Evening Stroll', 'Flowing River', 'Quiet Garden'],
    advanced:     ['Forest Dance', 'Horizon Line', 'Storm & Calm', 'Autumn Study'],
  };
  const titleList = titlesBySeed[level];
  const typeLabel: Record<MelodyType, string> = {
    scale: 'scale', melody: 'melody', arpeggio: 'arpeggio',
  };
  const title = `${titleList[seed % titleList.length]} — ${level} ${typeLabel[type]}`;

  return {
    id:    `${level}-${type}-${seed}`,
    title,
    bpm:   cfg.bpm,
    notes,
  };
}

// ── Fingering ─────────────────────────────────────────────────────────────
// C-position rule for right hand: C=1 D=2 E=3 F=4 G=5, then thumb crosses to A/C.
const FINGER_MAP: Record<string, number> = {
  C4:1, D4:2, E4:3, F4:4, G4:5, A4:4, B4:5,
  C5:1, D5:2, E5:3, F5:4, G5:5,
};

export function computeFingerings(notes: SongNote[], level: Level): (number | null)[] {
  if (level === 'advanced') return notes.map(() => null); // skip for advanced
  return notes.map(n => {
    // Strip sharp for lookup
    const base = n.note.replace('#', '');
    return FINGER_MAP[base] ?? FINGER_MAP[n.note] ?? null;
  });
}

// ── Curated melodies ──────────────────────────────────────────────────────
export const CURATED: Record<Level, Song[]> = {
  beginner: [
    {
      id: 'morning-walk',
      title: 'Morning Walk — C major',
      bpm: 88,
      notes: [
        // Bar 1: ascending steps
        {note:'C4',beats:1},{note:'D4',beats:1},{note:'E4',beats:1},{note:'F4',beats:1},
        // Bar 2: peak and back
        {note:'G4',beats:1},{note:'F4',beats:1},{note:'E4',beats:1},{note:'D4',beats:1},
        // Bar 3: gentle landing
        {note:'E4',beats:2},{note:'G4',beats:2},
        // Bar 4: hold
        {note:'C4',beats:4},
      ],
    },
    {
      id: 'first-steps',
      title: 'First Steps — C major',
      bpm: 80,
      notes: [
        // Bar 1
        {note:'C4',beats:1},{note:'C4',beats:1},{note:'G4',beats:1},{note:'G4',beats:1},
        // Bar 2
        {note:'A4',beats:1},{note:'A4',beats:1},{note:'G4',beats:2},
        // Bar 3
        {note:'F4',beats:1},{note:'E4',beats:1},{note:'D4',beats:2},
        // Bar 4: hold
        {note:'C4',beats:4},
      ],
    },
  ],
  intermediate: [
    {
      id: 'ode-joy',
      title: 'Ode to Joy — C major',
      bpm: 100,
      notes: [
        // Bar 1
        {note:'E4',beats:1},{note:'E4',beats:1},{note:'F4',beats:1},{note:'G4',beats:1},
        // Bar 2
        {note:'G4',beats:1},{note:'F4',beats:1},{note:'E4',beats:1},{note:'D4',beats:1},
        // Bar 3
        {note:'C4',beats:1},{note:'C4',beats:1},{note:'D4',beats:1},{note:'E4',beats:1},
        // Bar 4
        {note:'E4',beats:2},{note:'D4',beats:2},
        // Bar 5
        {note:'E4',beats:1},{note:'E4',beats:1},{note:'F4',beats:1},{note:'G4',beats:1},
        // Bar 6
        {note:'G4',beats:1},{note:'F4',beats:1},{note:'E4',beats:1},{note:'D4',beats:1},
        // Bar 7
        {note:'C4',beats:1},{note:'C4',beats:1},{note:'D4',beats:1},{note:'E4',beats:1},
        // Bar 8: hold
        {note:'C4',beats:4},
      ],
    },
    {
      id: 'canticle',
      title: 'Canticle — C major',
      bpm: 96,
      notes: [
        // Bar 1
        {note:'C5',beats:1},{note:'B4',beats:1},{note:'A4',beats:1},{note:'G4',beats:1},
        // Bar 2
        {note:'F4',beats:2},{note:'E4',beats:2},
        // Bar 3
        {note:'G4',beats:1},{note:'A4',beats:1},{note:'B4',beats:1},{note:'C5',beats:1},
        // Bar 4
        {note:'D5',beats:2},{note:'E5',beats:2},
        // Bar 5
        {note:'F5',beats:1},{note:'E5',beats:1},{note:'D5',beats:1},{note:'C5',beats:1},
        // Bar 6: hold
        {note:'C5',beats:4},
      ],
    },
  ],
  advanced: [
    {
      id: 'horizon',
      title: 'Horizon Line — extended C major',
      bpm: 120,
      notes: [
        // Bar 1: ascending arpeggio
        {note:'C4',beats:0.5},{note:'E4',beats:0.5},{note:'G4',beats:0.5},{note:'C5',beats:0.5},
        {note:'E5',beats:0.5},{note:'C5',beats:0.5},{note:'G4',beats:0.5},{note:'E4',beats:0.5},
        // Bar 2: upper melody
        {note:'A4',beats:0.5},{note:'C5',beats:0.5},{note:'E5',beats:0.5},{note:'A5',beats:0.5},
        {note:'G5',beats:1},{note:'F5',beats:1},
        // Bar 3: descent
        {note:'E5',beats:0.5},{note:'D5',beats:0.5},{note:'C5',beats:0.5},{note:'B4',beats:0.5},
        {note:'A4',beats:2},
        // Bar 4: climb
        {note:'G4',beats:0.5},{note:'A4',beats:0.5},{note:'B4',beats:0.5},{note:'C5',beats:0.5},
        {note:'D5',beats:0.5},{note:'E5',beats:0.5},{note:'F5',beats:0.5},{note:'G5',beats:0.5},
        // Bar 5: resolution
        {note:'E5',beats:2},{note:'C5',beats:2},
        // Bar 6: hold
        {note:'C5',beats:4},
      ],
    },
    {
      id: 'etude-c',
      title: 'Étude in C — chromatic touches',
      bpm: 128,
      notes: [
        // Bar 1
        {note:'C4',beats:0.5},{note:'D4',beats:0.5},{note:'E4',beats:0.5},{note:'F4',beats:0.5},
        {note:'G4',beats:0.5},{note:'F4',beats:0.5},{note:'E4',beats:0.5},{note:'D4',beats:0.5},
        // Bar 2
        {note:'E4',beats:0.5},{note:'G4',beats:0.5},{note:'C5',beats:0.5},{note:'E5',beats:0.5},
        {note:'D5',beats:0.5},{note:'C5',beats:0.5},{note:'B4',beats:0.5},{note:'A4',beats:0.5},
        // Bar 3
        {note:'F4',beats:0.5},{note:'A4',beats:0.5},{note:'C5',beats:0.5},{note:'F5',beats:0.5},
        {note:'E5',beats:0.5},{note:'D5',beats:0.5},{note:'C5',beats:0.5},{note:'B4',beats:0.5},
        // Bar 4
        {note:'G4',beats:0.5},{note:'B4',beats:0.5},{note:'D5',beats:0.5},{note:'G5',beats:0.5},
        {note:'F5',beats:1},{note:'E5',beats:1},
        // Bar 5
        {note:'D5',beats:1},{note:'C5',beats:1},{note:'B4',beats:2},
        // Bar 6: hold
        {note:'C5',beats:4},
      ],
    },
  ],
};
