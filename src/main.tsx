import { render } from 'preact';
import { App } from './ui/App';
import { loadPreferences } from './prefs/store';
import { installTheme } from './ui/theme';
import './ui/theme.css';

installTheme();
void loadPreferences();
render(<App />, document.getElementById('app')!);
