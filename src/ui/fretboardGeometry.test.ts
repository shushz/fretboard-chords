import { describe, expect, it } from 'vitest';
import {
  boardGeometry,
  chooseVisibleRange,
  fretCell,
  fretCenterX,
  stringY,
  visibleFrets,
} from './fretboardGeometry';

describe('fretboard geometry', () => {
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
    const r = chooseVisibleRange({ start: 5, width: 5 }, 15, 400);
    expect(r.to - r.from + 1).toBe(9);
    expect(r.from).toBeLessThanOrEqual(5);
    expect(r.to).toBeGreaterThanOrEqual(9);
    expect(chooseVisibleRange({ start: 0, width: 5 }, 15, 400)).toEqual({ from: 0, to: 8 });
    expect(chooseVisibleRange({ start: 11, width: 5 }, 15, 400)).toEqual({ from: 7, to: 15 });
  });
});
