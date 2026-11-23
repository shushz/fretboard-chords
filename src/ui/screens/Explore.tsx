import { BoardFrame } from '../BoardFrame';
import { useMemo, useState } from 'preact/hooks';
import { prefs } from '../../prefs/store';
import { ANCHOR_STRINGS, numeralOptions, symbolOptions } from '../../prefs/model';
import {
  CORE_DEGREES,
  type DegreeIndex,
  DEGREES,
  chordNumeral,
  chordSymbol,
  diatonicChord,
} from '../../theory/chords';
import type { StringNum } from '../../fretboard/tuning';
import { type StringSetId, formatWindow } from '../../fretboard/regions';
import { Segmented } from '../controls';
import { enumerateVoicings, nearestOutside, voicingsInRegion } from '../../fretboard/voicings';
import { pairAnchors } from '../../fretboard/anchors';
import { Fretboard, type Marker } from '../Fretboard';
import { chooseVisibleRange } from '../fretboardGeometry';
import { useBoardWidth } from '../useViewport';
import { KeyPicker, StringSetPicker, WindowPicker, keyFromAscii } from '../pickers';
import { chordToneName, noteMarker } from '../markers';
import { playNote, strum } from '../../audio/engine';
import { midiAt } from '../../fretboard/tuning';

export function Explore() {
  const p = prefs.value;
  const [k, setKey] = useState(() => keyFromAscii('F#m', p));
  const [degree, setDegree] = useState<DegreeIndex>(0);
  const [set, setSet] = useState<StringSetId>(p.fretboard.stringSets[0] ?? '1-3');
  const [win, setWin] = useState(p.fretboard.window);
  const [sevenths, setSevenths] = useState(p.sevenths.enabled);
  const [taps, setTaps] = useState<{ string: StringNum; fret: number }[]>([]);
  const vw = useBoardWidth();
  const maxFret = p.fretboard.fretRange;

  const chord = useMemo(
    () => diatonicChord(k, degree, sevenths, p.harmony),
    [k, degree, sevenths, p.harmony],
  );
  const region = { stringSet: set, window: win };
  const vOpts = {
    maxFret,
    maxSpan: p.fretboard.maxSpan,
    allowOutside: p.fretboard.allowOutside,
    shells: true,
  };
  const voicings = voicingsInRegion(chord, region, vOpts);
  const range = chooseVisibleRange(win, maxFret, vw);
  // Shapes that don't fit the window, nearest first; shown faded where they are on screen.
  const outside = nearestOutside(enumerateVoicings(chord, set, vOpts), win, vOpts.allowOutside);
  const nearest = outside
    .slice(0, 2)
    .sort((a, b) => a.position - b.position)
    .map((v) =>
      v.position === v.highestFret ? `${v.position}` : `${v.position}–${v.highestFret}`,
    );
  // Play a shape in the region, or the nearest one when none fits.
  const playable = voicings[0] ?? outside[0] ?? null;
  const markers: Marker[] = [];
  const put = (m: Marker) => {
    const i = markers.findIndex((x) => x.string === m.string && x.fret === m.fret);
    if (i >= 0) markers[i] = m;
    else markers.push(m);
  };
  for (const v of outside) {
    if (v.highestFret < range.from || v.position > range.to) continue;
    for (const n of v.notes) put(noteMarker(n, 'outside', p));
  }
  for (const v of voicings) for (const n of v.notes) put(noteMarker(n, 'shown', p));
  if (p.fretboard.rootHint !== 'never') {
    for (const a of pairAnchors(chord, voicings, ANCHOR_STRINGS, maxFret, win)) {
      if (
        !markers.some((m) => m.string === a.anchor.note.string && m.fret === a.anchor.note.fret)
      ) {
        markers.push(noteMarker(a.anchor.note, 'ghost', p));
      }
    }
  }
  for (const t of taps) {
    if (!markers.some((m) => m.string === t.string && m.fret === t.fret)) {
      markers.push({ ...t, kind: 'tap' });
    }
  }
  const degrees = k.mode === 'minor' ? CORE_DEGREES.minor : CORE_DEGREES.major;
  const ordered = [...DEGREES].sort((a, b) => a - b);

  return (
    <div class="explore">
      <div class="prompt">
        <div class="prompt-main">
          {chordSymbol(chord, symbolOptions(p))}{' '}
          {/* The key is in the Key picker below; repeating it ("F♯m · i in F♯m") was noise. */}
          <span class="muted">· {chordNumeral(chord, numeralOptions(p))}</span>
        </div>
        <button
          type="button"
          class="btn secondary play"
          disabled={!playable}
          onClick={() => playable && strum(playable.notes.map((n) => n.midi))}
        >
          ▶ Play
        </button>
        <div class="prompt-sub">
          {chordToneName(chord, p)} ·{' '}
          {voicings.length > 0 ? (
            <>
              {voicings.length} shape{voicings.length === 1 ? '' : 's'} here
            </>
          ) : (
            <span class="no-fit" role="note">
              No shape fits frets {formatWindow(win).replace('frets ', '')} on strings{' '}
              {set.replace('-', '–')}
              {nearest.length > 0 && <> — nearest at frets {nearest.join(' and ')} (faded)</>}
            </span>
          )}
        </div>
      </div>
      <BoardFrame>
        <Fretboard
          fromFret={range.from}
          toFret={range.to}
          region={region}
          markers={markers}
          leftHanded={p.fretboard.leftHanded}
          showFretNumbers={p.fretboard.showFretNumbers}
          onTap={(s, f) => {
            playNote(midiAt(s, f));
            setTaps((ts) =>
              ts.some((t) => t.string === s && t.fret === f)
                ? ts.filter((t) => !(t.string === s && t.fret === f))
                : [...ts, { string: s, fret: f }],
            );
          }}
        />
      </BoardFrame>
      <div class="chips" role="group" aria-label="Degree">
        {ordered.map((d) => {
          const c = diatonicChord(k, d, sevenths, p.harmony);
          return (
            <button
              type="button"
              key={d}
              class={`chip${d === degree ? ' on' : ''}${degrees.includes(d) ? '' : ' minor'}`}
              aria-pressed={d === degree}
              onClick={() => setDegree(d)}
            >
              {chordNumeral(c, numeralOptions(p))}
            </button>
          );
        })}
      </div>
      <div class="controls">
        <KeyPicker value={k} prefs={p} onChange={setKey} />
        <Segmented
          label="Chord type"
          value={sevenths ? 'sevenths' : 'triads'}
          options={[
            { value: 'triads', label: 'Triads' },
            { value: 'sevenths', label: 'Sevenths' },
          ]}
          onChange={(v) => {
            const on = v === 'sevenths';
            setSevenths(on);
            setSet(on ? '2-5' : '1-3');
          }}
        />
        <StringSetPicker value={set} sevenths={sevenths} onChange={setSet} />
        <WindowPicker value={win} maxFret={maxFret} onChange={setWin} />
      </div>
    </div>
  );
}
