import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { prefs, setPreferences } from '../../prefs/store';
import { answerLog, daily, replaceProgress, stats } from '../../progress/store';
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
  weakest,
} from '../../progress/stats';
import { makeBackup, parseBackup, withoutKey } from '../../progress/backup';
import {
  type ChordFunction,
  type TrendFilter,
  type TrendPoint,
  compareRecent,
  dailyTrend,
  functionKey,
  functionOf,
} from '../../progress/log';
import { MODE_NAMES, itemLabel, keyLabel } from '../../progress/labels';
import { type ModeId, parseItemKey } from '../../progress/types';
import type { Preferences } from '../../prefs/model';
import { Section } from '../controls';
import { key as makeKey, scale } from '../../theory/keys';
import { note } from '../../theory/notes';
import { type DegreeIndex, type Quality, romanNumeral } from '../../theory/chords';
import { numeralOptions } from '../../prefs/model';
import { readableTextOn } from '../contrast';
import { pendingDrill } from '../../exercises/drillState';
import { MODES } from '../../exercises/modes';
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
  return hslHex(acc * 120, 0.65, 0.45);
}

/** #rrggbb for an HSL colour (so text colour can be picked for contrast). */
function hslHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    '#' +
    [f(0), f(8), f(4)]
      .map((x) =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** "iv" for a chord function, using C major / A minor as a neutral reference key. */
function functionNumeral(f: ChordFunction): string {
  const ref = f.keyMode === 'major' ? makeKey(note('C'), 'major') : makeKey(note('A'), 'minor');
  const d = f.degree as DegreeIndex;
  return romanNumeral(ref, d, scale(ref)[d], f.quality as Quality, numeralOptions());
}

function functionLabel(f: ChordFunction): string {
  const set = f.stringSet === '*' ? '' : ` · strings ${f.stringSet.replace('-', '–')}`;
  return `${functionNumeral(f)} in ${f.keyMode} keys${set}`;
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
  const [mode, setMode] = useState<ModeId | null>(null);
  const [fn, setFn] = useState<ChordFunction | null>(null);
  const filter: TrendFilter = { mode: mode ?? undefined, fn: fn ?? undefined };
  const modesUsed = MODES.filter((m) => items.some((x) => parseItemKey(x.key).mode === m.id));

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
            <span>minutes practised</span>
          </div>
          <div>
            <strong>
              {mastered}/{items.length}
            </strong>
            <span>items mastered</span>
          </div>
        </div>
        <p class="explain">
          An <i>item</i> is one chord in one key, on one string set, in one mode. It's mastered at{' '}
          {Math.round(p.practice.masteryAccuracy * 100)} % right over its last 10 tries, answered in
          under {(p.practice.masteryTimeTriadMs / 1000).toFixed(1)} s.
        </p>
      </section>
      {total === 0 ? (
        <p class="muted empty">
          No practice recorded yet. Finish a few questions and your progress shows up here.
        </p>
      ) : (
        <>
          <div class="filter-row" role="group" aria-label="Show">
            <button
              type="button"
              class={`chip${mode === null ? ' on' : ''}`}
              aria-pressed={mode === null}
              onClick={() => {
                setMode(null);
                setFn(null);
              }}
            >
              All modes
            </button>
            {modesUsed.map((m) => (
              <button
                type="button"
                key={m.id}
                class={`chip${mode === m.id ? ' on' : ''}`}
                aria-pressed={mode === m.id}
                onClick={() => {
                  setMode(m.id);
                  setFn(null);
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
          <Improvement filter={filter} fn={fn} onClearFn={() => setFn(null)} />
          <WhatToPractise stats={s} mode={mode} selected={fn} onSelect={setFn} />
          <Weakest stats={s} p={p} />
          <ByKey stats={s} p={p} />
        </>
      )}
      <Backup />
    </div>
  );
}

function Improvement(props: {
  filter: TrendFilter;
  fn: ChordFunction | null;
  onClearFn: () => void;
}) {
  const pts = dailyTrend(answerLog.value, props.filter, 30);
  const cmp = compareRecent(answerLog.value, props.filter, 7);
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked !== null && picked < pts.length ? pts[picked] : null;
  return (
    <Section title="Getting better?">
      <p class="explain">
        How you did on each day you practised (days off are skipped): the share of right answers,
        and how long your right answers took.
        {props.fn ? ' Showing one chord across all keys.' : ''}
      </p>
      {props.fn && (
        <button type="button" class="chip on fn-chip" onClick={props.onClearFn}>
          {functionLabel(props.fn)} ✕
        </button>
      )}
      {pts.length === 0 ? (
        <p class="muted">
          Nothing to show yet for this selection. Trends build up from now on as you practise.
        </p>
      ) : (
        <>
          {cmp && <p class="trend-summary">{describeComparison(cmp)}</p>}
          <LineChart
            title="Right answers"
            points={pts}
            value={(x) => x.accuracy}
            max={1}
            ticks={[0, 0.5, 1]}
            format={(v) => `${Math.round(v * 100)}%`}
            picked={picked}
            onPick={setPicked}
          />
          <LineChart
            title="Time per right answer (median)"
            points={pts}
            value={(x) => (x.medianMs === null ? null : x.medianMs / 1000)}
            max={niceMax(Math.max(1, ...pts.map((x) => (x.medianMs ?? 0) / 1000)))}
            ticks={null}
            format={(v) => `${v.toFixed(1)} s`}
            picked={picked}
            onPick={setPicked}
          />
          <p class="chart-readout" aria-live="polite">
            {sel
              ? `${formatDay(sel.day)}: ${sel.answers} answers, ${pct(sel.accuracy)} right, ${secs(sel.medianMs)} per right answer`
              : 'Tap a point to see that day.'}
          </p>
        </>
      )}
    </Section>
  );
}

function describeComparison(c: NonNullable<ReturnType<typeof compareRecent>>): string {
  const span = c.days === 1 ? 'your last practice day' : `your last ${c.days} practice days`;
  const prev = c.days === 1 ? 'the day before' : `the ${c.days} before`;
  const acc = Math.round((c.after.accuracy - c.before.accuracy) * 100);
  const parts = [`${pct(c.after.accuracy)} right (${acc >= 0 ? '+' : '−'}${Math.abs(acc)} points)`];
  if (c.after.medianMs !== null && c.before.medianMs !== null) {
    const dt = (c.after.medianMs - c.before.medianMs) / 1000;
    parts.push(
      `${secs(c.after.medianMs)} per right answer (${dt <= 0 ? '−' : '+'}${Math.abs(dt).toFixed(1)} s)`,
    );
  }
  return `In ${span}: ${parts.join(', ')}, compared with ${prev}.`;
}

function niceMax(v: number): number {
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 60]) if (v <= m) return m;
  return Math.ceil(v / 10) * 10;
}

function formatDay(day: string): string {
  const [y, m, dd] = day.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** One series, one axis. Points are tappable; the readout below names the picked day. */
function LineChart(props: {
  title: string;
  points: TrendPoint[];
  value: (p: TrendPoint) => number | null;
  max: number;
  ticks: number[] | null;
  format: (v: number) => string;
  picked: number | null;
  onPick: (i: number) => void;
}) {
  const W = 320;
  const H = 110;
  const L = 40;
  const R = 10;
  const T = 8;
  const B = 22;
  const n = props.points.length;
  const x = (i: number) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - v / props.max) * (H - T - B);
  const ticks = props.ticks ?? [0, props.max / 2, props.max];
  const vals = props.points.map(props.value);
  const path = vals
    .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');
  return (
    <figure class="line-chart">
      <figcaption>{props.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${props.title} per practice day`}>
        {ticks.map((t) => (
          <g key={t}>
            <line class="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text class="tick" x={L - 6} y={y(t)} dy="0.35em">
              {props.format(t)}
            </text>
          </g>
        ))}
        <text class="tick" x={x(0)} y={H - 6} text-anchor={n === 1 ? 'middle' : 'start'}>
          {formatDay(props.points[0].day)}
        </text>
        {n > 1 && (
          <text class="tick" x={x(n - 1)} y={H - 6} text-anchor="end">
            {formatDay(props.points[n - 1].day)}
          </text>
        )}
        <polyline class="series" points={path} />
        {props.points.map((pt, i) => {
          const v = vals[i];
          if (v === null) return null;
          return (
            <g key={pt.day}>
              <circle
                class={`dot${props.picked === i ? ' picked' : ''}${pt.answers < 5 ? ' thin' : ''}`}
                cx={x(i)}
                cy={y(v)}
                r={props.picked === i ? 6 : 4}
              />
              <circle class="hit" cx={x(i)} cy={y(v)} r="14" onClick={() => props.onPick(i)}>
                <title>
                  {formatDay(pt.day)}: {props.format(v)} ({pt.answers} answers)
                </title>
              </circle>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/**
 * The practice map: one row per chord function (a numeral of major or minor keys, across all
 * keys), one column per string set. Tap a cell to see its trend and practise it.
 */
function WhatToPractise(props: {
  stats: Record<string, ItemStats>;
  mode: ModeId | null;
  selected: ChordFunction | null;
  onSelect: (f: ChordFunction) => void;
}) {
  const rows = new Map<string, ChordFunction>();
  const cols = new Set<string>();
  const cells = new Map<string, ItemStats[]>();
  for (const st of Object.values(props.stats)) {
    const it = parseItemKey(st.key);
    if (props.mode && it.mode !== props.mode) continue;
    const f = functionOf(it);
    const rowKey = functionKey({ ...f, stringSet: '*' });
    rows.set(rowKey, { ...f, stringSet: '*' });
    cols.add(f.stringSet);
    const ck = functionKey(f);
    cells.set(ck, [...(cells.get(ck) ?? []), st]);
  }
  const colList = [...cols].sort((a, b) =>
    a === '*' ? 1 : b === '*' ? -1 : stringOrder(a) - stringOrder(b),
  );
  const rowList = [...rows.values()].sort(
    (a, b) =>
      (a.keyMode === b.keyMode ? 0 : a.keyMode === 'major' ? -1 : 1) ||
      a.degree - b.degree ||
      a.quality.localeCompare(b.quality),
  );
  const selKey = props.selected ? functionKey(props.selected) : null;
  const selItems = selKey ? (cells.get(selKey) ?? []) : [];

  return (
    <Section title="What to practise">
      <p class="explain">
        Each row is a chord by its numeral, across all keys (e.g. <i>iv</i> in minor keys is B♭m in
        Fm, C♯m in G♯m…). Each column is a group of strings. Colour shows how often you've been
        right lately, the small number how long you take. Tap a cell to see that chord's trend above
        and to practise it.
      </p>
      <div class="heat-wrap">
        <table class="heat fn-grid">
          <thead>
            <tr>
              <th scope="col">
                <span class="sr-only">Chord</span>
              </th>
              {colList.map((c) => (
                <th key={c} scope="col" class="heat-col">
                  {c === '*' ? 'no board' : c.replace('-', '–')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowList.map((r, i) => {
              const first = i === 0 || rowList[i - 1].keyMode !== r.keyMode;
              return (
                <Fragment key={functionKey(r)}>
                  {first && (
                    <tr class="group-row">
                      <th colSpan={colList.length + 1} scope="rowgroup">
                        {r.keyMode === 'major' ? 'Major keys' : 'Minor keys'}
                      </th>
                    </tr>
                  )}
                  <tr>
                    <th scope="row">{functionNumeral(r)}</th>
                    {colList.map((c) => {
                      const f = { ...r, stringSet: c as ChordFunction['stringSet'] };
                      const g = cells.get(functionKey(f));
                      if (!g) return <td key={c} class="empty-cell" />;
                      const a = aggregate(g);
                      const acc = aggAccuracy(a);
                      const on = selKey === functionKey(f);
                      return (
                        <td key={c} class={on ? 'picked' : ''}>
                          <button
                            type="button"
                            class="cell-btn"
                            style={{ background: heat(acc), color: readableTextOn(heat(acc)) }}
                            aria-pressed={on}
                            aria-label={`${functionLabel(f)}: ${pct(acc)} right, ${secs(aggMedian(a))}`}
                            onClick={() => props.onSelect(f)}
                          >
                            <b>{pct(acc)}</b>
                            <span>{secs(aggMedian(a))}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {props.selected && selItems.length > 0 && (
        <div class="fn-detail">
          <p>
            <b>{functionLabel(props.selected)}</b>: {selItems.reduce((n, x) => n + x.attempts, 0)}{' '}
            answers in {new Set(selItems.map((x) => parseItemKey(x.key).key)).size} key
            {new Set(selItems.map((x) => parseItemKey(x.key).key)).size === 1 ? '' : 's'}
            {props.mode ? ` (${MODE_NAMES[props.mode]})` : ''}.
          </p>
          <button
            type="button"
            class="btn wide"
            onClick={() => {
              const items = [...selItems]
                .sort(
                  (a, b) =>
                    rollingAccuracy(a) - rollingAccuracy(b) || medianTime(b) - medianTime(a),
                )
                .slice(0, 10)
                .map((x) => parseItemKey(x.key));
              pendingDrill.value = { title: functionNumeral(props.selected!), items, passes: 2 };
              navigate('practice');
            }}
          >
            Practise this
          </button>
        </div>
      )}
    </Section>
  );
}

function stringOrder(s: string): number {
  const [a, b] = s.split('-').map(Number);
  return a * 10 + b;
}

function ByKey(props: { stats: Record<string, ItemStats>; p: Preferences }) {
  const groups = groupBy(props.stats, (i) => i.key);
  if (groups.size < 2) return null;
  return (
    <Section title="By key">
      <p class="explain">
        Chord names and spellings change from key to key; this mostly matters for Name the chord and
        for finding roots quickly.
      </p>
      <ul class="rows">
        {[...groups.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, g]) => {
            const a = aggregate(g);
            return (
              <li key={k}>
                <span>{keyLabel(k, props.p)}</span>
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
    const b = makeBackup(prefs.value, stats.value, daily.value, Date.now(), answerLog.value);
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
    replaceProgress(r.backup.stats, r.backup.daily, r.backup.log ?? []);
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
          replaceProgress({}, {}, []);
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
