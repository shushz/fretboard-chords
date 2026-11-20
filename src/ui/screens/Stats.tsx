import { useState } from 'preact/hooks';
import { prefs, setPreferences } from '../../prefs/store';
import { daily, replaceProgress, stats } from '../../progress/store';
import {
  type ItemStats,
  aggAccuracy,
  aggMedian,
  aggregate,
  groupBy,
  isMastered,
  isSeventhItem,
  medianTime,
  rollingAccuracy,
  streak,
  totalMinutes,
  trend,
  weakest,
} from '../../progress/stats';
import { makeBackup, parseBackup, withoutKey } from '../../progress/backup';
import { MODE_NAMES, degreeLabel, itemLabel, keyLabel } from '../../progress/labels';
import { type ModeId, parseItemKey } from '../../progress/types';
import type { Preferences } from '../../prefs/model';
import { Section } from '../controls';
import { pendingDrill } from '../../exercises/drillState';
import { navigate } from '../router';

function pct(x: number | null): string {
  return x === null ? '–' : `${Math.round(x * 100)}%`;
}
function secs(ms: number | null): string {
  return ms === null ? '–' : `${(ms / 1000).toFixed(1)}s`;
}
/** Red → amber → green by accuracy. */
function heat(acc: number | null): string {
  if (acc === null) return 'transparent';
  return `hsl(${Math.round(acc * 120)} 65% 45% / 0.85)`;
}

export function Stats() {
  const p = prefs.value;
  const s = stats.value;
  const d = daily.value;
  const now = Date.now();
  const items = Object.values(s);
  const thresholds = {
    accuracy: p.practice.masteryAccuracy,
    triadMs: p.practice.masteryTimeTriadMs,
    seventhMs: p.practice.masteryTimeSeventhMs,
  };
  const mastered = items.filter((x) =>
    isMastered(x, thresholds, isSeventhItem(parseItemKey(x.key))),
  ).length;
  const total = items.reduce((a, x) => a + x.attempts, 0);

  return (
    <div class="stats">
      <section class="card">
        <div class="big-stats">
          <div>
            <strong>{streak(d, now)}</strong>
            <span>day streak</span>
          </div>
          <div>
            <strong>{Math.round(totalMinutes(d))}</strong>
            <span>minutes</span>
          </div>
          <div>
            <strong>
              {mastered}/{items.length}
            </strong>
            <span>items mastered</span>
          </div>
        </div>
      </section>
      {total === 0 ? (
        <p class="muted empty">
          No practice recorded yet. Finish a few questions and your progress shows up here.
        </p>
      ) : (
        <>
          <Trend daily={d} now={now} />
          <HeatGrid stats={s} p={p} />
          <Breakdown
            title="By string set"
            groups={groupBy(s, (i) => (i.stringSet === '*' ? null : i.stringSet))}
            label={(k) => k.replace('-', '–')}
          />
          <Breakdown
            title="By mode"
            groups={groupBy(s, (i) => i.mode)}
            label={(k) => MODE_NAMES[k as ModeId] ?? k}
          />
          <Weakest stats={s} p={p} />
        </>
      )}
      <Backup />
    </div>
  );
}

function Trend(props: { daily: typeof daily.value; now: number }) {
  const t = trend(props.daily, props.now, 14);
  const max = Math.max(1, ...t.map((x) => x.attempts));
  const W = 14 * 22;
  return (
    <Section title="Last 14 days">
      <svg
        class="trend"
        viewBox={`0 0 ${W} 80`}
        role="img"
        aria-label="Questions per day, coloured by accuracy"
      >
        {t.map((x, i) => {
          const h = (x.attempts / max) * 64;
          return (
            <g key={x.day}>
              <rect
                x={i * 22 + 3}
                y={70 - h}
                width="16"
                height={Math.max(h, 1)}
                rx="3"
                fill={x.attempts ? heat(x.accuracy) : 'var(--border)'}
              >
                <title>
                  {x.day}: {x.attempts} questions, {pct(x.accuracy)}
                </title>
              </rect>
              <text x={i * 22 + 11} y="79" class="trend-label">
                {x.day.slice(8)}
              </text>
            </g>
          );
        })}
      </svg>
    </Section>
  );
}

function HeatGrid(props: { stats: Record<string, ItemStats>; p: Preferences }) {
  const byKey = groupBy(props.stats, (i) => i.key);
  const keys = [...byKey.keys()].sort();
  return (
    <Section title="Keys × degrees (accuracy · median time)">
      <div class="heat-wrap">
        <table class="heat">
          <tbody>
            {keys.map((k) => {
              const byDeg = groupBy(Object.fromEntries(byKey.get(k)!.map((x) => [x.key, x])), (i) =>
                String(i.degree),
              );
              return (
                <tr key={k}>
                  <th scope="row">{keyLabel(k, props.p)}</th>
                  {[0, 1, 2, 3, 4, 5, 6].map((deg) => {
                    const g = byDeg.get(String(deg));
                    if (!g) return <td key={deg} class="empty-cell" />;
                    const a = aggregate(g);
                    const acc = aggAccuracy(a);
                    return (
                      <td key={deg} style={{ background: heat(acc) }}>
                        <b>{degreeLabel(parseItemKey(g[0].key), props.p)}</b>
                        <span>{pct(acc)}</span>
                        <span>{secs(aggMedian(a))}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Breakdown(props: {
  title: string;
  groups: Map<string, ItemStats[]>;
  label: (k: string) => string;
}) {
  if (props.groups.size === 0) return null;
  return (
    <Section title={props.title}>
      <ul class="rows">
        {[...props.groups.entries()].map(([k, g]) => {
          const a = aggregate(g);
          return (
            <li key={k}>
              <span>{props.label(k)}</span>
              <span class="bar">
                <span style={{ width: pct(aggAccuracy(a)), background: heat(aggAccuracy(a)) }} />
              </span>
              <span class="num">{pct(aggAccuracy(a))}</span>
              <span class="num">{secs(aggMedian(a))}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Weakest(props: { stats: Record<string, ItemStats>; p: Preferences }) {
  const w = weakest(props.stats, 10, props.p.practice.masteryTimeTriadMs);
  if (w.length === 0) return null;
  return (
    <Section title="Weakest items">
      <ol class="weak">
        {w.map((x) => (
          <li key={x.key}>
            <span>
              {itemLabel(parseItemKey(x.key), props.p)}
              <small class="muted"> · {MODE_NAMES[parseItemKey(x.key).mode]}</small>
            </span>
            <span class="num">{pct(rollingAccuracy(x))}</span>
            <span class="num">{secs(medianTime(x))}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        class="btn wide"
        onClick={() => {
          pendingDrill.value = {
            title: 'Weak spots',
            items: w.map((x) => parseItemKey(x.key)),
            passes: 2,
          };
          navigate('practice');
        }}
      >
        Drill these
      </button>
    </Section>
  );
}

function Backup() {
  const [msg, setMsg] = useState<string | null>(null);
  const p = prefs.value;
  const keys = [...new Set(Object.values(stats.value).map((x) => parseItemKey(x.key).key))].sort();
  const [resetKey, setResetKey] = useState('');

  const doExport = () => {
    const b = makeBackup(prefs.value, stats.value, daily.value, Date.now());
    const blob = new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fretboard-chords-backup-${b.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Backup downloaded.');
  };

  const doImport = async (file: File) => {
    const r = parseBackup(await file.text());
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    if (!confirm('Replace your current progress and preferences with this backup?')) return;
    replaceProgress(r.backup.stats, r.backup.daily);
    setPreferences(r.backup.preferences);
    setMsg(
      `Imported ${Object.keys(r.backup.stats).length} items${r.skipped ? `, skipped ${r.skipped} invalid entries` : ''}.`,
    );
  };

  return (
    <Section title="Backup & reset">
      <div class="actions wrap">
        <button type="button" class="btn secondary" onClick={doExport}>
          Export JSON
        </button>
        <label class="btn secondary file-btn">
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = (e.currentTarget as HTMLInputElement).files?.[0];
              if (f) void doImport(f);
              (e.currentTarget as HTMLInputElement).value = '';
            }}
          />
        </label>
      </div>
      {keys.length > 0 && (
        <div class="actions wrap">
          <select
            aria-label="Key to reset"
            value={resetKey}
            onChange={(e) => setResetKey((e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="">Reset one key…</option>
            {keys.map((k) => (
              <option key={k} value={k}>
                {keyLabel(k, p)}
              </option>
            ))}
          </select>
          <button
            type="button"
            class="btn secondary"
            disabled={!resetKey}
            onClick={() => {
              if (!confirm(`Reset all progress for ${keyLabel(resetKey, p)}?`)) return;
              replaceProgress(withoutKey(stats.value, resetKey), daily.value);
              setMsg(`Progress for ${keyLabel(resetKey, p)} reset.`);
              setResetKey('');
            }}
          >
            Reset key
          </button>
        </div>
      )}
      <button
        type="button"
        class="btn secondary wide danger"
        onClick={() => {
          if (!confirm('Reset ALL progress? This cannot be undone (export a backup first).'))
            return;
          replaceProgress({}, {});
          setMsg('All progress reset.');
        }}
      >
        Reset all progress
      </button>
      {msg && (
        <p class="muted" role="status">
          {msg}
        </p>
      )}
    </Section>
  );
}
