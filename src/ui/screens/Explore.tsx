import { useMemo, useState } from 'preact/hooks';
import { prefs } from '../../prefs/store';
import { anchorStringList, numeralOptions, symbolOptions } from '../../prefs/model';
import {
  CORE_DEGREES,
  type DegreeIndex,
  DEGREES,
  chordNumeral,
  chordSymbol,
  diatonicChord,
} from '../../theory/chords';
import type { StringNum } from '../../fretboard/tuning';
import { type StringSetId, TRIAD_STRING_SETS } from '../../fretboard/regions';
import { voicingsInRegion } from '../../fretboard/voicings';
import { pairAnchors } from '../../fretboard/anchors';
import { Fretboard, type Marker } from '../Fretboard';
import { chooseVisibleRange } from '../fretboardGeometry';
import { useViewportWidth } from '../useViewport';
import { KeyPicker, StringSetPicker, WindowPicker, keyFromAscii } from '../pickers';
import { chordToneName, noteMarker } from '../markers';
import { formatKey } from '../../theory/keys';

export function Explore() {
  const p = prefs.value;
  const [k, setKey] = useState(() => keyFromAscii('F#m', p));
  const [degree, setDegree] = useState<DegreeIndex>(0);
  const [set, setSet] = useState<StringSetId>(p.fretboard.stringSets[0] ?? '1-3');
  const [win, setWin] = useState(p.fretboard.window);
  const [taps, setTaps] = useState<{ string: StringNum; fret: number }[]>([]);
  const vw = useViewportWidth();
  const maxFret = p.fretboard.fretRange;

  const chord = useMemo(() => diatonicChord(k, degree, false, p.harmony), [k, degree, p.harmony]);
  const region = { stringSet: set, window: win };
  const voicings = voicingsInRegion(chord, region, {
    maxFret,
    maxSpan: p.fretboard.maxSpan,
    allowOutside: p.fretboard.allowOutside,
  });
  const markers: Marker[] = [];
  for (const v of voicings) for (const n of v.notes) markers.push(noteMarker(n, 'shown', p));
  if (p.fretboard.anchor !== 'off') {
    for (const a of pairAnchors(chord, voicings, anchorStringList(p), maxFret, win)) {
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
  const range = chooseVisibleRange(win, maxFret, Math.min(vw, 1200) - 24);
  const degrees = k.mode === 'minor' ? CORE_DEGREES.minor : CORE_DEGREES.major;
  const ordered = [...DEGREES].sort((a, b) => a - b);

  return (
    <div class="explore">
      <div class="prompt">
        <div class="prompt-main">
          {chordSymbol(chord, symbolOptions(p))}{' '}
          <span class="muted">
            · {chordNumeral(chord, numeralOptions(p))} in {formatKey(k, p.spelling.glyphs)}
          </span>
        </div>
        <div class="prompt-sub">
          {chordToneName(chord, p)} · {voicings.length} voicing{voicings.length === 1 ? '' : 's'} in
          region
        </div>
      </div>
      <div class="board-wrap">
        <Fretboard
          fromFret={range.from}
          toFret={range.to}
          region={region}
          markers={markers}
          leftHanded={p.fretboard.leftHanded}
          showFretNumbers={p.fretboard.showFretNumbers}
          onTap={(s, f) =>
            setTaps((ts) =>
              ts.some((t) => t.string === s && t.fret === f)
                ? ts.filter((t) => !(t.string === s && t.fret === f))
                : [...ts, { string: s, fret: f }],
            )
          }
        />
      </div>
      <div class="chips" role="group" aria-label="Degree">
        {ordered.map((d) => {
          const c = diatonicChord(k, d, false, p.harmony);
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
        <StringSetPicker value={set} sets={TRIAD_STRING_SETS} onChange={setSet} />
        <WindowPicker value={win} maxFret={maxFret} onChange={setWin} />
      </div>
    </div>
  );
}
