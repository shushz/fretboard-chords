import type { ComponentChildren } from 'preact';

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div class="field">
      <span class="field-label">{props.label}</span>
      <div class="segmented" role="radiogroup" aria-label={props.label}>
        {props.options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            role="radio"
            aria-checked={o.value === props.value}
            class={o.value === props.value ? 'on' : ''}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MultiToggle<T extends string>(props: {
  label: string;
  values: readonly T[];
  options: readonly Option<T>[];
  onChange: (v: T[]) => void;
  /** Keep at least this many selected. */
  min?: number;
}) {
  const min = props.min ?? 1;
  return (
    <div class="field">
      <span class="field-label">{props.label}</span>
      <div class="segmented multi" role="group" aria-label={props.label}>
        {props.options.map((o) => {
          const on = props.values.includes(o.value);
          return (
            <button
              type="button"
              key={o.value}
              aria-pressed={on}
              class={on ? 'on' : ''}
              onClick={() => {
                if (on && props.values.length <= min) return;
                const next = on
                  ? props.values.filter((v) => v !== o.value)
                  : props.options
                      .map((x) => x.value)
                      .filter((v) => v === o.value || props.values.includes(v));
                props.onChange(next);
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label class="toggle">
      <span>
        {props.label}
        {props.hint && <small class="hint">{props.hint}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={props.checked}
        onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
      />
    </label>
  );
}

export function Select<T extends string | number>(props: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <label class="field select">
      <span class="field-label">{props.label}</span>
      <select
        value={String(props.value)}
        onChange={(e) => {
          const raw = (e.currentTarget as HTMLSelectElement).value;
          const opt = props.options.find((o) => String(o.value) === raw);
          if (opt) props.onChange(opt.value);
        }}
      >
        {props.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Stepper(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const step = props.step ?? 1;
  const fmt = props.format ?? String;
  return (
    <div class="field stepper">
      <span class="field-label">{props.label}</span>
      <div class="stepper-row">
        <button
          type="button"
          aria-label={`Decrease ${props.label}`}
          disabled={props.value <= props.min}
          onClick={() => props.onChange(Math.max(props.min, +(props.value - step).toFixed(4)))}
        >
          −
        </button>
        <output aria-live="polite">{fmt(props.value)}</output>
        <button
          type="button"
          aria-label={`Increase ${props.label}`}
          disabled={props.value >= props.max}
          onClick={() => props.onChange(Math.min(props.max, +(props.value + step).toFixed(4)))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Section(props: { title: string; children: ComponentChildren }) {
  return (
    <section class="card">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}
