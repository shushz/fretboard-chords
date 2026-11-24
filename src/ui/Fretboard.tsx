import { useEffect, useRef } from 'preact/hooks';
import { readableTextOn } from './contrast';
import type { Region } from '../fretboard/regions';
import { stringsOf, windowEnd } from '../fretboard/regions';
import { FRET_MARKERS, STRINGS, type StringNum, isDoubleMarker } from '../fretboard/tuning';
import {
  boardGeometry,
  fretCell,
  fretCenterX,
  MIN_SCALE,
  REGION_PAD,
  fretWireX,
  stringY,
  visibleFrets,
} from './fretboardGeometry';

export type MarkerKind =
  /** A note the user tapped (not graded yet). */
  | 'tap'
  /** A note given by the question (e.g. the shown voicing). */
  | 'shown'
  /** Dimmed reference (ghost anchor). */
  | 'ghost'
  | 'correct'
  | 'wrong'
  /** Correct answer revealed after an error. */
  | 'reveal'
  /** Reference shape outside the active region (explorer), drawn faded. */
  | 'outside'
  /** Correct note, but the user's answer for it was wrong (role color + red ring). */
  | 'missed'
  /** The shape a question gave you, faded after answering. */
  | 'given';

export interface Marker {
  string: StringNum;
  fret: number;
  kind: MarkerKind;
  label?: string;
  /** Small text under the circle (e.g. note name when roles are shown). */
  sublabel?: string;
  /** Fill color (role color). Neutral if omitted. */
  color?: string;
  /** Label color (defaults to a readable dark/white on `color`). */
  textColor?: string;
}

export interface FretboardProps {
  fromFret: number;
  toFret: number;
  region?: Region;
  /** Highlight these strings instead of the region's string set. */
  regionStrings?: readonly StringNum[];
  markers?: readonly Marker[];
  leftHanded?: boolean;
  showFretNumbers?: boolean;
  onTap?: (string: StringNum, fret: number) => void;
  label?: string;
}

const STRING_WIDTH: Record<StringNum, number> = { 1: 1.2, 2: 1.5, 3: 1.9, 4: 2.3, 5: 2.8, 6: 3.3 };

export function Fretboard(props: FretboardProps) {
  const { fromFret, toFret, region, markers = [], leftHanded = false, onTap } = props;
  const g = boardGeometry(fromFret, toFret, leftHanded);
  const frets = visibleFrets(g);
  const fretted = frets.filter((f) => f > 0);
  const boardLeft = leftHanded ? 6 : 6;
  const boardRight = g.width - 6;
  const midY = (stringY(g, 3) + stringY(g, 4)) / 2;

  // Region rectangle (in board coordinates)
  let regionRect: { x: number; y: number; w: number; h: number } | null = null;
  if (region) {
    const ss = props.regionStrings ?? stringsOf(region.stringSet);
    // Open strings count as inside a window starting at fret 1: include their column.
    const start = region.window.start === 1 && fromFret === 0 ? 0 : region.window.start;
    const lo = Math.max(start, fromFret);
    const hi = Math.min(windowEnd(region.window), toFret);
    if (lo <= hi) {
      const a = fretCell(g, lo);
      const b = fretCell(g, hi);
      const x = Math.min(a.x, b.x);
      const w = Math.max(a.x + a.w, b.x + b.w) - x;
      const y = stringY(g, ss[0]) - REGION_PAD;
      const h = (ss.length - 1) * g.stringGap + 2 * REGION_PAD;
      regionRect = { x, y, w, h };
    }
  }

  // When the board needs more room than the screen has, it keeps touch-size cells and
  // scrolls sideways (instead of shrinking); bring the active region into view.
  const svgRef = useRef<SVGSVGElement>(null);
  const regionCenter = regionRect ? regionRect.x + regionRect.w / 2 : null;
  useEffect(() => {
    const svg = svgRef.current;
    const wrap = svg?.parentElement;
    if (!svg || !wrap || regionCenter === null || wrap.scrollWidth <= wrap.clientWidth) return;
    const scale = svg.getBoundingClientRect().width / g.width;
    wrap.scrollLeft = regionCenter * scale - wrap.clientWidth / 2;
  }, [regionCenter, g.width]);

  const markerAt = new Map(markers.map((m) => [`${m.string}:${m.fret}`, m]));

  return (
    <svg
      ref={svgRef}
      style={{ minWidth: `${Math.round(g.width * MIN_SCALE)}px` }}
      class="fretboard"
      viewBox={`0 0 ${g.width} ${g.height}`}
      width={g.width}
      role="group"
      aria-label={props.label ?? 'Fretboard'}
    >
      <defs>
        <mask id="region-mask">
          <rect x="0" y="0" width={g.width} height={g.height} fill="white" />
          {regionRect && (
            <rect
              x={regionRect.x}
              y={regionRect.y}
              width={regionRect.w}
              height={regionRect.h}
              rx="8"
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        class="fb-board"
        x={boardLeft}
        y={g.top - g.stringGap / 2}
        width={boardRight - boardLeft}
        height={g.stringGap * 6}
        rx="6"
      />
      {/* Fret wires */}
      {fretted.map((f) => (
        <line
          key={`f${f}`}
          class="fb-fret"
          x1={fretWireX(g, f)}
          x2={fretWireX(g, f)}
          y1={g.top - g.stringGap / 2 + 2}
          y2={g.boardBottom - 2}
        />
      ))}
      {/* Nut or left edge */}
      <line
        class={fromFret === 0 ? 'fb-nut' : 'fb-fret'}
        x1={leftHanded ? g.width - g.edgeX : g.edgeX}
        x2={leftHanded ? g.width - g.edgeX : g.edgeX}
        y1={g.top - g.stringGap / 2 + 2}
        y2={g.boardBottom - 2}
      />
      {/* Strings */}
      {STRINGS.map((s) => (
        <line
          key={`s${s}`}
          class="fb-string"
          x1={boardLeft}
          x2={boardRight}
          y1={stringY(g, s)}
          y2={stringY(g, s)}
          stroke-width={STRING_WIDTH[s]}
        />
      ))}
      {/* Dim everything outside the active region */}
      {regionRect && (
        <>
          <rect
            class="fb-dim"
            x={boardLeft}
            y={g.top - g.stringGap / 2}
            width={boardRight - boardLeft}
            height={g.stringGap * 6}
            mask="url(#region-mask)"
          />
          <rect
            class="fb-region"
            x={regionRect.x}
            y={regionRect.y}
            width={regionRect.w}
            height={regionRect.h}
            rx="8"
          />
        </>
      )}
      {/* Fret position markers (drawn above the dimming so they stay readable) */}
      {fretted
        .filter((f) => FRET_MARKERS.includes(f))
        .map((f) =>
          isDoubleMarker(f) ? (
            <g key={`m${f}`}>
              <circle class="fb-dot" cx={fretCenterX(g, f)} cy={midY - g.stringGap} r="6" />
              <circle class="fb-dot" cx={fretCenterX(g, f)} cy={midY + g.stringGap} r="6" />
            </g>
          ) : (
            <circle key={`m${f}`} class="fb-dot" cx={fretCenterX(g, f)} cy={midY} r="6" />
          ),
        )}
      {/* Fret numbers */}
      {props.showFretNumbers !== false &&
        frets.map((f) => (
          <text
            key={`n${f}`}
            class={`fb-fretnum${FRET_MARKERS.includes(f) ? ' strong' : ''}`}
            x={fretCenterX(g, f)}
            y={g.numbersY}
          >
            {f}
          </text>
        ))}
      {/* Notes */}
      {markers
        .filter((m) => m.fret >= fromFret && m.fret <= toFret)
        .map((m) => (
          <g
            key={`${m.string}:${m.fret}`}
            class={`fb-note ${m.kind}`}
            transform={`translate(${fretCenterX(g, m.fret)} ${stringY(g, m.string)})`}
            data-testid={`note-${m.string}-${m.fret}`}
            data-kind={m.kind}
          >
            <circle r="17" style={m.color ? { fill: m.color } : undefined} />
            {m.label && (
              <text
                class="fb-label"
                dy="0.35em"
                style={
                  m.color && m.kind !== 'wrong'
                    ? { fill: m.textColor ?? readableTextOn(m.color) }
                    : undefined
                }
              >
                {m.label}
              </text>
            )}
            {m.sublabel && (
              <text class="fb-sublabel" y="27">
                {m.sublabel}
              </text>
            )}
          </g>
        ))}
      {/* Tap targets */}
      {onTap &&
        STRINGS.map((s) =>
          frets.map((f) => {
            const c = fretCell(g, f);
            const m = markerAt.get(`${s}:${f}`);
            return (
              <rect
                key={`t${s}:${f}`}
                class="fb-target"
                x={c.x}
                y={stringY(g, s) - g.stringGap / 2}
                width={c.w}
                height={g.stringGap}
                role="button"
                aria-label={`String ${s} fret ${f}${m?.label ? ` (${m.label})` : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onTap(s, f);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onTap(s, f);
                }}
              />
            );
          }),
        )}
    </svg>
  );
}
