import { signal } from '@preact/signals';

export type Route = 'home' | 'explore' | 'prefs' | 'practice' | 'stats' | 'about';
const ROUTES: readonly Route[] = ['home', 'explore', 'prefs', 'practice', 'stats', 'about'];

/** Screens opened "on top" of another one; Back returns to where they were opened from. */
const OVERLAYS: readonly Route[] = ['prefs', 'about'];

function parse(hash: string): Route {
  const r = hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(r) ? r : 'home';
}

export const route = signal<Route>(typeof location === 'undefined' ? 'home' : parse(location.hash));

/** Where an overlay screen (Preferences, About) was opened from. */
export const returnTo = signal<Route | null>(null);

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const next = parse(location.hash);
    trackReturn(route.value, next);
    route.value = next;
  });
}

function trackReturn(from: Route, to: Route): void {
  if (OVERLAYS.includes(to) && !OVERLAYS.includes(from)) returnTo.value = from;
  else if (!OVERLAYS.includes(to)) returnTo.value = null;
}

export function navigate(r: Route): void {
  trackReturn(route.value, r);
  location.hash = r === 'home' ? '' : `#/${r}`;
  route.value = r;
}

/** The top-bar Back button: an overlay returns to where it was opened from, others go home. */
export function goBack(): void {
  const r = route.value;
  const target = OVERLAYS.includes(r) && returnTo.value ? returnTo.value : 'home';
  navigate(target);
}

/** Is `screen` visible, or kept alive underneath an overlay opened from it? */
export function isKeptAlive(screen: Route): boolean {
  return route.value === screen || (OVERLAYS.includes(route.value) && returnTo.value === screen);
}
