/**
 * ChordPro helpers: parse `[C]Amazing [G]grace` style charts,
 * transpose every chord, produce lyric-only sheets, and render
 * chord-over-lyric lines for display.
 */

import { transposeChord } from './transpose';

export interface ChordProSegment {
  /** Chord attached at the start of this segment, if any. */
  chord?: string;
  /** Lyric text following the chord. */
  text: string;
}

export interface RenderedLine {
  /** Chord names positioned for monospace display above the lyric line ('' for pure text lines). */
  chords: string;
  /** Lyric line. */
  lyrics: string;
}

const DIRECTIVE_RE = /^\{[^}]*\}\s*$/;
const SEGMENT_RE = /\[([^\]]+)\]/g;

function isDirective(line: string): boolean {
  return DIRECTIVE_RE.test(line.trim());
}

/** Parse one ChordPro line into chord+lyric segments. */
export function parseLine(line: string): ChordProSegment[] {
  const segments: ChordProSegment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  SEGMENT_RE.lastIndex = 0;
  while ((match = SEGMENT_RE.exec(line)) !== null) {
    const between = line.slice(last, match.index);
    if (between) segments.push({ text: between });
    segments.push({ chord: match[1], text: '' });
    last = match.index + match[0].length;
  }
  const tail = line.slice(last);
  if (tail) segments.push({ text: tail });
  return segments;
}

/** Transpose every chord in a ChordPro chart. Directives and lyrics untouched. */
export function transposeChordPro(chart: string, semitones: number, useFlats: boolean): string {
  if (semitones === 0) return chart;
  return chart
    .split('\n')
    .map((line) => {
      if (isDirective(line)) return line;
      return line.replace(SEGMENT_RE, (_m, chord: string) => `[${transposeChord(chord, semitones, useFlats)}]`);
    })
    .join('\n');
}

/** Strip all chords and directives — the lyric sheet for vocalists. */
export function stripChords(chart: string): string {
  return chart
    .split('\n')
    .filter((line) => !isDirective(line))
    .map((line) => line.replace(SEGMENT_RE, ''))
    .join('\n');
}

function renderLine(line: string): RenderedLine {
  // Each token is an optional chord followed by the lyric text it hangs over.
  const TOKEN_RE = /(?:\[([^\]]+)\])?([^\[]*)/g;
  let chords = '';
  let lyrics = '';
  let hasChords = false;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (match.index === line.length && !match[0]) break; // trailing empty match
    const [, chord, text] = match;
    if (chord !== undefined) {
      if (chords.length < lyrics.length) chords = chords.padEnd(lyrics.length);
      chords += chord + ' ';
      hasChords = true;
    }
    lyrics += text;
    // Keep following lyrics clear of any overhanging chord name.
    if (chords.length > lyrics.length) lyrics = lyrics.padEnd(chords.length);
  }
  if (!hasChords) return { chords: '', lyrics: line };
  return { chords: chords.trimEnd(), lyrics: lyrics.trimEnd() };
}

/**
 * Render a ChordPro chart into chord/lyric line pairs for monospace display.
 * Directives (e.g. `{comment: Verse 1}`) are expanded to plain text lines.
 */
export function renderChordChart(chart: string): RenderedLine[] {
  const out: RenderedLine[] = [];
  for (const raw of chart.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (isDirective(line)) {
      const label = line.replace(/^\{\s*\w+:?\s*/i, '').replace(/\}\s*$/, '').trim();
      if (label) out.push({ chords: '', lyrics: label });
      continue;
    }
    out.push(renderLine(line));
  }
  return out;
}

/** Extract `{key: X}` directive value, if present. */
export function extractKey(chart: string): string | null {
  const m = /^\{\s*key\s*:\s*([^}]*)\}/im.exec(chart);
  return m ? m[1].trim() : null;
}
