import { describe, expect, it } from 'vitest';
import { SIDE_COLUMN_PX, boardWidthFor, isCompactLandscape } from './useViewport';
import {
  REGION_PAD,
  STRING_GAP,
  boardGeometry,
  chooseVisibleRange,
  fretCell,
  fretCenterX,
  stringY,
  visibleFrets,
} from './fretboardGeometry';

describe('fretboard geometry', () => {
  it('fret numbers sit fully below the board and fret wires', () => {
    const g = boardGeometry(0, 15);
    const fontPx = 12;
    expect(g.numbersY - fontPx).toBeGreaterThan(g.boardBottom);
    expect(g.numbersY).toBeLessThanOrEqual(g.height - 4);
  });
  it('the region border stays clear of the fret dots between strings', () => {
    const dotRadius = 6;
    // dots sit halfway between strings; the border is REGION_PAD from the outer string
    expect(REGION_PAD).toBeLessThan(STRING_GAP / 2 - dotRadius);
    expect(REGION_PAD).toBeGreaterThan(10);
  });
  it('compact landscape leaves room for the side column', () => {
    expect(isCompactLandscape(915, 412)).toBe(true);
    expect(isCompactLandscape(412, 915)).toBe(false);
    expect(isCompactLandscape(1280, 800)).toBe(false);
    expect(boardWidthFor(412, 915)).toBe(388);
    expect(boardWidthFor(915, 412)).toBe(915 - 24 - SIDE_COLUMN_PX - 16);
    // tablets and wide screens use the side column too
    expect(boardWidthFor(820, 1180)).toBe(820 - 24 - SIDE_COLUMN_PX - 16);
    expect(boardWidthFor(1600, 900)).toBe(1200 - 24 - SIDE_COLUMN_PX - 16);
  });
  it('lays out frets left to right and mirrors for left-handed', () => {
    const g = boardGeometry(0, 5);
    expect(fretCenterX(g, 1)).toBeGreaterThan(fretCenterX(g, 0));
    expect(fretCenterX(g, 5)).toBeGreaterThan(fretCenterX(g, 4));
    const l = boardGeometry(0, 5, true);
    expect(fretCenterX(l, 1)).toBeLessThan(fretCenterX(l, 0));
    expect(fretCenterX(l, 3)).toBeCloseTo(l.width - fretCenterX(g, 3));
    expect(fretCell(l, 2).x).toBeCloseTo(l.width - fretCell(g, 2).x - g.fretWidth);
  });
  it('string 1 at top', () => {
    const g = boardGeometry(3, 9);
    expect(stringY(g, 1)).toBeLessThan(stringY(g, 6));
    expect(visibleFrets(g)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(g.openWidth).toBe(0);
  });
  it('cells are ≥ 44 px', () => {
    const g = boardGeometry(0, 15);
    expect(g.fretWidth).toBeGreaterThanOrEqual(44);
    expect(g.stringGap).toBeGreaterThanOrEqual(44);
  });
  it('chooses a visible range around the window on narrow screens', () => {
    expect(chooseVisibleRange({ start: 5, width: 5 }, 15, 1000)).toEqual({ from: 0, to: 15 });
    const r = chooseVisibleRange({ start: 5, width: 5 }, 15, 388);
    expect(r.from).toBeLessThanOrEqual(5);
    expect(r.to).toBeGreaterThanOrEqual(9);
    expect(chooseVisibleRange({ start: 0, width: 5 }, 15, 388).from).toBe(0);
    expect(chooseVisibleRange({ start: 11, width: 5 }, 15, 388).to).toBe(15);
  });
  it('rendered cells stay ≥ 44 px in both directions at phone widths', () => {
    for (const avail of [388, 579, 700, 1000]) {
      const r = chooseVisibleRange({ start: 5, width: 5 }, 15, avail);
      const g = boardGeometry(r.from, r.to);
      const scale = Math.min(1, avail / g.width);
      expect(g.fretWidth * scale).toBeGreaterThanOrEqual(44);
      expect(g.stringGap * scale).toBeGreaterThanOrEqual(44);
    }
  });
});
