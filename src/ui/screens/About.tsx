import { prefs } from '../../prefs/store';
import { roleColor, roleLabel } from '../roleStyle';
import { readableTextOn } from '../contrast';
import type { Role } from '../../theory/roles';
import { MODES } from '../../exercises/modes';
import { navigate } from '../router';
import { ISSUES_URL, REPO_URL, versionLabel } from '../../version';
import { Section } from '../controls';

const ROLES: Role[] = ['R', 'b3', '3', 'b5', '5', 'b7', '7'];

/** Help & about: how to use the app, the main ideas, privacy, contact and version. */
export function About() {
  const p = prefs.value;
  return (
    <div class="about">
      <p class="lead">
        Fretboard Chords helps you learn where the chords of a key sit on the guitar neck: their
        shapes, which note of the chord each string plays, and how the chords connect. Keep the
        phone next to you, play along, and tap what you play.
      </p>

      <Section title="Getting started">
        <ol class="steps">
          <li>
            Open <b>Practice</b>, pick a mode (start with <i>Find the chord</i>) and a key.
          </li>
          <li>
            Choose which chords to practise, a group of strings (e.g. 1–3, the three highest) and a
            fret window. The dashed box on the board marks this region.
          </li>
          <li>
            Read the question, find the chord on your guitar, then tap its notes on the board.
            Answers are checked as soon as every string has a note. Any correct shape counts.
          </li>
          <li>
            After each answer the board shows every note's role and you hear the chord. Tap{' '}
            <b>Next</b> to continue.
          </li>
          <li>
            Come back daily. <b>Review due items</b> on the home screen brings back what you're
            about to forget, and <b>Progress</b> shows how you're improving.
          </li>
        </ol>
      </Section>

      <Section title="Main ideas">
        <dl class="glossary">
          <dt>Roles</dt>
          <dd>
            Every note of a chord has a role relative to its root:
            <span class="role-chips">
              {ROLES.map((r) => (
                <span
                  key={r}
                  class="role-chip"
                  style={{ background: roleColor(r, p), color: readableTextOn(roleColor(r, p)) }}
                >
                  {roleLabel(r)}
                </span>
              ))}
            </span>
            R is the root, ♭3 or 3 the third (minor or major), ♭5 or 5 the fifth, ♭7 or 7 the
            seventh. Each role keeps its colour everywhere.
          </dd>
          <dt>Roman numerals</dt>
          <dd>
            The chords of a key are numbered by the scale degree they start on: I ii iii IV V vi
            vii° in major, i ii° ♭III iv V ♭VI ♭VII in minor. Upper case is major, lower case minor,
            ° diminished. So “iv in E♭m” is the minor chord on the 4th note of E♭ minor: A♭m.
          </dd>
          <dt>String sets</dt>
          <dd>
            Strings are numbered from the thinnest: string 1 is high E, string 6 low E. Triads are
            practised on three neighbouring strings (1–3, 2–4…), seventh chords on four (drop-2
            voicings) or as three-note shells.
          </dd>
          <dt>Fret window</dt>
          <dd>
            The frets you practise in, e.g. 5–9. If a chord has no shape fully inside the window,
            the question widens it by a fret or two and says so.
          </dd>
          <dt>Shapes and inversions</dt>
          <dd>
            On a group of strings each chord has three shapes per octave. They're named by the
            lowest note: root position (R at the bottom), first inversion (3rd at the bottom),
            second inversion (5th at the bottom).
          </dd>
          <dt>Root anchor</dt>
          <dd>
            An optional landmark: the chord's root on string 6 or 5, the bass notes you probably
            know best. It can be shown faintly, or required as part of the answer.
          </dd>
          <dt>Smooth ✦</dt>
          <dd>
            When moving from one chord to another, the shape that needs the least finger movement
            earns a Smooth badge. Good voice leading.
          </dd>
          <dt>Review and mastery</dt>
          <dd>
            Each thing you practise (a chord, in a key, on a string set, in a mode) is tracked.
            Mistakes bring it back soon; correct answers space it out over days. It counts as
            mastered at 90 % right over the last 10 tries with a median answer under 3 s (5 s for
            seventh chords). Thresholds are in Preferences.
          </dd>
        </dl>
      </Section>

      <Section title="The practice modes">
        <dl class="glossary">
          {MODES.map((m) => (
            <div key={m.id}>
              <dt>{m.name}</dt>
              <dd>{m.help}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Tips">
        <ul class="tips">
          <li>Turn the phone sideways for a bigger board with the question beside it.</li>
          <li>
            Install it: in Chrome on Android use the menu’s <i>Install app</i>; on iPhone use Share
            → <i>Add to Home Screen</i>. It then works offline.
          </li>
          <li>
            Hints too easy? In Preferences → Labels &amp; hints, hide the roles on the shape a
            question shows you.
          </li>
          <li>
            Spelling, the minor-key V, string sets and more are in{' '}
            <button type="button" class="link inline" onClick={() => navigate('prefs')}>
              Preferences
            </button>
            .
          </li>
        </ul>
      </Section>

      <Section title="Privacy">
        <p>
          Everything stays on this device: no account, no tracking, no data sent anywhere. Your
          progress lives in this browser. Use <b>Progress → Export JSON</b> to back it up or move it
          to another device.
        </p>
      </Section>

      <Section title="Contact & source">
        <p>
          Made by Alexander Dvinsky. Found a problem or have an idea?{' '}
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
            Open an issue on GitHub
          </a>
          . The app is open source (MIT):{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            github.com/shushz/fretboard-chords
          </a>
          .
        </p>
        <p class="version">{versionLabel()}</p>
      </Section>
    </div>
  );
}
