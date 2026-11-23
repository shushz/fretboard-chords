import { type UseStore, createStore, del, get, set } from 'idb-keyval';
import { PREVIEW_PR, storageNames } from './env';

const names = storageNames(PREVIEW_PR);
let store: UseStore | undefined;

/** The IndexedDB store: idb-keyval's default for the live app, a separate one per preview. */
function useStore(): UseStore | undefined {
  if (names.db && !store) store = createStore(names.db, 'keyval');
  return store;
}

export function kvGet<T = unknown>(key: string): Promise<T | undefined> {
  return get<T>(key, useStore());
}

export function kvSet(key: string, value: unknown): Promise<void> {
  return set(key, value, useStore());
}

export function kvDel(key: string): Promise<void> {
  return del(key, useStore());
}

/** localStorage key with the app's (or preview's) prefix. */
export function localKey(name: string): string {
  return names.local + name;
}
