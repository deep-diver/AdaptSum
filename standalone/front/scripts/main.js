// main.js
import { initSessions, sessions, currentSessionIndex, renderCurrentSession } from './sessions.js';
import { updateHamburgerPosition } from './navigation.js';
import { initPresets } from './presets.js';

// Import events so they register their listeners.
import './events.js';
// Import utilities to set marked options.
import './utils.js';

// Initialize sessions
initSessions();
updateHamburgerPosition();
initPresets();

// Attach sessions-related variables to the window for global access
window.sessions = sessions;
window.currentSessionIndex = currentSessionIndex;
window.renderCurrentSession = renderCurrentSession;