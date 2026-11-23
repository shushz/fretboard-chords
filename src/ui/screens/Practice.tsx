import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { prefs } from '../../prefs/store';
import { stats } from '../../progress/store';
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
import {
  drillConfig,
  drillQueue,
  drillWeight,
  drillWindow,
  occurrence,
} from '../../exercises/drill';
import { pendingDrill } from '../../exercises/drillState';
import { PROGRESSIONS } from '../../exercises/progression/logic';
import { makeItemWeight } from '../../progress/srs';
import { recordAttempts } from '../../progress/record';
import type { Attempt, Item } from '../../progress/types';
import { keyFromAscii } from '../pickers';
import { navigate, route } from '../router';
import type { Preferences } from '../../prefs/model';
import { loadSetup, saveSetup } from '../../exercises/lastSetup';
import { itemLabel } from '../../progress/labels';
import { sessionHeader } from '../sessionHeader';

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
  const [session, setSession] = useState<SessionState<number> | null>(() =>
    drill ? startSession({ kind: 'questions', count: drill.items.length }, 0, Date.now()) : null,
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
  // Session status lives in the top bar while a question is on screen.
  const running = visible && session !== null && session.phase !== 'done';
  useEffect(() => {
    if (!running || !session) {
      sessionHeader.value = null;
      return;
    }
    const sl = session.length;
    const byChords = !drill && config.mode === 'progression';
    const next = {
      progress:
        sl.kind === 'questions'
          ? byChords
            ? `${session.attempts.length}/${sl.count}`
            : `${session.index + 1}/${sl.count}`
          : `${Math.max(0, Math.ceil((sl.minutes * 60_000 - (Date.now() - session.startedAt)) / 60_000))} min left`,
      correct: session.attempts.filter((a) => a.correct).length,
      title: drill?.title,
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
  const lastWindow = useRef<number | undefined>(undefined);

  // Per-question config and selection weights
  const index = session?.index ?? 0;
  const current = useMemo(() => {
    if (drill) {
      const item = drill.items[index % drill.items.length];
      const c = drillConfig(item, p);
      if (c) {
        // A repeated item gets a different fret window, so it's never the identical question.
        const occ = occurrence(drill.items, index % drill.items.length) + retry;
        c.window = drillWindow(
          c.window,
          occ,
          p.fretboard.fretRange,
          Math.random,
          lastWindow.current,
        );
        lastWindow.current = c.window.start;
      }
      return { config: c, itemWeight: drillWeight(item), item };
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
  }, [index, retry, regen, drill, session === null]);

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
        onAgain={() => {
          setDrill(null);
          setSession(null);
        }}
      />
    );
  }

  // The progression walk counts chords, not progressions (20 ≈ 5 progressions).
  const byChords = !drill && config.mode === 'progression';
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
          }}
          onNext={() => {
            setRetry(0);
            advance();
          }}
          onImpossible={() => {
            if (drill || config.randomKey) {
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

function Summary(props: { attempts: Attempt[]; durationMs: number; onAgain: () => void }) {
  const s = summarize(props.attempts, props.durationMs);
  return (
    <div class="summary">
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
          Practice again
        </button>
        <button type="button" class="btn secondary" onClick={() => navigate('stats')}>
          Progress
        </button>
      </div>
    </div>
  );
}
