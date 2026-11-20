import { registerSW } from 'virtual:pwa-register';

/** Register the service worker (precaches every asset for offline use). */
export function installServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
