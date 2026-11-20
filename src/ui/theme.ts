import { effect } from '@preact/signals';
import { prefs } from '../prefs/store';

/** Apply the theme preference to <html data-theme>. 'system' removes the attribute. */
export function installTheme(): void {
  effect(() => {
    const t = prefs.value.look.theme;
    const el = document.documentElement;
    if (t === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', t);
    const dark =
      t === 'dark' ||
      (t === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#14181f' : '#f4f2ee');
  });
}
