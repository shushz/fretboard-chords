import { navigate } from '../router';
import { stats } from '../../progress/store';
import { dueItems } from '../../progress/srs';
import { pendingDrill } from '../../exercises/drillState';
import { parseItemKey } from '../../progress/types';

export function Home() {
  const due = dueItems(stats.value, Date.now());
  return (
    <div class="home">
      <p class="lead">
        Drill diatonic chord shapes, chord-tone roles and chord relationships on the guitar neck —
        in every key, fully offline.
      </p>
      <nav class="menu">
        <button type="button" class="menu-item primary" onClick={() => navigate('practice')}>
          <strong>Practice</strong>
          <span>Find chords, name tones, walk progressions</span>
        </button>
        {due.length > 0 && (
          <button
            type="button"
            class="menu-item"
            onClick={() => {
              pendingDrill.value = {
                title: 'Review',
                items: due.slice(0, 20).map((s) => parseItemKey(s.key)),
                passes: 1,
              };
              navigate('practice');
            }}
          >
            <strong>Review due items ({due.length})</strong>
            <span>Spaced repetition: items whose review time has come</span>
          </button>
        )}
        <button type="button" class="menu-item" onClick={() => navigate('stats')}>
          <strong>Progress</strong>
          <span>Accuracy and speed per key, degree and string set; backup</span>
        </button>
        <button type="button" class="menu-item" onClick={() => navigate('explore')}>
          <strong>Chord explorer</strong>
          <span>See every voicing of a diatonic chord in a region</span>
        </button>
        <button type="button" class="menu-item" onClick={() => navigate('prefs')}>
          <strong>Preferences</strong>
          <span>Spelling, harmony, fretboard, practice, sound &amp; look</span>
        </button>
      </nav>
    </div>
  );
}
