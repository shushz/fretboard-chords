import { route, navigate, goBack, isKeptAlive, type Route } from './router';
import { prefs, editPreferences } from '../prefs/store';
import { Home } from './screens/Home';
import { Explore } from './screens/Explore';
import { PreferencesScreen } from './screens/PreferencesScreen';
import { Practice } from './screens/Practice';
import { Stats } from './screens/Stats';
import { About } from './screens/About';

const TITLES: Record<Route, string> = {
  home: 'Fretboard Chords',
  explore: 'Chord explorer',
  prefs: 'Preferences',
  practice: 'Practice',
  stats: 'Progress',
  about: 'Help & about',
};

export function App() {
  const r = route.value;
  return (
    <div class="app">
      <header class="topbar">
        {r !== 'home' ? (
          <button type="button" class="icon-btn" aria-label="Back" onClick={goBack}>
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
        {/* A practice session or the explorer stays alive underneath Preferences / Help,
            so Back returns to exactly where you were. */}
        {isKeptAlive('explore') && (
          <div hidden={r !== 'explore'}>
            <Explore />
          </div>
        )}
        {isKeptAlive('practice') && (
          <div hidden={r !== 'practice'}>
            <Practice />
          </div>
        )}
        {r === 'prefs' && <PreferencesScreen />}
        {r === 'stats' && <Stats />}
        {r === 'about' && <About />}
      </main>
    </div>
  );
}
