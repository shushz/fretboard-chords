import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * Wraps the fretboard. When the board is wider than the screen it scrolls sideways;
 * this frame fades the edge(s) with more frets and shows a ‹ / › cue there.
 */
export function BoardFrame(props: { children: ComponentChildren }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  const update = () => {
    const w = wrap.current;
    if (!w) return;
    const left = w.scrollLeft > 2;
    const right = w.scrollLeft + w.clientWidth < w.scrollWidth - 2;
    setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
  };

  // After every render (the board's range can change) and on resize.
  useEffect(update);
  useEffect(() => {
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div
      class="board-frame"
      data-more-left={more.left || undefined}
      data-more-right={more.right || undefined}
    >
      <div class="board-wrap" ref={wrap} onScroll={update}>
        {props.children}
      </div>
      {more.left && (
        <span class="more-cue left" aria-hidden="true">
          ‹
        </span>
      )}
      {more.right && (
        <span class="more-cue right" aria-hidden="true">
          ›
        </span>
      )}
    </div>
  );
}
