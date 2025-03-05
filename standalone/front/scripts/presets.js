import { renderCurrentSession, sessions, currentSessionIndex } from './sessions.js';

// presets.js
export function initPresets() {
    const presetContainer = document.getElementById('presetContainer');
    if (!presetContainer) return;
  
    const preset1 = document.getElementById('preset1');
    const preset2 = document.getElementById('preset2');
    const modelSelect = document.getElementById('modelSelect');

    preset1.value = "gpt-4o-mini";
    preset2.value = "gpt-4o-mini";

    // Keyboard shortcuts: Ctrl/Cmd + Shift + 1, 2, 3
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '1':
            preset2.classList.remove('active');
            preset1.classList.add('active');
            modelSelect.value = preset1.value;
            window.sessions[currentSessionIndex].settings.model = preset1.value;
            break;
          case '2':
            preset1.classList.remove('active'); 
            preset2.classList.add('active');
            modelSelect.value = preset2.value;
            window.sessions[currentSessionIndex].settings.model = preset2.value;
            break;
        }
      }
    });

    preset1.addEventListener('change', () => {
      console.log(currentSessionIndex);
      window.sessions[currentSessionIndex].settings.model_preset1 = preset1.value;
      console.log(window.sessions[currentSessionIndex].settings.model_preset1);
    });

    preset2.addEventListener('change', () => {
      console.log(currentSessionIndex);
      window.sessions[currentSessionIndex].settings.model_preset2 = preset2.value;
      console.log(window.sessions[currentSessionIndex].settings.model_preset2);
    });
  }
  