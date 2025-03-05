// events.js
import { addConversation, attachedFiles, updateFileAttachments } from './events_helper.js';
import { sessions, currentSessionIndex, getCurrentCardIndex, setCurrentCardIndex, updateCarousel } from './sessions.js';
import { updateHamburgerPosition, toggleLayout } from './navigation.js';
import { updateLastMessage } from './utils.js';

// Global variables for streaming state
window.isStreaming = false;
window.currentStreamController = null;

// File attachment events
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
attachBtn.addEventListener('click', () => {
  fileInput.click();
});
fileInput.addEventListener('change', () => {
  for (const file of fileInput.files) {
    attachedFiles.push(file);
  }
  fileInput.value = "";
  updateFileAttachments();
});

// Send button event
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
sendBtn.addEventListener('click', async () => {
  if (window.isStreaming) {
    if (window.currentStreamController) {
      window.currentStreamController.abort();
    }
    const session = sessions[currentSessionIndex];
    const lastIndex = session.messages.length - 1;
    const currentContent = session.messages[lastIndex].aiResponse;
    // Use the imported updateLastMessage instead of window.updateLastMessage
    const cleanedContent = currentContent.replace(`<span class="blinking-cursor"></span>`, '');
    updateLastMessage(cleanedContent, false);
    
    sendBtn.innerHTML = `<img src="assets/send.svg" alt="Send Icon" class="svg-icon-non-white">`;
    window.isStreaming = false;
    return;
  }
  const text = chatInput.value;
  if (text.trim() !== '') {
    await addConversation(text);
    chatInput.value = '';
    chatInput.style.height = '36px';
  }
});
chatInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendBtn.click();
  }
});

// Navigation events
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
prevBtn.addEventListener('click', () => {
  if (getCurrentCardIndex() > 0) {
    setCurrentCardIndex(getCurrentCardIndex() -1);
  }
});

nextBtn.addEventListener('click', () => {
  const cards = document.querySelectorAll('.card');
  if (getCurrentCardIndex() < cards.length - 1) {
    setCurrentCardIndex(getCurrentCardIndex() + 1);
  }
});

// Hamburger toggle
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navBar = document.getElementById('navBar');
hamburgerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  navBar.classList.toggle('hidden');
  updateHamburgerPosition();
});

// Summary overlay events
const summaryOverlay = document.getElementById('summaryOverlay');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');
const downloadSummaryBtn = document.getElementById('downloadSummary');
closeSummaryBtn.addEventListener('click', () => {
  summaryOverlay.classList.remove('active');
});
downloadSummaryBtn.addEventListener('click', () => {
  const blob = new Blob([sessions[currentSessionIndex].summary], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "summary.md";
  a.click();
  URL.revokeObjectURL(url);
});

// Settings overlay events
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const temperatureInput = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokens');
const personaSelect = document.getElementById('persona');
const saveSettingsBtn = document.getElementById('saveSettings');
const modelSelect = document.getElementById('modelSelect');
closeSettingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.remove('active');
});
temperatureInput.addEventListener('input', () => {
  temperatureValue.textContent = temperatureInput.value;
});
saveSettingsBtn.addEventListener('click', () => {
  const sessionSettings = sessions[currentSessionIndex].settings;
  sessionSettings.temperature = parseFloat(temperatureInput.value);
  sessionSettings.maxTokens = parseInt(maxTokensInput.value);
  sessionSettings.persona = personaSelect.value;
  sessionSettings.model = modelSelect.value;
  console.log('Session settings saved:', sessions[currentSessionIndex].settings);
  settingsOverlay.classList.remove('active');

  const preset1 = document.getElementById('preset1');
  const preset2 = document.getElementById('preset2');  

  preset1.value = "gpt-4o-mini";
  preset2.value = "gpt-4o-mini";

  preset2.classList.remove('active');
  preset1.classList.remove('active');
});
const editTitleBtn = document.getElementById('editTitleBtn');
editTitleBtn.addEventListener('click', () => {
  const currentTitle = sessions[currentSessionIndex].title;
  const newTitle = prompt("Enter new chat title:", currentTitle);
  if (newTitle !== null && newTitle.trim() !== "") {
    sessions[currentSessionIndex].title = newTitle.trim();
    document.getElementById('chatTitle').textContent = newTitle.trim();
  }
});

// Custom buttons for summary and settings
const customBtn1 = document.getElementById('customBtn1');
const customBtn2 = document.getElementById('customBtn2');
customBtn1.addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('summaryContent').innerHTML = marked.parse(sessions[currentSessionIndex].summary);
  summaryOverlay.classList.add('active');
  settingsOverlay.classList.remove('active');
});
customBtn2.addEventListener('click', (e) => {
  e.stopPropagation();
  const settings = sessions[currentSessionIndex].settings;
  temperatureInput.value = settings.temperature;
  temperatureValue.textContent = settings.temperature;
  maxTokensInput.value = settings.maxTokens;
  personaSelect.value = settings.persona;
  settingsOverlay.classList.add('active');
  summaryOverlay.classList.remove('active');
  openSettingsForCurrentSession();
});
function openSettingsForCurrentSession() {
  const settings = sessions[currentSessionIndex].settings;
  modelSelect.value = settings.model;
}

// Global keyboard navigation
document.addEventListener('keydown', (e) => {
  const chatInput = document.getElementById('chatInput');
  // Only trigger when the chat input is not focused
  if (document.activeElement !== chatInput) {
    if (e.key === 'ArrowLeft' && getCurrentCardIndex() > 0) {
      setCurrentCardIndex(getCurrentCardIndex() - 1);
    } else if (e.key === 'ArrowRight') {
      const cards = document.querySelectorAll('.card');
      if (getCurrentCardIndex() < cards.length - 1) {
        setCurrentCardIndex(getCurrentCardIndex() + 1);
      }
    }
  }
});

// Auto-dismiss overlays when clicking outside
document.addEventListener('click', (e) => {
  if (summaryOverlay.classList.contains('active') && !summaryOverlay.contains(e.target)) {
    summaryOverlay.classList.remove('active');
  }
  if (settingsOverlay.classList.contains('active') && !settingsOverlay.contains(e.target)) {
    settingsOverlay.classList.remove('active');
  }
});

const toggleLayoutBtn = document.getElementById('toggleLayoutBtn');
toggleLayoutBtn.addEventListener('click', () => {
  toggleLayout();
  // If needed, update any other UI parts (like turn labels)
});

const summarizeToggleBtn = document.getElementById('customBtn3');

summarizeToggleBtn.addEventListener('click', () => {
  // Toggle the summarization flag for the current session.
  const currentState = sessions[currentSessionIndex].settings.enableSummarization;
  console.log('Current state:', currentState);
  sessions[currentSessionIndex].settings.enableSummarization = !currentState;
  
  // Update the button's visual state.
  summarizeToggleBtn.classList.toggle('active', !currentState);
});
