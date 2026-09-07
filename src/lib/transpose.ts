/**
 * Chord transposition engine.
 *
 * Handles standard chord notation: roots (A-G with #/b), any quality suffix
 * (m, maj7, sus4, dim, add9, 7sus4, ...), and slash (bass) chords.
 */

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Maps every valid note spelling to its pitch class (C = 0). Enharmonic-safe. */
const NOTE_TO_PITCH: Record<string, number> = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  'E#': 5, F: 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
};

/** Major keys whose charts should be spelled with flats. */
const FLAT_MAJOR_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);
/** Minor keys whose charts should be spelled with flats. */
const FLAT_MINOR_KEYS = new Set(['Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm']);

export function keyUsesFlats(key: string): boolean {
  return FLAT_MAJOR_KEYS.has(key) || FLAT_MINOR_KEYS.has(key);
}

export interface ParsedChord {
  root: string;
  /** Everything after the root and before any slash, e.g. "m7", "sus4", "maj9". */
  quality: string;
  /** Bass note of a slash chord, if present. */
  bass?: string;
}

const CHORD_RE = /^([A-Ga-g][#b]?)([^/\s]*)(?:\/([A-Ga-g][#b]?))?$/;

export function parseChord(token: string): ParsedChord | null {
  const m = CHORD_RE.exec(token.trim());
  if (!m) return null;
  const root = normalizeNote(m[1]);
  const bass = m[3] ? normalizeNote(m[3]) : undefined;
  if (root === null || (m[3] && bass === null)) return null;
  return { root: root!, quality: m[2] ?? '', bass: bass ?? undefined };
}

function normalizeNote(note: string): string | null {
  if (!note) return null;
  const n = note[0].toUpperCase() + note.slice(1).toLowerCase().replace('b', 'b');
  return NOTE_TO_PITCH[n] !== undefined ? n : null;
}

function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const pitch = NOTE_TO_PITCH[note];
  if (pitch === undefined) return note;
  const next = ((pitch + semitones) % 12 + 12) % 12;
  return (useFlats ? FLAT_NAMES : SHARP_NAMES)[next];
}

/** Transpose a single chord token. Returns the original token if it is not a valid chord. */
export function transposeChord(token: string, semitones: number, useFlats: boolean): string {
  const parsed = parseChord(token);
  if (!parsed) return token;
  const root = transposeNote(parsed.root, semitones, useFlats);
  const bass = parsed.bass ? '/' + transposeNote(parsed.bass, semitones, useFlats) : '';
  return `${root}${parsed.quality}${bass}`;
}

/** Semitone distance from one key to another (minimal, signed). */
export function keyDelta(fromKey: string, toKey: string): number {
  const from = parseChord(fromKey);
  const to = parseChord(toKey);
  if (!from || !to) return 0;
  return ((NOTE_TO_PITCH[to.root] - NOTE_TO_PITCH[from.root]) % 12 + 12) % 12;
}

/** All selectable keys for pickers: majors then minors, in a musical order. */
export const ALL_KEYS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm',
] as const;
