import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prefs } from '../../prefs/store';
import { answerLog, retireItem, stats } from '../../progress/store';
import { type PracticeConfig, concreteConfig, defaultConfig } from '../../exercises/config';
import type { Key } from '../../theory/keys';
import { Setup } from '../../exercises/Setup';
import { modeDef } from '../../exercises/modes';
import {
  type SessionState,
  finishSession,
  isSessionOver,
  nextQuestion,
  recordAttempt,
  startSession,
  summarize,
} from '../../exercises/session';
import { drillQueue, occurrence } from '../../exercises/drill';
import { reviewConfig, reviewWeight } from '../../exercises/review';
import { pauseClock, resumeClock } from '../../exercises/answerClock';
import { pendingDrill } from '../../exercises/drillState';
import { advanceGuided, guided, pendingGuided } from '../../guided/store';
import {
  type SlotKind,
  WARMUP,
  chooseTarget,
  needsWarmup,
  newShare,
  sessionKinds,
} from '../../guided/plan';
import { guidedConfig, targetWeight } from '../../guided/config';
import { type Step, type Target, targetId } from '../../guided/curriculum';
import { GuidedProgress, KIND_LABEL, SkipChallenge, targetLabel } from '../../guided/GuidedStatus';
import { PROGRESSIONS } from '../../exercises/progression/logic';
import { makeItemWeight } from '../../progress/srs';
import { recordAttempts } from '../../progress/record';
import { type Attempt, type Item, itemKey } from '../../progress/types';
import { keyFromAscii } from '../pickers';
import { navigate, route } from '../router';
import type { Preferences } from '../../prefs/model';
import { loadSetup, saveSetup } from '../../exercises/lastSetup';
import { itemLabel } from '../../progress/labels';
import { sessionHeader } from '../sessionHeader';

interface GuidedRun {
  kinds: SlotKind[];
  passed: Step[];
  /** Shown until the next question: steps just passed. */
  justPassed?: string;
}

/** Plan a guided session (passing any steps already solid from earlier practice first). */
function newGuidedRun(p: Preferences): GuidedRun {
  advanceGuided();
  const n = p.practice.sessionLength.kind === 'questions' ? p.practice.sessionLength.count : 20;
  const log = answerLog.value;
  const warmup = needsWarmup(log, guided.value, Date.now()) ? WARMUP : 0;
  return { kinds: sessionKinds(n, newShare(log, guided.value), warmup), passed: [] };
}

interface Drill {
  title: string;
  items: Item[];
}

export function Practice() {
  const p = prefs.value;
  const [config, setConfig] = useState<PracticeConfig>(
    () => loadSetup(p) ?? defaultConfig('find', keyFromAscii('F#m', p), p),
  );
  const [drill, setDrill] = useState<Drill | null>(() => {
    const d = pendingDrill.value;
    pendingDrill.value = null;
    // Each item `passes` times, never back to back (review: once each; drill: twice).
    return d && d.items.length
      ? { title: d.title, items: drillQueue(d.items, d.passes, Math.random) }
      : null;
  });
  // Guided practice: the kinds of question this session asks (new / review / check), and
  // the steps passed during it.
  const [guidedRun, setGuidedRun] = useState<GuidedRun | null>(() => {
    if (!pendingGuided.value) return null;
    pendingGuided.value = false;
    return newGuidedRun(p);
  });
  const [session, setSession] = useState<SessionState<number> | null>(() =>
    drill
      ? startSession({ kind: 'questions', count: drill.items.length }, 0, Date.now())
      : guidedRun
        ? startSession({ kind: 'questions', count: guidedRun.kinds.length }, 0, Date.now())
        : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  // Back from Preferences: the session is kept alive underneath. If settings changed while
  // the current question was unanswered, it may no longer be valid: ask a fresh one.
  const [regen, setRegen] = useState(0);
  const prefsWhenLeft = useRef<Preferences | null>(null);
  const visible = route.value === 'practice';
  useEffect(() => {
    if (!visible) {
      prefsWhenLeft.current ??= prefs.value;
      return;
    }
    const before = prefsWhenLeft.current;
    prefsWhenLeft.current = null;
    if (before && before !== prefs.value && session?.phase === 'answering') setRegen((x) => x + 1);
  }, [visible]);
  // Answer times stand still while Preferences or Help is open on top of a question.
  useEffect(() => {
    if (visible) resumeClock('route');
    else pauseClock('route');
  }, [visible]);
  useEffect(() => () => resumeClock('route'), []);
  // Session status lives in the top bar while a question is on screen.
  const running = visible && session !== null && session.phase !== 'done';
  useEffect(() => {
    if (!running || !session) {
      sessionHeader.value = null;
      return;
    }
    const sl = session.length;
    const byChords = !drill && !guidedRun && config.mode === 'progression';
    const next = {
      progress:
        sl.kind === 'questions'
          ? byChords
            ? `${session.attempts.length}/${sl.count}`
            : `${session.index + 1}/${sl.count}`
          : `${Math.max(0, Math.ceil((sl.minutes * 60_000 - (Date.now() - session.startedAt)) / 60_000))} min left`,
      correct: session.attempts.filter((a) => a.correct).length,
      title: drill?.title ?? (guidedRun ? 'Guided' : undefined),
      finish: () => setSession((s) => (s ? finishSession(s) : s)),
    };
    // Only on change: App re-renders on this signal, which re-renders this screen.
    const cur = sessionHeader.value;
    if (
      !cur ||
      cur.progress !== next.progress ||
      cur.correct !== next.correct ||
      cur.title !== next.title
    )
      sessionHeader.value = next;
  });
  useEffect(() => () => void (sessionHeader.value = null), []);
  const prev = useRef<unknown>(null);
  const prevKey = useRef<Key | null>(null);
  /** Window start each drilled item last had in this session (a repeat goes elsewhere). */
  const drillStarts = useRef(new Map<string, number>());
  /** The guided target asked last (not asked twice in a row). */
  const prevTarget = useRef<string | undefined>(undefined);

  // Per-question config and selection weights
  const index = session?.index ?? 0;
  const current = useMemo<{
    config: PracticeConfig | null;
    item: Item | null;
    itemWeight: (i: Item) => number;
    guided?: { target: Target; kind: SlotKind };
  }>(() => {
    if (guidedRun) {
      // The target is chosen when the question comes up, from the latest progress: a step
      // passed mid-session brings in the next one.
      const kind = guidedRun.kinds[index] ?? 'check';
      const g = chooseTarget(
        kind,
        answerLog.value,
        guided.value,
        Date.now(),
        Math.random,
        prevTarget.current,
      );
      if (!g) return { config: null, item: null, itemWeight: () => 1 };
      prevTarget.current = targetId(g.target);
      return {
        config: guidedConfig(g.target, p, Math.random),
        item: null,
        itemWeight: targetWeight(g.target),
        guided: g,
      };
    }
    if (drill) {
      const item = drill.items[index % drill.items.length];
      const k = itemKey(item);
      // First time: where the item was last practiced (or a window it fits in). A repeat,
      // or a retry, goes to another window, so it's never the identical question.
      const again = occurrence(drill.items, index % drill.items.length) > 0 || retry > 0;
      const c = reviewConfig(
        item,
        p,
        stats.value[k]?.window,
        Math.random,
        again ? drillStarts.current.get(k) : undefined,
      );
      if (c) drillStarts.current.set(k, c.window.start);
      return { config: c, itemWeight: reviewWeight(item), item };
    }
    // Random key: a new key per question (only once a session is running).
    let qConfig = config;
    if (session !== null && config.randomKey) {
      const onlyMode =
        config.mode === 'progression'
          ? PROGRESSIONS.find((x) => x.id === config.variant)?.mode
          : undefined;
      qConfig = concreteConfig(config, p, prevKey.current, Math.random, onlyMode);
      prevKey.current = qConfig.key;
    }
    return {
      config: qConfig,
      item: null,
      itemWeight: makeItemWeight(
        stats.value,
        {
          now: Date.now(),
          thresholds: {
            accuracy: p.practice.masteryAccuracy,
            triadMs: p.practice.masteryTimeTriadMs,
            seventhMs: p.practice.masteryTimeSeventhMs,
          },
          freshShare: p.practice.freshShare,
        },
        Math.random,
      ),
    };
  }, [index, retry, regen, drill, guidedRun?.kinds, session === null]);

  // A review item that can't be turned into a question any more (the mode changed, a
  // preference turned it off, a damaged key in an imported backup) is retired and skipped,
  // instead of asking something else or leaving an empty screen.
  const unaskable =
    (!!drill || !!guidedRun) && !!session && session.phase !== 'done' && !current.config;
  useEffect(() => {
    if (!unaskable) return;
    if (current.item) retireItem(itemKey(current.item));
    setSession((s) =>
      !s
        ? s
        : isSessionOver(s, Date.now())
          ? finishSession(s)
          : nextQuestion(s, s.index + 1, Date.now()),
    );
  }, [unaskable, index]);

  if (!session) {
    return (
      <>
        {notice && <p class="notice">{notice}</p>}
        <Setup
          config={config}
          prefs={p}
          onChange={setConfig}
          onStart={() => {
            saveSetup(config);
            prev.current = null;
            prevKey.current = null;
            setNotice(null);
            setSession(startSession(p.practice.sessionLength, 0, Date.now()));
          }}
        />
      </>
    );
  }

  if (session.phase === 'done') {
    return (
      <Summary
        attempts={session.attempts}
        durationMs={Date.now() - session.startedAt}
        guidedPassed={guidedRun?.passed}
        onAgain={() => {
          setDrill(null);
          if (guidedRun) {
            // another guided session, planned from the progress made so far
            const g = newGuidedRun(p);
            setGuidedRun(g);
            setSession(startSession({ kind: 'questions', count: g.kinds.length }, 0, Date.now()));
            return;
          }
          setSession(null);
        }}
      />
    );
  }

  // The progression walk counts chords, not progressions (20 ≈ 5 progressions).
  const byChords = !drill && !guidedRun && config.mode === 'progression';
  const advance = () =>
    setSession((s) => {
      if (!s) return s;
      const now = Date.now();
      return isSessionOver(s, now, byChords) ? finishSession(s) : nextQuestion(s, s.index + 1, now);
    });

  const cfg = current.config;
  const mode = cfg ? modeDef(cfg.mode) : undefined;

  return (
    <div class="practice">
      {drill && current.item && (
        <div class="drill-item muted">
          {/* On narrow screens the drill's title lives here instead of the top bar. */}
          <b class="drill-title">{drill.title} · </b>
          {itemLabel(current.item, p)}
        </div>
      )}
      {guidedRun && current.guided && (
        <div class="drill-item muted">
          <b class="drill-title">Guided · </b>
          <span class={`guided-kind ${current.guided.kind}`}>
            {KIND_LABEL[current.guided.kind]}
          </span>
          {' · '}
          {targetLabel(current.guided.target)}
        </div>
      )}
      {guidedRun && guidedRun.justPassed && (
        <p class="guided-passed" role="status">
          ✓ Step passed: {guidedRun.justPassed}. New material from the next step comes in now.
        </p>
      )}
      {mode && cfg && (
        <mode.Runner
          key={`${session.index}:${retry}:${regen}`}
          config={cfg}
          prefs={p}
          prev={prev}
          itemWeight={current.itemWeight}
          onGraded={(a: Attempt[]) => {
            recordAttempts(a);
            setSession((s) => (s ? recordAttempt(s, a) : s));
            if (guidedRun) {
              const passed = advanceGuided();
              if (passed.length)
                setGuidedRun((g) =>
                  g
                    ? {
                        ...g,
                        passed: [...g.passed, ...passed],
                        justPassed: passed.map((x) => x.title).join('; '),
                      }
                    : g,
                );
            }
          }}
          onNext={() => {
            setRetry(0);
            if (guidedRun?.justPassed)
              setGuidedRun((g) => (g ? { ...g, justPassed: undefined } : g));
            advance();
          }}
          onImpossible={() => {
            if (drill || guidedRun || config.randomKey) {
              // drills: try other windows; random keys: try other keys — then skip
              if (retry < 5) setRetry(retry + 1);
              else {
                setRetry(0);
                advance();
              }
              return;
            }
            setNotice(
              'No questions are possible with this setup — try a wider fret window or other string sets.',
            );
            setSession(null);
          }}
        />
      )}
    </div>
  );
}

function Summary(props: {
  attempts: Attempt[];
  durationMs: number;
  onAgain: () => void;
  /** Guided practice: the steps passed this session. */
  guidedPassed?: Step[];
}) {
  const s = summarize(props.attempts, props.durationMs);
  return (
    <div class="summary">
      {props.guidedPassed && (
        <section class="card guided-summary">
          <h2>Guided practice</h2>
          {props.guidedPassed.length > 0 && (
            <ul class="guided-passed-list">
              {props.guidedPassed.map((st) => (
                <li key={st.id}>✓ Passed: {st.title}</li>
              ))}
            </ul>
          )}
          <GuidedProgress />
          <SkipChallenge />
        </section>
      )}
      <section class="card summary-card">
        <h2>Session complete</h2>
        <div class="big-stats">
          <div>
            <strong>
              {s.correct}/{s.total}
            </strong>
            <span>correct</span>
          </div>
          <div>
            <strong>{Math.round(s.accuracy * 100)}%</strong>
            <span>accuracy</span>
          </div>
          <div>
            <strong>{s.correct ? `${(s.medianMs / 1000).toFixed(1)} s` : '–'}</strong>
            <span>median time</span>
          </div>
        </div>
      </section>
      <div class="actions">
        <button type="button" class="btn" onClick={props.onAgain}>
          {props.guidedPassed ? 'Next session' : 'Practice again'}
        </button>
        <button type="button" class="btn secondary" onClick={() => navigate('stats')}>
          Progress
        </button>
      </div>
    </div>
  );
}
