import { signal } from '@preact/signals';

export type Route = 'home' | 'explore' | 'prefs' | 'practice' | 'stats';
const ROUTES: readonly Route[] = ['home', 'explore', 'prefs', 'practice', 'stats'];

function parse(hash: string): Route {
  const r = hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(r) ? r : 'home';
}

export const route = signal<Route>(typeof location === 'undefined' ? 'home' : parse(location.hash));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    route.value = parse(location.hash);
  });
}

export function navigate(r: Route): void {
  location.hash = r === 'home' ? '' : `#/${r}`;
  route.value = r;
}
