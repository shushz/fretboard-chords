import { useEffect, useMemo } from 'preact/hooks';
import { chordNumeral, chordSymbol } from '../../theory/chords';
import { formatKey } from '../../theory/keys';
import { formatStringSet, formatWindow } from '../../fretboard/regions';
import { pairAnchors } from '../../fretboard/anchors';
import { anchorStringList, numeralOptions, symbolOptions } from '../../prefs/model';
import { chordToneName } from '../../ui/markers';
import { voicingOptions } from '../config';
import type { RunnerProps } from '../types';
import { TapQuestion, inversionName } from '../TapQuestion';
import {
  type FindQuestion,
  findItem,
  generateFindQuestion,
  gradeFind,
  requiredStrings,
} from './logic';

export function FindRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<FindQuestion | null>(
    () =>
      generateFindQuestion(config, {
        harmony: p.harmony,
        voicing: voicingOptions(p),
        rand: Math.random,
        itemWeight: props.itemWeight,
        previous: props.prev.current as FindQuestion | null,
      }),
    [],
  );
  useEffect(() => {
    if (!q) props.onImpossible();
    else props.prev.current = q;
  }, []);
  if (!q) return null;
  const maxFret = p.fretboard.fretRange;
  const numeral = chordNumeral(q.chord, numeralOptions(p));
  const symbol = chordSymbol(q.chord, symbolOptions(p));

  return (
    <TapQuestion
      prefs={p}
      label={`Fretboard: find ${numeral}`}
      prompt={{
        main: `${formatKey(q.chord.key)} · ${numeral}`,
        sub: `${formatStringSet(q.region.stringSet)} · ${formatWindow(q.region.window)}`,
        hint: q.anchorString
          ? `Tap the root on string ${q.anchorString}, then the chord on ${q.region.stringSet.replace('-', '–')}`
          : undefined,
      }}
      chord={q.chord}
      region={q.region}
      requiredStrings={requiredStrings(q)}
      grade={(taps) => {
        const g = gradeFind(q, taps, maxFret);
        const anchorWanted =
          p.fretboard.anchor === 'ghost' || config.anchor !== 'off' || q.anchorString;
        const shown = g.matched ? [g.matched] : q.valid;
        const strings = q.anchorString ? [q.anchorString] : anchorStringList(p);
        const ghosts = anchorWanted
          ? pairAnchors(q.chord, shown, strings, maxFret, q.region.window).map((a) => a.anchor.note)
          : [];
        const anchorTap = q.anchorString ? taps.get(q.anchorString) : undefined;
        return {
          correct: g.correct,
          matched: g.matched,
          reveal: q.valid,
          ghosts,
          okPositions:
            g.anchorOk && q.anchorString && anchorTap !== undefined
              ? [{ string: q.anchorString, fret: anchorTap }]
              : [],
          message: (
            <>
              {numeral} = {symbol} ({chordToneName(q.chord, p)})
              {g.matched && ` · ${inversionName(g.matched.inversion)}`}
              {!g.correct &&
                ` · ${q.valid.length} valid shape${q.valid.length > 1 ? 's' : ''} shown`}
              {g.anchorOk === false && ' · anchor root missed'}
            </>
          ),
        };
      }}
      onGraded={(correct, timeMs) =>
        props.onGraded([
          {
            item: findItem(q),
            correct,
            timeMs,
            at: Date.now(),
            window: q.region.window,
            sevenths: config.sevenths,
          },
        ])
      }
      onNext={props.onNext}
    />
  );
}
