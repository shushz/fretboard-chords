import { useEffect, useMemo } from 'preact/hooks';
import { chordNumeral, chordSymbol } from '../../theory/chords';
import { formatKey } from '../../theory/keys';
import { formatStringSet, formatWindow, stringsOf } from '../../fretboard/regions';
import { pairAnchors } from '../../fretboard/anchors';
import { ANCHOR_STRINGS, numeralOptions, symbolOptions } from '../../prefs/model';
import { fretted, matchVoicing } from '../../fretboard/voicings';
import { Toggle } from '../../ui/controls';
import { chordToneName } from '../../ui/markers';
import { type PracticeConfig, voicingOptions } from '../config';
import type { RunnerProps } from '../types';
import { TapQuestion, inversionName } from '../TapQuestion';
import {
  type FindQuestion,
  findItem,
  generateFindQuestion,
  anchorCandidates,
  anchorFrets,
  gradeFind,
  requiredStrings,
} from './logic';

/** Which chord tone is lowest in each inversion. */
const BASS_NOTE = { root: 'R', first: '3rd', second: '5th', third: '7th' } as const;

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
  const rootHint = p.fretboard.rootHint;
  // "While answering": the roots on 6/5 near the region, as a landmark. Not when the root
  // tap is part of the question (that would give it away).
  const hints =
    rootHint === 'during' && !q.anchorString
      ? anchorCandidates(q.region, ANCHOR_STRINGS).flatMap((s) =>
          anchorFrets(q, s, maxFret).map((f) => ({
            ...fretted(s, f),
            tone: q.chord.tones[0],
            role: 'R' as const,
          })),
        )
      : [];

  return (
    <TapQuestion
      prefs={p}
      label={`Fretboard: find ${numeral}`}
      prompt={{
        main: `${formatKey(q.chord.key)} · ${numeral}`,
        sub: `${formatStringSet(q.region.stringSet)} · ${formatWindow(q.region.window)}`,
        hint: q.anchorString
          ? `Tap the root on string ${q.anchorString}, then the chord on ${q.region.stringSet.replace('-', '–')}`
          : q.inversion
            ? `In ${inversionName(q.inversion)} (${BASS_NOTE[q.inversion]} at the bottom).`
            : undefined,
      }}
      chord={q.chord}
      region={q.region}
      hints={hints}
      requiredStrings={requiredStrings(q)}
      grade={(taps) => {
        const g = gradeFind(q, taps, maxFret);
        // The right chord in another shape, when one shape was asked for.
        const set = stringsOf(q.region.stringSet);
        const otherShape =
          !g.correct && q.otherShapes?.length && set.every((s) => taps.has(s))
            ? matchVoicing(
                set.map((s) => fretted(s, taps.get(s)!)),
                q.otherShapes,
              )
            : null;
        // After answering: the root on 6/5 next to the shape (unless the hint is off).
        const anchorWanted = rootHint !== 'never' || q.anchorString;
        const shown = g.matched ? [g.matched] : q.valid;
        const strings = q.anchorString ? [q.anchorString] : ANCHOR_STRINGS;
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
              {otherShape &&
                q.inversion &&
                ` · that's the ${inversionName(otherShape.inversion)}, not the ${inversionName(q.inversion)}`}
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
            item: findItem(q, config.recordAs ?? 'find', config.recordVariant),
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

export function FindSetup(props: {
  config: PracticeConfig;
  onChange: (c: PracticeConfig) => void;
}) {
  return (
    <Toggle
      label="Also tap the root on string 6 or 5"
      hint="Tap the chord's root on a bass string first, then the chord. The app picks the string; not possible on strings 4–6."
      checked={props.config.tapRoot}
      onChange={(tapRoot) => props.onChange({ ...props.config, tapRoot })}
    />
  );
}
