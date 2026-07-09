import { useState, useRef, useMemo, useEffect } from 'react';
import {
  generateMelody, computeFingerings, CURATED,
  type Level, type MelodyType,
} from '../lib/practiceMelodies';
import { playNote } from '../lib/audio';
import StaffSheet from './StaffSheet';
import type { SongNote } from '../lib/music';

interface AnnotatedNote extends SongNote {
  finger: number | null;
}

const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: 'beginner',     label: 'Beginner',     hint: 'C major, quarter & half notes' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Wider range, eighth notes' },
  { value: 'advanced',     label: 'Advanced',     hint: 'Full range, mixed rhythms' },
];

const TYPES: { value: MelodyType; label: string }[] = [
  { value: 'melody',   label: '♪ Melody' },
  { value: 'scale',    label: '↑ Scale'  },
  { value: 'arpeggio', label: '≡ Arpeggio' },
];

export default function PracticeSheet() {
  const [level, setLevel]         = useState<Level>('beginner');
  const [type, setType]           = useState<MelodyType>('melody');
  const [useCurated, setUseCurated] = useState(true);
  const [curatedIdx, setCuratedIdx] = useState(0);
  const [seed, setSeed]           = useState(1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying]     = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Derive the current song
  const song = useMemo(() => {
    if (useCurated) {
      const options = CURATED[level];
      return options[curatedIdx % options.length];
    }
    return generateMelody(level, type, seed);
  }, [level, type, useCurated, curatedIdx, seed]);

  // Annotate with fingerings
  const notes: AnnotatedNote[] = useMemo(() => {
    const fingers = computeFingerings(song.notes, level);
    return song.notes.map((n, i) => ({ ...n, finger: fingers[i] }));
  }, [song, level]);

  const subtitle = `4/4 time · ${song.bpm} BPM · play slowly and evenly`;

  // Stop playback on unmount or song change
  function stopPlayback() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setActiveIndex(-1);
    setPlaying(false);
  }

  useEffect(() => stopPlayback, []);
  useEffect(() => { stopPlayback(); }, [song]);

  function startPlayback() {
    stopPlayback();
    setPlaying(true);
    const beatMs = (60 / song.bpm) * 1000;
    let cursor = 0;
    song.notes.forEach((n, i) => {
      const t = setTimeout(() => {
        setActiveIndex(i);
        playNote(n.note, (n.beats * beatMs / 1000) * 0.92);
      }, cursor);
      timers.current.push(t);
      cursor += n.beats * beatMs;
    });
    const done = setTimeout(() => {
      setActiveIndex(-1);
      setPlaying(false);
    }, cursor + 100);
    timers.current.push(done);
  }

  function handleNewSheet() {
    stopPlayback();
    if (useCurated) {
      setCuratedIdx(i => i + 1);
    } else {
      // Use performance.now() inside handler — SSR-safe
      setSeed(Math.floor(performance.now()) % 9999 + 1);
    }
  }

  function handleLevelChange(l: Level) {
    stopPlayback();
    setLevel(l);
    setCuratedIdx(0);
    setSeed(1);
  }

  function handleTypeChange(t: MelodyType) {
    stopPlayback();
    setType(t);
    setSeed(1);
  }

  return (
    <div className="ps-root">
      {/* ── Controls ── */}
      <div className="ps-controls">
        {/* Level */}
        <div className="ps-control-group">
          <span className="ps-control-label">Skill level</span>
          <div className="ps-pill-row">
            {LEVELS.map(l => (
              <button
                key={l.value}
                className={`ps-pill ${level === l.value ? 'active' : ''}`}
                onClick={() => handleLevelChange(l.value)}
                title={l.hint}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type (only for generated) */}
        {!useCurated && (
          <div className="ps-control-group">
            <span className="ps-control-label">Type</span>
            <div className="ps-pill-row">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  className={`ps-pill ${type === t.value ? 'active' : ''}`}
                  onClick={() => handleTypeChange(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Source toggle */}
        <div className="ps-control-group">
          <span className="ps-control-label">Source</span>
          <div className="ps-pill-row">
            <button
              className={`ps-pill ${useCurated ? 'active' : ''}`}
              onClick={() => { stopPlayback(); setUseCurated(true); setCuratedIdx(0); }}
            >
              ✦ Curated
            </button>
            <button
              className={`ps-pill ${!useCurated ? 'active' : ''}`}
              onClick={() => { stopPlayback(); setUseCurated(false); setSeed(1); }}
            >
              ✦ Generated
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="ps-actions">
          <button className="ps-btn-new" onClick={handleNewSheet}>
            ↻ New Sheet
          </button>
          {!playing ? (
            <button className="ps-btn-play" onClick={startPlayback}>
              ▶ Play
            </button>
          ) : (
            <button className="ps-btn-stop" onClick={stopPlayback}>
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Sheet ── */}
      <div className="ps-sheet-wrap">
        <StaffSheet
          title={song.title}
          subtitle={subtitle}
          notes={notes}
          activeIndex={activeIndex}
        />
      </div>

      <p className="ps-hint">
        Press <strong>Play</strong> to hear the melody — each note lights up in gold as it plays.
        Use <strong>New Sheet</strong> to get a fresh exercise.
      </p>

      <style>{`
        .ps-root {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Controls */
        .ps-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem;
          align-items: flex-end;
          background: var(--paper-dark);
          border: 1.5px solid rgba(197,212,232,0.8);
          border-radius: 4px;
          padding: 1.25rem 1.5rem;
        }

        .ps-control-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .ps-control-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--pencil-mid);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'Patrick Hand', cursive;
        }

        .ps-pill-row {
          display: flex;
          gap: 0.4rem;
        }

        .ps-pill {
          padding: 0.4rem 1rem;
          border: 1.5px solid var(--border);
          border-radius: 3px;
          background: var(--paper-card);
          color: var(--pencil-mid);
          font-family: 'Patrick Hand', cursive;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.12s;
          white-space: nowrap;
        }
        .ps-pill:hover { border-color: var(--pencil-mid); color: var(--pencil); }
        .ps-pill.active {
          background: var(--pencil);
          border-color: var(--pencil);
          color: var(--paper);
          font-weight: 600;
        }

        /* Action buttons */
        .ps-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-left: auto;
        }

        .ps-btn-new {
          padding: 0.5rem 1.1rem;
          border: 1.5px solid var(--gold);
          border-radius: 3px;
          background: transparent;
          color: var(--gold);
          font-family: 'Patrick Hand', cursive;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.12s;
        }
        .ps-btn-new:hover { background: rgba(196,146,56,0.08); }

        .ps-btn-play {
          padding: 0.5rem 1.4rem;
          border: none;
          border-radius: 3px;
          background: var(--pencil);
          color: var(--paper);
          font-family: 'Patrick Hand', cursive;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.12s;
        }
        .ps-btn-play:hover { background: var(--pencil-mid); }

        .ps-btn-stop {
          padding: 0.5rem 1.4rem;
          border: none;
          border-radius: 3px;
          background: #c43030;
          color: #fff;
          font-family: 'Patrick Hand', cursive;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* Sheet */
        .ps-sheet-wrap {
          background: var(--paper-card);
          border: 1.5px solid var(--border);
          border-radius: 3px;
          padding: 1.5rem 1rem;
          box-shadow: 2px 3px 8px rgba(40,28,16,0.07);
          overflow-x: auto;
        }

        /* Hint */
        .ps-hint {
          font-size: 0.85rem;
          color: var(--pencil-mid);
          font-family: 'Patrick Hand', cursive;
        }

        @media (max-width: 640px) {
          .ps-controls { padding: 1rem; }
          .ps-actions { margin-left: 0; width: 100%; }
          .ps-btn-play, .ps-btn-stop, .ps-btn-new { flex: 1; text-align: center; }
        }
      `}</style>
    </div>
  );
}
