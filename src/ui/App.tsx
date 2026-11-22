import { route, navigate, type Route } from './router';
import { prefs, editPreferences } from '../prefs/store';
import { IS_PREVIEW, PREVIEW_PR } from '../env';
import { resetDemoData } from '../progress/store';
import { Home } from './screens/Home';
import { Explore } from './screens/Explore';
import { PreferencesScreen } from './screens/PreferencesScreen';
import { Practice } from './screens/Practice';
import { Stats } from './screens/Stats';

const TITLES: Record<Route, string> = {
  home: 'Fretboard Chords',
  explore: 'Chord explorer',
  prefs: 'Preferences',
  practice: 'Practice',
  stats: 'Progress',
};

export function App() {
  const r = route.value;
  return (
    <div class="app">
      {IS_PREVIEW && <PreviewBar />}
      <header class="topbar">
        {r !== 'home' ? (
          <button type="button" class="icon-btn" aria-label="Back" onClick={() => navigate('home')}>
            ‹
          </button>
        ) : (
          <span class="logo" aria-hidden="true">
            ◉
          </span>
        )}
        <h1>{TITLES[r]}</h1>
        <button
          type="button"
          class="icon-btn"
          aria-label={prefs.value.sound.muted ? 'Unmute' : 'Mute'}
          aria-pressed={prefs.value.sound.muted}
          onClick={() => editPreferences((d) => void (d.sound.muted = !d.sound.muted))}
        >
          {prefs.value.sound.muted ? '🔇' : '🔊'}
        </button>
        {r !== 'prefs' && (
          <button
            type="button"
            class="icon-btn"
            aria-label="Preferences"
            onClick={() => navigate('prefs')}
          >
            ⚙
          </button>
        )}
      </header>
      <main class="screen">
        {r === 'home' && <Home />}
        {r === 'explore' && <Explore />}
        {r === 'prefs' && <PreferencesScreen />}
        {r === 'practice' && <Practice />}
        {r === 'stats' && <Stats />}
      </main>
    </div>
  );
}

/** Previews only: which PR this is, and a way back to fresh demo data. */
function PreviewBar() {
  return (
    <div class="preview-bar" role="note">
      <span>
        Preview of{' '}
        <a
          href={`https://github.com/shushz/fretboard-chords/pull/${PREVIEW_PR}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          PR #{PREVIEW_PR}
        </a>{' '}
        · demo data
      </span>
      <button type="button" class="link" onClick={resetDemoData}>
        Reset demo data
      </button>
    </div>
  );
}
