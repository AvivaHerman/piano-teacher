import { useState, useEffect, useRef, useCallback } from 'react';

// ── note frequencies (two octaves: C4–B5) ──────────────────────────────────
const FREQ: Record<string, number> = {
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'D#4': 311.13,
  E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.00,
  'G#4': 415.30, A4: 440.00, 'A#4': 466.16, B4: 493.88,
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25,
  E5: 659.25, F5: 698.46, 'F#5': 739.99, G5: 783.99,
  'G#5': 830.61, A5: 880.00, 'A#5': 932.33, B5: 987.77,
};

// White keys in order across two octaves
const WHITE_KEYS = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5'];
// Black keys: index within white-key positions (gaps are null)
const BLACK_KEYS: (string | null)[] = [
  'C#4','D#4',null,'F#4','G#4','A#4',null,
  'C#5','D#5',null,'F#5','G#5','A#5',null,
];

// ── built-in songs ──────────────────────────────────────────────────────────
type SongNote = { note: string; beats: number };

interface Song {
  id: string;
  title: string;
  bpm: number;
  notes: SongNote[];
  builtin?: boolean;
}

const BUILTIN_SONGS: Song[] = [
  {
    id: 'twinkle',
    title: '⭐ Twinkle Twinkle Little Star',
    bpm: 110,
    builtin: true,
    notes: [
      {note:'C4',beats:1},{note:'C4',beats:1},{note:'G4',beats:1},{note:'G4',beats:1},
      {note:'A4',beats:1},{note:'A4',beats:1},{note:'G4',beats:2},
      {note:'F4',beats:1},{note:'F4',beats:1},{note:'E4',beats:1},{note:'E4',beats:1},
      {note:'D4',beats:1},{note:'D4',beats:1},{note:'C4',beats:2},
      {note:'G4',beats:1},{note:'G4',beats:1},{note:'F4',beats:1},{note:'F4',beats:1},
      {note:'E4',beats:1},{note:'E4',beats:1},{note:'D4',beats:2},
      {note:'G4',beats:1},{note:'G4',beats:1},{note:'F4',beats:1},{note:'F4',beats:1},
      {note:'E4',beats:1},{note:'E4',beats:1},{note:'D4',beats:2},
      {note:'C4',beats:1},{note:'C4',beats:1},{note:'G4',beats:1},{note:'G4',beats:1},
      {note:'A4',beats:1},{note:'A4',beats:1},{note:'G4',beats:2},
      {note:'F4',beats:1},{note:'F4',beats:1},{note:'E4',beats:1},{note:'E4',beats:1},
      {note:'D4',beats:1},{note:'D4',beats:1},{note:'C4',beats:2},
    ],
  },
  {
    id: 'mary',
    title: '🐑 Mary Had a Little Lamb',
    bpm: 120,
    builtin: true,
    notes: [
      {note:'E4',beats:1},{note:'D4',beats:1},{note:'C4',beats:1},{note:'D4',beats:1},
      {note:'E4',beats:1},{note:'E4',beats:1},{note:'E4',beats:2},
      {note:'D4',beats:1},{note:'D4',beats:1},{note:'D4',beats:2},
      {note:'E4',beats:1},{note:'G4',beats:1},{note:'G4',beats:2},
      {note:'E4',beats:1},{note:'D4',beats:1},{note:'C4',beats:1},{note:'D4',beats:1},
      {note:'E4',beats:1},{note:'E4',beats:1},{note:'E4',beats:1},{note:'E4',beats:1},
      {note:'D4',beats:1},{note:'D4',beats:1},{note:'E4',beats:1},{note:'D4',beats:1},
      {note:'C4',beats:2},
    ],
  },
];

// ── audio ───────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function playNote(note: string, durationSec = 1.2) {
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

// ── keyboard mapping (z–m for white keys) ──────────────────────────────────
const KEY_MAP: Record<string, string> = {
  z:'C4', s:'C#4', x:'D4', d:'D#4', c:'E4', v:'F4',
  g:'F#4', b:'G4', h:'G#4', n:'A4', j:'A#4', m:'B4',
};

// ── localStorage song persistence ──────────────────────────────────────────
const LS_KEY = 'pianoteacher_member_songs';
function loadMemberSongs(): Song[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function saveMemberSongs(songs: Song[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(songs));
}

// ── Add Song Modal ──────────────────────────────────────────────────────────
function AddSongModal({ onSave, onClose }: { onSave: (s: Song) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('100');
  const [notesRaw, setNotesRaw] = useState('');
  const [error, setError] = useState('');

  const noteNames = [...WHITE_KEYS, ...Object.keys(FREQ).filter(k => k.includes('#'))].sort();

  function handleSave() {
    if (!title.trim()) { setError('Please enter a song title.'); return; }
    const parts = notesRaw.toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (parts.length < 2) { setError('Enter at least 2 notes.'); return; }
    const parsed: SongNote[] = [];
    for (const p of parts) {
      if (!FREQ[p]) { setError(`Unknown note: "${p}". Use e.g. C4, D#4, A5`); return; }
      parsed.push({ note: p, beats: 1 });
    }
    onSave({
      id: `custom-${Date.now()}`,
      title: title.trim(),
      bpm: Math.max(40, Math.min(200, parseInt(bpm) || 100)),
      notes: parsed,
      builtin: false,
    });
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Add Your Song</h2>
        <p className="modal-hint">Enter notes separated by spaces or commas, e.g. <code>C4 D4 E4 F4 G4</code></p>
        <div className="modal-form">
          <div className="form-group">
            <label>Song Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Custom Song" />
          </div>
          <div className="form-group">
            <label>BPM (40–200)</label>
            <input type="number" value={bpm} min={40} max={200} onChange={e => setBpm(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Notes *</label>
            <textarea rows={3} value={notesRaw} onChange={e => setNotesRaw(e.target.value)}
              placeholder="C4 D4 E4 F4 G4 A4 B4 C5" />
            <small>Available notes: {Object.keys(FREQ).join(' · ')}</small>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button className="btn btn-outline-dark" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Song</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────────────
export default function PianoGame() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedId, setSelectedId] = useState<string>('twinkle');
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(-1);
  const [showAddModal, setShowAddModal] = useState(false);
  const playTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeNoteRef = useRef<HTMLDivElement>(null);

  // Merge built-in + member songs on mount
  useEffect(() => {
    setSongs([...BUILTIN_SONGS, ...loadMemberSongs()]);
  }, []);

  const selectedSong = songs.find(s => s.id === selectedId) ?? songs[0];

  // ── playback ──────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    playTimers.current.forEach(clearTimeout);
    playTimers.current = [];
    setPlaying(false);
    setPlayIndex(-1);
    setActiveKeys(new Set());
  }, []);

  function startPlayback() {
    if (!selectedSong) return;
    stopPlayback();
    setPlaying(true);
    const beatMs = (60 / selectedSong.bpm) * 1000;
    let cursor = 0;
    selectedSong.notes.forEach((n, i) => {
      const t = playTimers.current[playTimers.current.length] = setTimeout(() => {
        setPlayIndex(i);
        setActiveKeys(new Set([n.note]));
        playNote(n.note, (n.beats * beatMs) / 1000 * 0.9);
      }, cursor);
      playTimers.current.push(t as any);
      cursor += n.beats * beatMs;
    });
    const done = setTimeout(() => {
      setPlaying(false);
      setPlayIndex(-1);
      setActiveKeys(new Set());
    }, cursor);
    playTimers.current.push(done as any);
  }

  // ── keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const note = KEY_MAP[e.key.toLowerCase()];
      if (!note) return;
      setActiveKeys(prev => new Set([...prev, note]));
      playNote(note);
    }
    function onKeyUp(e: KeyboardEvent) {
      const note = KEY_MAP[e.key.toLowerCase()];
      if (!note) return;
      setActiveKeys(prev => { const s = new Set(prev); s.delete(note); return s; });
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  // Auto-scroll the active note pill into view
  useEffect(() => {
    activeNoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [playIndex]);

  // ── member song management ────────────────────────────────────────────────
  function handleAddSong(song: Song) {
    const memberSongs = loadMemberSongs();
    const updated = [...memberSongs, song];
    saveMemberSongs(updated);
    setSongs([...BUILTIN_SONGS, ...updated]);
    setSelectedId(song.id);
    setShowAddModal(false);
  }

  function handleDeleteSong(id: string) {
    const updated = loadMemberSongs().filter(s => s.id !== id);
    saveMemberSongs(updated);
    setSongs([...BUILTIN_SONGS, ...updated]);
    if (selectedId === id) setSelectedId('twinkle');
  }

  // ── piano key press ───────────────────────────────────────────────────────
  function handleKeyPress(note: string) {
    setActiveKeys(prev => new Set([...prev, note]));
    playNote(note);
    setTimeout(() => setActiveKeys(prev => { const s = new Set(prev); s.delete(note); return s; }), 300);
  }

  const whiteKeyWidth = 54;
  const totalWidth = WHITE_KEYS.length * whiteKeyWidth + (WHITE_KEYS.length - 1) * 3;

  return (
    <div className="game-root">
      {/* Song selector bar */}
      <div className="song-bar">
        <div className="songs-scroll">
          {songs.map(song => (
            <div key={song.id} className={`song-chip ${selectedId === song.id ? 'active' : ''}`}>
              <button className="song-name" onClick={() => { stopPlayback(); setSelectedId(song.id); }}>
                {song.title}
              </button>
              {!song.builtin && (
                <button className="song-delete" title="Remove" onClick={() => handleDeleteSong(song.id)}>✕</button>
              )}
            </div>
          ))}
        </div>
        <button className="btn-add-song" onClick={() => setShowAddModal(true)} title="Add your own song">
          + Add Song
        </button>
      </div>

      {/* Playback controls */}
      {selectedSong && (
        <div className="playback-row">
          <span className="now-playing">
            {playing ? `▶ Playing: ${selectedSong.title}` : selectedSong.title}
          </span>
          {!playing ? (
            <button className="btn-play" onClick={startPlayback}>▶ Play Song</button>
          ) : (
            <button className="btn-stop" onClick={stopPlayback}>⏹ Stop</button>
          )}
          <span className="bpm-badge">{selectedSong.bpm} BPM</span>
        </div>
      )}

      {/* Piano keyboard */}
      <div className="keyboard-wrapper">
        <div className="keyboard" style={{ width: totalWidth, position: 'relative', height: 180 }}>
          {/* White keys */}
          {WHITE_KEYS.map((note, i) => (
            <button
              key={note}
              className={`key-white ${activeKeys.has(note) ? 'pressed' : ''}`}
              style={{ left: i * (whiteKeyWidth + 3) }}
              onMouseDown={() => handleKeyPress(note)}
              onTouchStart={e => { e.preventDefault(); handleKeyPress(note); }}
              aria-label={note}
            >
              <span className="key-label">{note}</span>
            </button>
          ))}
          {/* Black keys */}
          {BLACK_KEYS.map((note, i) => {
            if (!note) return null;
            // Position: between white keys i and i+1
            const leftEdge = i * (whiteKeyWidth + 3) + whiteKeyWidth * 0.62;
            return (
              <button
                key={note}
                className={`key-black ${activeKeys.has(note) ? 'pressed' : ''}`}
                style={{ left: leftEdge }}
                onMouseDown={() => handleKeyPress(note)}
                onTouchStart={e => { e.preventDefault(); handleKeyPress(note); }}
                aria-label={note}
              />
            );
          })}
        </div>
      </div>

      {/* Note strip */}
      {selectedSong && (
        <div className="note-strip">
          {selectedSong.notes.map((n, i) => (
            <div
              key={i}
              ref={i === playIndex ? activeNoteRef : undefined}
              className={`note-pill ${i === playIndex ? 'note-pill--active' : ''} ${i < playIndex ? 'note-pill--done' : ''}`}
            >
              {n.note}
            </div>
          ))}
        </div>
      )}

      <p className="keyboard-hint">
        Tip: Use your keyboard too — <kbd>z</kbd> to <kbd>m</kbd> for white keys, <kbd>s d f g h j</kbd> for black keys.
      </p>

      {showAddModal && <AddSongModal onSave={handleAddSong} onClose={() => setShowAddModal(false)} />}

      <style>{`
        .game-root { display: flex; flex-direction: column; gap: 1.25rem; }

        /* song bar */
        .song-bar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .songs-scroll { display: flex; flex-wrap: wrap; gap: 0.5rem; flex: 1; }

        .song-chip {
          display: flex; align-items: center;
          border: 1.5px solid var(--border); border-radius: 99px;
          background: var(--card-bg); overflow: hidden;
          transition: border-color 0.15s;
        }
        .song-chip.active { border-color: var(--gold); background: rgba(201,168,76,0.08); }

        .song-name {
          background: none; border: none; cursor: pointer; font-family: inherit;
          font-size: 0.88rem; font-weight: 500; padding: 0.4rem 0.85rem; color: var(--text);
        }
        .song-delete {
          background: none; border: none; border-left: 1px solid var(--border);
          cursor: pointer; padding: 0.4rem 0.5rem; color: var(--text-muted);
          font-size: 0.75rem;
        }
        .song-delete:hover { color: #e53e3e; background: #fff5f5; }

        .btn-add-song {
          white-space: nowrap; padding: 0.5rem 1rem; border-radius: 99px;
          border: 1.5px dashed var(--gold); background: rgba(201,168,76,0.06);
          color: var(--gold); font-size: 0.88rem; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: all 0.15s;
        }
        .btn-add-song:hover { background: rgba(201,168,76,0.14); }

        /* playback */
        .playback-row {
          display: flex; align-items: center; gap: 1rem;
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 0.85rem 1.25rem; flex-wrap: wrap;
        }
        .now-playing { flex: 1; font-weight: 600; font-size: 0.95rem; }
        .btn-play {
          background: #16a34a; color: #fff; border: none; border-radius: 8px;
          padding: 0.5rem 1.25rem; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: background 0.15s;
        }
        .btn-play:hover { background: #15803d; }
        .btn-stop {
          background: #dc2626; color: #fff; border: none; border-radius: 8px;
          padding: 0.5rem 1.25rem; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .bpm-badge {
          font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
          background: var(--bg); border: 1px solid var(--border);
          padding: 0.2rem 0.6rem; border-radius: 99px;
        }

        /* keyboard */
        .keyboard-wrapper { overflow-x: auto; padding-bottom: 0.5rem; }
        .keyboard { height: 180px; }

        .key-white {
          position: absolute; bottom: 0;
          width: 54px; height: 170px;
          background: linear-gradient(to bottom, #f8f8f0, #fffff0);
          border: 1.5px solid #bbb; border-radius: 0 0 7px 7px;
          cursor: pointer; display: flex; align-items: flex-end; justify-content: center;
          padding-bottom: 8px; z-index: 1; transition: background 0.05s;
          font-family: inherit;
        }
        .key-white:hover { background: linear-gradient(to bottom, #f0f0e0, #f8f8e8); }
        .key-white.pressed { background: linear-gradient(to bottom, #c9a84c40, #e8c96a40); border-color: var(--gold); }

        .key-label { font-size: 0.65rem; font-weight: 600; color: #888; user-select: none; }

        .key-black {
          position: absolute; top: 0;
          width: 34px; height: 108px;
          background: linear-gradient(to bottom, #222, #111);
          border-radius: 0 0 5px 5px; border: 1px solid #000;
          cursor: pointer; z-index: 2; transition: background 0.05s;
          font-family: inherit;
        }
        .key-black:hover { background: linear-gradient(to bottom, #333, #1a1a1a); }
        .key-black.pressed { background: linear-gradient(to bottom, #5a3e10, #3d2a0a); }

        /* note strip */
        .note-strip {
          display: flex; gap: 5px; overflow-x: auto; padding: 0.5rem 0.25rem;
          scrollbar-width: thin; scrollbar-color: var(--border) transparent;
          border: 1px solid var(--border); border-radius: var(--radius);
          background: var(--bg);
        }
        .note-strip::-webkit-scrollbar { height: 4px; }
        .note-strip::-webkit-scrollbar-track { background: transparent; }
        .note-strip::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .note-pill {
          flex-shrink: 0;
          min-width: 38px;
          padding: 0.3rem 0.5rem;
          border-radius: 6px;
          border: 1.5px solid var(--border);
          background: var(--card-bg);
          font-size: 0.72rem;
          font-weight: 700;
          font-family: monospace;
          color: var(--text-muted);
          text-align: center;
          transition: all 0.12s;
          user-select: none;
        }
        .note-pill--done {
          background: #f0faf0;
          border-color: #a8d5a2;
          color: #4a8c4a;
        }
        .note-pill--active {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--ebony);
          transform: scale(1.18);
          box-shadow: 0 2px 8px rgba(201,168,76,0.45);
          font-size: 0.8rem;
        }

        /* hint */
        .keyboard-hint { font-size: 0.82rem; color: var(--text-muted); }
        kbd {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 4px; padding: 0.1rem 0.35rem;
          font-size: 0.8rem; font-family: monospace;
        }

        /* modal */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 500; padding: 1rem;
        }
        .modal {
          background: var(--card-bg); border-radius: var(--radius);
          padding: 2rem; max-width: 480px; width: 100%; position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }
        .modal-close {
          position: absolute; top: 1rem; right: 1rem; background: none;
          border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-muted);
        }
        .modal h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .modal-hint { color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem; }
        .modal-hint code { background: var(--bg); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }

        .modal-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.3rem; }
        .form-group label { font-size: 0.83rem; font-weight: 600; }
        .form-group input, .form-group textarea {
          padding: 0.6rem 0.8rem; border: 1.5px solid var(--border);
          border-radius: 8px; font-size: 0.9rem; font-family: inherit;
          background: var(--bg); color: var(--text);
        }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--gold); }
        .form-group small { font-size: 0.75rem; color: var(--text-muted); }
        .form-error { color: #dc2626; font-size: 0.85rem; }

        .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
        .btn {
          padding: 0.65rem 1.4rem; border-radius: 8px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; font-family: inherit;
        }
        .btn-primary { background: var(--gold); color: var(--ebony); }
        .btn-primary:hover { background: var(--gold-light); }
        .btn-outline-dark { background: none; border: 1.5px solid var(--border); color: var(--text); }
        .btn-outline-dark:hover { background: var(--bg); }
      `}</style>
    </div>
  );
}
