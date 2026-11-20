/** Pure geometry for the SVG fretboard (testable without a DOM). Units = CSS px at 1:1. */
import type { StringNum } from '../fretboard/tuning';

export interface BoardGeometry {
  fromFret: number;
  toFret: number;
  leftHanded: boolean;
  width: number;
  height: number;
  /** Board (strings area) top/bottom. */
  top: number;
  bottom: number;
  stringGap: number;
  fretWidth: number;
  openWidth: number;
  /** x of the nut (only if fromFret === 0) or of the left edge line. */
  edgeX: number;
}

export const STRING_GAP = 46;
export const FRET_WIDTH = 50;
export const OPEN_WIDTH = 40;
const PAD_TOP = 26;
const PAD_BOTTOM = 30;
const PAD_SIDE = 6;

export function boardGeometry(fromFret: number, toFret: number, leftHanded = false): BoardGeometry {
  const hasOpen = fromFret === 0;
  const first = Math.max(1, fromFret);
  const fretted = Math.max(0, toFret - first + 1);
  const width = PAD_SIDE * 2 + (hasOpen ? OPEN_WIDTH : 0) + fretted * FRET_WIDTH;
  const top = PAD_TOP;
  const bottom = top + STRING_GAP * 5;
  return {
    fromFret,
    toFret,
    leftHanded,
    width,
    height: bottom + PAD_BOTTOM,
    top,
    bottom,
    stringGap: STRING_GAP,
    fretWidth: FRET_WIDTH,
    openWidth: hasOpen ? OPEN_WIDTH : 0,
    edgeX: PAD_SIDE + (hasOpen ? OPEN_WIDTH : 0),
  };
}

function mirror(g: BoardGeometry, x: number): number {
  return g.leftHanded ? g.width - x : x;
}

/** Centre x of a fret cell (fret 0 = open-string column). */
export function fretCenterX(g: BoardGeometry, fret: number): number {
  if (fret === 0) return mirror(g, PAD_SIDE + g.openWidth / 2);
  const first = Math.max(1, g.fromFret);
  return mirror(g, g.edgeX + (fret - first + 0.5) * g.fretWidth);
}

/** x of the fret wire on the high side of `fret` (fret = 0 → nut). */
export function fretWireX(g: BoardGeometry, fret: number): number {
  const first = Math.max(1, g.fromFret);
  return mirror(g, g.edgeX + (fret - first + 1) * g.fretWidth);
}

/** Cell rectangle for tap targets: [x, width] already mirrored. */
export function fretCell(g: BoardGeometry, fret: number): { x: number; w: number } {
  if (fret === 0) {
    const x0 = PAD_SIDE;
    const x = g.leftHanded ? g.width - x0 - g.openWidth : x0;
    return { x, w: g.openWidth };
  }
  const first = Math.max(1, g.fromFret);
  const x0 = g.edgeX + (fret - first) * g.fretWidth;
  return { x: g.leftHanded ? g.width - x0 - g.fretWidth : x0, w: g.fretWidth };
}

export function stringY(g: BoardGeometry, s: StringNum): number {
  return g.top + (s - 1) * g.stringGap;
}

export function visibleFrets(g: BoardGeometry): number[] {
  const out: number[] = [];
  for (let f = g.fromFret; f <= g.toFret; f++) out.push(f);
  return out;
}

/**
 * Which frets to show: the whole neck when there's room, otherwise the region window
 * with context padding, so each fret cell stays a comfortable touch target.
 * `availablePx` is the width the board can take; `minCellPx` is the minimum cell width.
 */
export function chooseVisibleRange(
  window: { start: number; width: number },
  maxFret: number,
  availablePx: number,
  minCellPx = 44,
): { from: number; to: number } {
  const fullCells = maxFret + 1;
  if (availablePx / fullCells >= minCellPx) return { from: 0, to: maxFret };
  const cells = Math.max(window.width, Math.floor(availablePx / minCellPx));
  const extra = cells - window.width;
  let from = window.start - Math.floor(extra / 2);
  let to = from + cells - 1;
  if (from < 0) {
    to -= from;
    from = 0;
  }
  if (to > maxFret) {
    from = Math.max(0, from - (to - maxFret));
    to = maxFret;
  }
  return { from, to };
}
