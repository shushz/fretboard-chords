import { render } from 'preact';
import { App } from './ui/App';
import { loadPreferences } from './prefs/store';
import { installTheme } from './ui/theme';
import { installAudioUnlock } from './audio/engine';
import './ui/theme.css';

installTheme();
installAudioUnlock();
void loadPreferences();
render(<App />, document.getElementById('app')!);
