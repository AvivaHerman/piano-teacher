import { DIATONIC_STEPS, noteLetter, isSharp } from '../lib/music';
import type { SongNote } from '../lib/music';

// ── SVG constants ──────────────────────────────────────────────────────────
const LINE_SPACING = 14;   // px between staff lines
const HALF_LINE = 7;       // LINE_SPACING / 2
const STAFF_LINES = 5;
const STAFF_HEIGHT = (STAFF_LINES - 1) * LINE_SPACING; // 56px
const TOP_STEP = 8;        // F5 = top staff line step index

const NOTE_UNIT = 48;      // px per quarter-note beat
const MARGIN_LEFT = 82;    // left margin for clef + time signature
const MARGIN_RIGHT = 24;
const BARS_PER_ROW = 4;
const BAR_GAP = 4;         // extra px after bar line

const ROW_PAD_TOP = 72;    // room for finger numbers above staff
const ROW_PAD_BOT = 38;    // room for note names below staff
const ROW_H = ROW_PAD_TOP + STAFF_HEIGHT + ROW_PAD_BOT;

const NOTE_RX = 7;         // notehead horizontal radius
const NOTE_RY = 5;         // notehead vertical radius
const STEM_LEN = 36;

const PENCIL = '#1a150e';
const GOLD   = '#c49238';
const PAPER  = '#fefcf5';

// ── Types ──────────────────────────────────────────────────────────────────
interface AnnotatedNote extends SongNote {
  finger: number | null;
}

interface StaffSheetProps {
  title: string;
  subtitle?: string;
  notes: AnnotatedNote[];
  activeIndex: number;
  beatsPerBar?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function staffTop(row: number): number {
  return row * ROW_H + ROW_PAD_TOP;
}

function noteY(step: number, row: number): number {
  return staffTop(row) + (TOP_STEP - step) * HALF_LINE;
}

// Group notes into bars (each bar = beatsPerBar beats)
function makeBars(notes: AnnotatedNote[], beatsPerBar: number): AnnotatedNote[][] {
  const bars: AnnotatedNote[][] = [];
  let bar: AnnotatedNote[] = [];
  let barBeats = 0;
  for (const n of notes) {
    bar.push(n);
    barBeats += n.beats;
    if (barBeats >= beatsPerBar) {
      bars.push(bar);
      bar = [];
      barBeats = 0;
    }
  }
  if (bar.length > 0) bars.push(bar);
  return bars;
}

// Width of a bar in pixels (sum of note durations × NOTE_UNIT)
function barWidth(bar: AnnotatedNote[]): number {
  return bar.reduce((sum, n) => sum + n.beats * NOTE_UNIT, 0);
}

// ── Sub-renders ────────────────────────────────────────────────────────────
function StaffLines({ row, totalWidth }: { row: number; totalWidth: number }) {
  const top = staffTop(row);
  return (
    <>
      {Array.from({ length: STAFF_LINES }, (_, i) => (
        <line
          key={i}
          x1={MARGIN_LEFT}  y1={top + i * LINE_SPACING}
          x2={totalWidth - MARGIN_RIGHT} y2={top + i * LINE_SPACING}
          stroke={PENCIL} strokeWidth={1} strokeLinecap="round"
          opacity={0.85}
        />
      ))}
    </>
  );
}

function TrebleClef({ row }: { row: number }) {
  const top = staffTop(row);
  // The 𝄞 glyph spans roughly 9 half-steps tall; anchor y at G4 (step 2, 3rd line from bottom)
  const y = top + (TOP_STEP - 2) * HALF_LINE + 20; // anchor near G4 line, shift down
  return (
    <text
      x={10} y={y}
      fontSize={LINE_SPACING * 7.2}
      fontFamily="serif"
      fill={PENCIL}
      opacity={0.9}
    >
      𝄞
    </text>
  );
}

function TimeSignature({ row }: { row: number }) {
  const top = staffTop(row);
  const fs = LINE_SPACING * 2.1;
  const x = 61;
  return (
    <>
      <text x={x} y={top + LINE_SPACING * 1.4} fontSize={fs} fontFamily="'Caveat', serif" fontWeight="700" fill={PENCIL} textAnchor="middle">{4}</text>
      <text x={x} y={top + LINE_SPACING * 3.3} fontSize={fs} fontFamily="'Caveat', serif" fontWeight="700" fill={PENCIL} textAnchor="middle">{4}</text>
    </>
  );
}

function LedgerLines({ step, cx, row }: { step: number; cx: number; row: number }) {
  const lines: JSX.Element[] = [];
  const lw = NOTE_RX + 5;
  if (step <= -2) {
    // One or more ledger lines below the staff
    for (let s = -2; s >= step; s -= 2) {
      const y = noteY(s, row);
      lines.push(
        <line key={s} x1={cx - lw} y1={y} x2={cx + lw} y2={y}
              stroke={PENCIL} strokeWidth={1.2} strokeLinecap="round" />
      );
    }
  }
  if (step >= TOP_STEP + 2) {
    for (let s = TOP_STEP + 2; s <= step; s += 2) {
      const y = noteY(s, row);
      lines.push(
        <line key={s} x1={cx - lw} y1={y} x2={cx + lw} y2={y}
              stroke={PENCIL} strokeWidth={1.2} strokeLinecap="round" />
      );
    }
  }
  return <>{lines}</>;
}

interface NoteGlyphProps {
  note: AnnotatedNote;
  cx: number;
  row: number;
  globalIndex: number;
  activeIndex: number;
}

function NoteGlyph({ note, cx, row, globalIndex, activeIndex }: NoteGlyphProps) {
  const step = DIATONIC_STEPS[note.note] ?? 0;
  const cy = noteY(step, row);
  const isActive = globalIndex === activeIndex;
  const color = isActive ? GOLD : PENCIL;
  const isWhole = note.beats >= 4;
  const isHalf  = note.beats === 2 || note.beats === 1.5;
  const isEighth = note.beats <= 0.5;
  const filled = !isWhole && !isHalf;

  // Stem: up if below middle line (step 4), else down
  const stemUp = step < 4;
  const stemX  = stemUp ? cx + NOTE_RX - 1 : cx - NOTE_RX + 1;
  const stemY1 = stemUp ? cy - 2 : cy + 2;
  const stemY2 = stemUp ? cy - STEM_LEN : cy + STEM_LEN;

  const sTop = staffTop(row);
  const fingerY = sTop - 12;
  const letterY = sTop + STAFF_HEIGHT + 22;
  const letter = noteLetter(note.note);
  const sharp = isSharp(note.note);

  return (
    <g>
      <LedgerLines step={step} cx={cx} row={row} />

      {/* Accidental */}
      {sharp && (
        <text x={cx - NOTE_RX - 7} y={cy + 4} fontSize={11}
              fontFamily="serif" fill={color} textAnchor="middle">♯</text>
      )}

      {/* Note head */}
      <ellipse
        cx={cx} cy={cy}
        rx={NOTE_RX} ry={NOTE_RY}
        fill={filled ? color : PAPER}
        stroke={color}
        strokeWidth={isWhole ? 1.8 : 1.5}
        transform={`rotate(-12, ${cx}, ${cy})`}
      />

      {/* Stem (not for whole notes) */}
      {!isWhole && (
        <line x1={stemX} y1={stemY1} x2={stemX} y2={stemY2}
              stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      )}

      {/* Flag for eighth notes */}
      {isEighth && (
        <path
          d={stemUp
            ? `M ${stemX} ${stemY2} C ${stemX + 14} ${stemY2 + 8}, ${stemX + 16} ${stemY2 + 18}, ${stemX + 6} ${stemY2 + 24}`
            : `M ${stemX} ${stemY2} C ${stemX + 14} ${stemY2 - 8}, ${stemX + 16} ${stemY2 - 18}, ${stemX + 6} ${stemY2 - 24}`
          }
          fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round"
        />
      )}

      {/* Finger number */}
      {note.finger != null && (
        <text x={cx} y={fingerY} fontSize={12} fontFamily="'Caveat', cursive"
              fontWeight="700" fill={isActive ? GOLD : '#6b5a48'} textAnchor="middle">
          {note.finger}
        </text>
      )}

      {/* Note letter below staff */}
      <text x={cx} y={letterY} fontSize={11} fontFamily="'Caveat', cursive"
            fill={isActive ? GOLD : '#6b5a48'} textAnchor="middle">
        {letter}{isWhole ? ' (hold)' : ''}
      </text>
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function StaffSheet({ title, subtitle, notes, activeIndex, beatsPerBar = 4 }: StaffSheetProps) {
  if (notes.length === 0) return null;

  const bars = makeBars(notes, beatsPerBar);
  const totalBars = bars.length;
  const numRows = Math.ceil(totalBars / BARS_PER_ROW);

  // Calculate SVG width from first row of bars
  const firstRowBars = bars.slice(0, BARS_PER_ROW);
  const contentWidth = firstRowBars.reduce((sum, b) => sum + barWidth(b) + BAR_GAP, 0);
  const svgWidth = MARGIN_LEFT + contentWidth + MARGIN_RIGHT;

  const titleHeight = 56;
  const svgHeight = titleHeight + numRows * ROW_H + 20;

  // Accumulate global note index per bar
  const barStartIdx: number[] = [];
  let acc = 0;
  for (const b of bars) { barStartIdx.push(acc); acc += b.length; }

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width="100%"
      style={{ display: 'block', maxWidth: svgWidth, margin: '0 auto' }}
      aria-label={`Practice sheet: ${title}`}
    >
      {/* Title */}
      <text x={svgWidth / 2} y={24} textAnchor="middle" fontSize={18}
            fontFamily="'Caveat', cursive" fontWeight="700" fill={PENCIL}>
        {title}
      </text>
      {subtitle && (
        <text x={svgWidth / 2} y={42} textAnchor="middle" fontSize={13}
              fontFamily="'Caveat', cursive" fill="#6b5a48">
          {subtitle}
        </text>
      )}

      {/* Rows */}
      {Array.from({ length: numRows }, (_, row) => {
        const rowBars = bars.slice(row * BARS_PER_ROW, (row + 1) * BARS_PER_ROW);
        // rowTop offset includes title area
        const rowOffset = titleHeight;

        // Temporarily shift all row calculations
        const origStaffTop = staffTop;
        const rowShift = rowOffset;

        let noteX = MARGIN_LEFT;

        return (
          <g key={row} transform={`translate(0, ${rowOffset})`}>
            {/* Staff lines */}
            {Array.from({ length: STAFF_LINES }, (_, i) => {
              const y = row * ROW_H + ROW_PAD_TOP + i * LINE_SPACING;
              return (
                <line key={i}
                  x1={MARGIN_LEFT} y1={y} x2={svgWidth - MARGIN_RIGHT} y2={y}
                  stroke={PENCIL} strokeWidth={1} opacity={0.85} strokeLinecap="round"
                />
              );
            })}

            {/* Treble clef */}
            {(() => {
              const top = row * ROW_H + ROW_PAD_TOP;
              const y = top + (TOP_STEP - 2) * HALF_LINE + 20;
              return (
                <text x={10} y={y} fontSize={LINE_SPACING * 7.2}
                      fontFamily="serif" fill={PENCIL} opacity={0.9}>𝄞</text>
              );
            })()}

            {/* Time signature */}
            {(() => {
              const top = row * ROW_H + ROW_PAD_TOP;
              const fs = LINE_SPACING * 2.1;
              return (
                <>
                  <text x={62} y={top + LINE_SPACING * 1.4} fontSize={fs}
                        fontFamily="'Caveat', serif" fontWeight="700" fill={PENCIL} textAnchor="middle">4</text>
                  <text x={62} y={top + LINE_SPACING * 3.3} fontSize={fs}
                        fontFamily="'Caveat', serif" fontWeight="700" fill={PENCIL} textAnchor="middle">4</text>
                </>
              );
            })()}

            {/* Bars */}
            {(() => {
              const elems: JSX.Element[] = [];
              let x = MARGIN_LEFT;
              rowBars.forEach((bar, barIdx) => {
                const globalBarIdx = row * BARS_PER_ROW + barIdx;
                const bw = barWidth(bar);
                let beatPos = 0;

                bar.forEach((note, noteIdx) => {
                  const globalNoteIdx = barStartIdx[globalBarIdx] + noteIdx;
                  const noteCx = x + beatPos * NOTE_UNIT + (note.beats * NOTE_UNIT) / 2;
                  const noteRow = row;

                  const step = DIATONIC_STEPS[note.note] ?? 0;
                  const cy = noteRow * ROW_H + ROW_PAD_TOP + (TOP_STEP - step) * HALF_LINE;
                  const isActive = globalNoteIdx === activeIndex;
                  const color = isActive ? GOLD : PENCIL;
                  const isWhole = note.beats >= 4;
                  const isHalf  = note.beats === 2 || note.beats === 1.5;
                  const isEighth = note.beats <= 0.5;
                  const filled = !isWhole && !isHalf;
                  const stemUp = step < 4;
                  const stemX  = stemUp ? noteCx + NOTE_RX - 1 : noteCx - NOTE_RX + 1;
                  const stemY1 = stemUp ? cy - 2 : cy + 2;
                  const stemY2 = stemUp ? cy - STEM_LEN : cy + STEM_LEN;
                  const sTop   = noteRow * ROW_H + ROW_PAD_TOP;
                  const fingerY = sTop - 12;
                  const letterY = sTop + STAFF_HEIGHT + 22;
                  const sharp = isSharp(note.note);
                  const letter = noteLetter(note.note);

                  // Ledger lines
                  const ledgers: JSX.Element[] = [];
                  const lw = NOTE_RX + 5;
                  if (step <= -2) {
                    for (let s = -2; s >= step; s -= 2) {
                      const ly = noteRow * ROW_H + ROW_PAD_TOP + (TOP_STEP - s) * HALF_LINE;
                      ledgers.push(
                        <line key={`l${s}`} x1={noteCx - lw} y1={ly} x2={noteCx + lw} y2={ly}
                              stroke={PENCIL} strokeWidth={1.2} strokeLinecap="round" />
                      );
                    }
                  }
                  if (step >= TOP_STEP + 2) {
                    for (let s = TOP_STEP + 2; s <= step; s += 2) {
                      const ly = noteRow * ROW_H + ROW_PAD_TOP + (TOP_STEP - s) * HALF_LINE;
                      ledgers.push(
                        <line key={`la${s}`} x1={noteCx - lw} y1={ly} x2={noteCx + lw} y2={ly}
                              stroke={PENCIL} strokeWidth={1.2} strokeLinecap="round" />
                      );
                    }
                  }

                  elems.push(
                    <g key={`n${globalNoteIdx}`}>
                      {ledgers}

                      {/* Accidental */}
                      {sharp && (
                        <text x={noteCx - NOTE_RX - 7} y={cy + 4} fontSize={11}
                              fontFamily="serif" fill={color} textAnchor="middle">♯</text>
                      )}

                      {/* Note head */}
                      <ellipse cx={noteCx} cy={cy} rx={NOTE_RX} ry={NOTE_RY}
                               fill={filled ? color : PAPER}
                               stroke={color}
                               strokeWidth={isWhole ? 1.8 : 1.5}
                               transform={`rotate(-12, ${noteCx}, ${cy})`}
                      />

                      {/* Stem */}
                      {!isWhole && (
                        <line x1={stemX} y1={stemY1} x2={stemX} y2={stemY2}
                              stroke={color} strokeWidth={1.3} strokeLinecap="round" />
                      )}

                      {/* Eighth-note flag */}
                      {isEighth && (
                        <path
                          d={stemUp
                            ? `M ${stemX} ${stemY2} C ${stemX+14} ${stemY2+8}, ${stemX+16} ${stemY2+18}, ${stemX+6} ${stemY2+24}`
                            : `M ${stemX} ${stemY2} C ${stemX+14} ${stemY2-8}, ${stemX+16} ${stemY2-18}, ${stemX+6} ${stemY2-24}`
                          }
                          fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round"
                        />
                      )}

                      {/* Finger number */}
                      {note.finger != null && (
                        <text x={noteCx} y={fingerY} fontSize={12}
                              fontFamily="'Caveat', cursive" fontWeight="700"
                              fill={isActive ? GOLD : '#6b5a48'} textAnchor="middle">
                          {note.finger}
                        </text>
                      )}

                      {/* Note letter */}
                      <text x={noteCx} y={letterY} fontSize={11}
                            fontFamily="'Caveat', cursive"
                            fill={isActive ? GOLD : '#6b5a48'} textAnchor="middle">
                        {letter}{isWhole ? ' (hold)' : ''}
                      </text>
                    </g>
                  );

                  beatPos += note.beats;
                });

                // Bar line
                const barLineX = x + bw;
                const isLastBar = globalBarIdx === totalBars - 1;
                const top = row * ROW_H + ROW_PAD_TOP;
                if (isLastBar) {
                  // Double bar line at end
                  elems.push(
                    <g key={`bl-${globalBarIdx}`}>
                      <line x1={barLineX - 3} y1={top} x2={barLineX - 3} y2={top + STAFF_HEIGHT}
                            stroke={PENCIL} strokeWidth={1} />
                      <line x1={barLineX + 1} y1={top} x2={barLineX + 1} y2={top + STAFF_HEIGHT}
                            stroke={PENCIL} strokeWidth={3} />
                    </g>
                  );
                } else {
                  elems.push(
                    <line key={`bl-${globalBarIdx}`}
                          x1={barLineX} y1={top} x2={barLineX} y2={top + STAFF_HEIGHT}
                          stroke={PENCIL} strokeWidth={1.2} />
                  );
                }
                x += bw + BAR_GAP;
              });
              return elems;
            })()}
          </g>
        );
      })}
    </svg>
  );
}
