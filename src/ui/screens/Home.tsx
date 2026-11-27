import { navigate } from '../router';
import { pendingGuided } from '../../guided/store';
import { GuidedProgress } from '../../guided/GuidedStatus';
import { REPO_URL, versionLabel } from '../../version';
import { stats } from '../../progress/store';
import { dueItems } from '../../progress/srs';
import { pendingDrill } from '../../exercises/drillState';
import { parseItemKey } from '../../progress/types';

export function Home() {
  const due = dueItems(stats.value, Date.now());
  return (
    <div class="home">
      <p class="lead">
        Learn the chords of every key on the guitar neck: their shapes, what each string plays, and
        how they connect. Works offline.
      </p>
      <nav class="menu">
        <button
          type="button"
          class="menu-item primary guided-entry"
          onClick={() => {
            pendingGuided.value = true;
            navigate('practice');
          }}
        >
          <strong>Guided practice</strong>
          <GuidedProgress compact />
        </button>
        <button type="button" class="menu-item" onClick={() => navigate('practice')}>
          <strong>Practice</strong>
          <span>Choose a mode and set it up yourself</span>
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
            <span>Questions that are due for review</span>
          </button>
        )}
        <button type="button" class="menu-item" onClick={() => navigate('stats')}>
          <strong>Progress</strong>
          <span>How you're improving, and what to practice next</span>
        </button>
        <button type="button" class="menu-item" onClick={() => navigate('explore')}>
          <strong>Chord explorer</strong>
          <span>See every shape of a chord on part of the neck</span>
        </button>
        <button type="button" class="menu-item" onClick={() => navigate('about')}>
          <strong>Help &amp; about</strong>
          <span>How it works, the main ideas, contact</span>
        </button>
      </nav>
      <p class="version">
        <span>{versionLabel()}</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </p>
    </div>
  );
}
