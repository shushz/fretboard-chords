import { useEffect, useState } from 'preact/hooks';

/** Current viewport width in CSS px (updates on resize / rotation). */
export function useViewportWidth(): number {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 412 : window.innerWidth));
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return w;
}

/** Width of the side column used next to the board on short landscape screens. */
export const SIDE_COLUMN_PX = 280;

/** Short landscape screens (phones on their side) put the question beside the board. */
export function isCompactLandscape(w: number, h: number): boolean {
  return w > h && h < 600;
}

/** Horizontal space available to the fretboard, in CSS px. */
export function boardWidthFor(w: number, h: number): number {
  const usable = Math.min(w, 1200) - 24;
  return isCompactLandscape(w, h) ? usable - SIDE_COLUMN_PX - 16 : usable;
}

/** Like useViewportWidth, but returns the width the fretboard can use. */
export function useBoardWidth(): number {
  const [s, setS] = useState(() =>
    typeof window === 'undefined'
      ? { w: 412, h: 915 }
      : { w: window.innerWidth, h: window.innerHeight },
  );
  useEffect(() => {
    const on = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return boardWidthFor(s.w, s.h);
}
