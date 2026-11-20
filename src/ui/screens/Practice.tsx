import { useRef, useState } from 'preact/hooks';
import { prefs } from '../../prefs/store';
import { type PracticeConfig, defaultConfig } from '../../exercises/config';
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
import { recordAttempts } from '../../progress/record';
import type { Attempt } from '../../progress/types';
import { keyFromAscii } from '../pickers';
import { navigate } from '../router';
import { loadSetup, saveSetup } from '../../exercises/lastSetup';

export function Practice() {
  const p = prefs.value;
  const [config, setConfig] = useState<PracticeConfig>(
    () => loadSetup(p) ?? defaultConfig('find', keyFromAscii('F#m', p), p),
  );
  const [session, setSession] = useState<SessionState<number> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const prev = useRef<unknown>(null);

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
        onAgain={() => setSession(null)}
      />
    );
  }

  const mode = modeDef(config.mode)!;
  const sl = session.length;
  const progress =
    sl.kind === 'questions'
      ? `${session.index + 1} / ${sl.count}`
      : `${Math.max(0, Math.ceil((sl.minutes * 60_000 - (Date.now() - session.startedAt)) / 60_000))} min left`;

  return (
    <div class="practice">
      <div class="session-bar">
        <span class="session-progress">{progress}</span>
        <span class="session-score">{session.attempts.filter((a) => a.correct).length} ✓</span>
        <button type="button" class="link" onClick={() => setSession(finishSession(session))}>
          End
        </button>
      </div>
      <mode.Runner
        key={session.index}
        config={config}
        prefs={p}
        prev={prev}
        onGraded={(a: Attempt[]) => {
          recordAttempts(a);
          setSession((s) => (s ? recordAttempt(s, a) : s));
        }}
        onNext={() =>
          setSession((s) => {
            if (!s) return s;
            const now = Date.now();
            return isSessionOver(s, now) ? finishSession(s) : nextQuestion(s, s.index + 1, now);
          })
        }
        onImpossible={() => {
          setNotice(
            'No questions are possible with this setup — try a wider fret window or other string sets.',
          );
          setSession(null);
        }}
      />
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
            <strong>{Math.round(s.accuracy * 100)} %</strong>
            <span>accuracy</span>
          </div>
          <div>
            <strong>{(s.medianMs / 1000).toFixed(1)} s</strong>
            <span>median time</span>
          </div>
        </div>
      </section>
      <div class="actions">
        <button type="button" class="btn" onClick={props.onAgain}>
          Practice again
        </button>
        <button type="button" class="btn secondary" onClick={() => navigate('home')}>
          Home
        </button>
      </div>
    </div>
  );
}
