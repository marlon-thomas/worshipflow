/** Sanity tests for the chord engine. Run: npx tsx scripts/test-music.ts */
import { renderChordChart, stripChords, transposeChordPro } from '../src/lib/chordpro';
import { keyDelta, parseChord, transposeChord } from '../src/lib/transpose';

let failures = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(`FAIL ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// --- parseChord ---
eq(parseChord('Am7'), { root: 'A', quality: 'm7', bass: undefined }, 'parse Am7');
eq(parseChord('G/B'), { root: 'G', quality: '', bass: 'B' }, 'parse G/B');
eq(parseChord('Dsus4'), { root: 'D', quality: 'sus4', bass: undefined }, 'parse Dsus4');
eq(parseChord('Bbmaj7/D'), { root: 'Bb', quality: 'maj7', bass: 'D' }, 'parse Bbmaj7/D');
eq(parseChord('hello'), null, 'reject non-chord');

// --- transposeChord ---
eq(transposeChord('Am', 2, false), 'Bm', 'Am +2 = Bm');
eq(transposeChord('C', 1, true), 'Db', 'C +1 flats = Db');
eq(transposeChord('C', 1, false), 'C#', 'C +1 sharps = C#');
eq(transposeChord('G/B', -2, false), 'F/A', 'G/B -2 = F/A');
eq(transposeChord('B', 1, true), 'C', 'B +1 = C');
eq(transposeChord('E', -1, true), 'Eb', 'E -1 flats = Eb');
eq(transposeChord('F#m7', -6, true), 'Cm7', 'F#m7 -6 flats = Cm7');
eq(transposeChord('C/E', 6, false), 'F#/A#', 'C/E +6 sharps = F#/A#');
eq(transposeChord('C/E', 6, true), 'Gb/Bb', 'C/E +6 flats = Gb/Bb');

// --- keyDelta ---
eq(keyDelta('C', 'D'), 2, 'C -> D = 2');
eq(keyDelta('G', 'E'), 9, 'G -> E = 9 (upward)');
eq(keyDelta('Am', 'Am'), 0, 'Am -> Am = 0');
eq(keyDelta('Bb', 'A'), 11, 'Bb -> A = 11');

// --- ChordPro ---
const chart = '{comment: Verse 1}\n[G]Amazing [D]grace how [Em]sweet\n[C]I once was [G]lost';
eq(transposeChordPro(chart, 2, false), '{comment: Verse 1}\n[A]Amazing [E]grace how [F#m]sweet\n[D]I once was [A]lost', 'transpose chart +2 sharps');
eq(transposeChordPro(chart, 4, true), '{comment: Verse 1}\n[B]Amazing [Gb]grace how [Abm]sweet\n[E]I once was [B]lost', 'transpose chart +4 prefers flats');
eq(stripChords(chart), 'Amazing grace how sweet\nI once was lost', 'strip chords -> lyric sheet');

const rendered = renderChordChart('[G]Amazing [D]grace');
eq(rendered.length, 1, 'one rendered line');
eq(rendered[0].lyrics, 'Amazing grace', 'lyrics aligned');
eq(rendered[0].chords.indexOf('G'), 0, 'G at column 0');
eq(rendered[0].chords.indexOf('D'), rendered[0].lyrics.indexOf('grace'), 'D above "grace"');

// long chord pushes following lyrics right
const long = renderChordChart('[C#m7]Hi [B]there');
eq(long[0].lyrics.startsWith('Hi'), true, 'short chord, no pad needed');
eq(long[0].chords.indexOf('B'), long[0].lyrics.indexOf('there'), 'B above "there"');

const dir = renderChordChart('{comment: Chorus}\n[A]Sing it out');
eq(dir[0], { chords: '', lyrics: 'Chorus' }, 'directive becomes label line');

console.log(failures === 0 ? '\nAll tests passed.' : `\n${failures} test(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
