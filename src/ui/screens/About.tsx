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
            The easiest start is <b>Guided practice</b> on the home screen: it picks the questions
            for you and moves on as you get better (see below). Or open <b>Practice</b>, pick a mode
            and a key yourself.
          </li>
          <li>
            In Practice, choose which chords to practice, a group of strings (e.g. 1–3, the three
            highest) and a fret window. The dashed box on the board marks this region.
          </li>
          <li>
            Read the question, find the chord on your guitar, then tap its notes on the board.
            Answers are checked as soon as every string has a note. Any correct shape counts.
          </li>
          <li>
            After each answer the board shows every note's role and you hear the chord. Tap{' '}
            <b>Next</b> to continue. Stuck? <b>Show answer</b> reveals it (it counts as one to
            review again, not as a mistake).
          </li>
          <li>
            The top bar shows how far you are (<i>3/20</i>) and how many you got right.{' '}
            <b>End session</b> stops early and shows the session's summary; the back arrow leaves
            without it. Your answers are saved either way.
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
            seventh. Each role keeps its color everywhere.
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
            practiced on three neighboring strings (1–3, 2–4…), seventh chords on four (drop-2
            voicings) or as three-note shells.
          </dd>
          <dt>Fret window</dt>
          <dd>
            The frets you practice in, e.g. 5–9. Open strings count as inside a window that starts
            at fret 1. If a chord has no shape fully inside the window, the question widens it by a
            fret or two and says so. Modes about staying close (From the tonic, Progression walk)
            also accept shapes up to 2 frets outside it; elsewhere, the right chord played outside
            the window is pointed out but doesn't count.
          </dd>
          <dt>Shapes and inversions</dt>
          <dd>
            On a group of strings each chord has three shapes per octave. They're named by the
            lowest note: root position (R at the bottom), first inversion (3rd at the bottom),
            second inversion (5th at the bottom).
          </dd>
          <dt>Root anchor</dt>
          <dd>
            A landmark: the chord's root on string 6 or 5, the bass notes you probably know best. In
            Find the chord and the chord explorer it's shown as a faded R after you answer; in
            Preferences → Labels &amp; hints you can show it while answering, or never. In Find the
            chord's setup, <i>Also tap the root on string 6 or 5</i> makes it part of the answer.
          </dd>
          <dt>Smooth ✦</dt>
          <dd>
            When moving from one chord to another, the shape that needs the least finger movement
            earns a Smooth badge. Good voice leading.
          </dd>
          <dt>Review and mastery</dt>
          <dd>
            Each thing you practice (a chord, in a key, on a string set, in a mode) is tracked. A
            mistake makes it due again right away (<b>Review due items</b> on the home screen). A
            quick right answer spaces it out: 1 day, then 3, 7 and 21 days. A right but slow answer
            (slower than the mastery time below) brings it back within 3 days until you're quick.
            Time spent in Preferences or Help, or with the app in the background, doesn't count
            toward an answer. A review asks each item where you last practiced it; an item the app
            can no longer ask (after an update, or with an option turned off) leaves the reviews. It
            counts as mastered at 90% right over the last 10 tries with a median answer under 3 s (5
            s for seventh chords). Thresholds are in Preferences.
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

      <Section title="Guided practice">
        <p>
          A path of small steps through every mode, organized by shape rather than key: each step is
          one string set and one shape of the tonic (root position, first or second inversion), and
          every question is in a random key, because a move between shapes is the same in every key.
          On each string set it starts with <i>From the tonic</i> (the I chord is a hint), then next
          and previous shape, naming and tapping the tones, quality switch, drops the role labels on
          the I chord, and moves on to <i>Find the chord</i> in each inversion (no shape to start
          from) and the progression walk. Chord names (<i>Name the chord</i>) come early. Challenge
          steps (tap the root on 6 or 5 too, progressions in time) are optional:{' '}
          <b>Skip this challenge</b> moves on. After strings 2–4, 1–3 and 3–5 come strings 4–6, iii
          and vii°, minor keys, then seventh chords.
        </p>
        <p>
          Each session mixes about 60% <b>new</b> questions from the current step (a few in a row at
          the start, then spread out), 25% <b>reviews</b> of earlier steps you got wrong or haven't
          seen for a while, and 15% <b>checks</b> of random earlier steps. If the old material slips
          (under 75% right), fewer new questions come in until it's solid again. A step is passed
          when each of its questions has been right at least 4 of the last 5 times, in any keys,
          with a typical answer under 6 s (9 s for naming three tones); practice outside Guided
          practice counts too. <i>Still solid</i> is your recent score on what's already passed. The
          line under the top bar says whether a question is new, a review or a check.
        </p>
      </Section>

      <Section title="Your progress">
        <p>
          <b>Progress</b> answers two questions. <i>Getting better?</i> charts each day you
          practiced: how often you were right and how long your right answers took, with a one-line
          comparison of your recent days against earlier ones. Use the buttons at the top to look at
          one mode. After a month of practice, <b>All time</b> shows every week since you started,
          compared with your first weeks. <i>What to practice</i> is a map: each row is a chord by
          its numeral across all keys (iv in minor keys…), each column a group of strings, colored
          by how often you've been right lately. Tap a cell to see that chord's trend, then{' '}
          <b>Practice this</b> to work on it. <i>Weakest items</i> and <b>Practice these</b> do the
          same for your ten weakest items overall.
        </p>
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
          progress lives in this browser, which the app asks to keep it. Browsers can still clear
          site data (for example Safari, for sites not added to the Home Screen and unused for a
          week), so use <b>Progress → Export JSON</b> now and then to back it up or move it to
          another device. Progress shows when you last did.
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
