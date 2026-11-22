import { route, navigate, goBack, isKeptAlive, type Route } from './router';
import { prefs, editPreferences } from '../prefs/store';
import { IS_PREVIEW, PREVIEW_PR } from '../env';
import { resetDemoData } from '../progress/store';
import { Home } from './screens/Home';
import { Explore } from './screens/Explore';
import { PreferencesScreen } from './screens/PreferencesScreen';
import { Practice } from './screens/Practice';
import { Stats } from './screens/Stats';
import { About } from './screens/About';
import { sessionHeader } from './sessionHeader';

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
      {IS_PREVIEW && <PreviewBar />}
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
        {r === 'practice' && sessionHeader.value ? <SessionStatus /> : <h1>{TITLES[r]}</h1>}
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

/** In a running session the top bar carries its status, so the board gets the height. */
function SessionStatus() {
  const h = sessionHeader.value!;
  return (
    <>
      {/* "Practice" alone gives way to the status on narrow screens; a drill title stays. */}
      <h1 class={h.title ? 'with-status' : 'with-status plain'}>{h.title ?? TITLES.practice}</h1>
      <span class="session-status">
        <span class="session-progress">{h.progress}</span>
        <span class="session-score">{h.correct} ✓</span>
      </span>
      {/* Ends now and shows the session summary. Back leaves without it; answers are saved
          either way. */}
      <button type="button" class="link end-session" onClick={h.finish}>
        End session
      </button>
    </>
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
