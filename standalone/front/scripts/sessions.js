// sessions.js
import { formatTimestamp } from './utils.js';
import { updateLayout } from './navigation.js';

export let sessions = [];
export let currentSessionIndex = 0;
export let currentCardIndex = 0;

const summarizeToggleBtn = document.getElementById('customBtn3');

export function initSessions() {
  sessions.push({
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    name: "Chat Session 1",
    title: "Chat Session 1",
    messages: [],
    summary: "# Chat Summary\n\nThis is the default summary for Chat Session 1.",
    settings: {
      temperature: 0.7,
      maxTokens: 8096,
      persona: "professional",
      model: "gpt-4o-mini",
      model_preset1: "gpt-4o-mini",
      model_preset2: "gpt-4o-mini",
      enableSummarization: false,
    },
  });
  currentSessionIndex = 0;
  currentCardIndex = 0;
  renderSessionList();
  renderCurrentSession();
  
  summarizeToggleBtn.classList.remove('active');
}

export function renderSessionList() {
  const sessionList = document.getElementById('sessionList');
  sessionList.innerHTML = "";
  sessions.forEach((session, index) => {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = session.name;
    li.appendChild(nameSpan);
    const removeBtn = document.createElement('button');
    removeBtn.textContent = "𝘅";
    removeBtn.className = "remove-session";
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSession(index);
    });
    li.appendChild(removeBtn);
    li.addEventListener('click', () => {
      currentSessionIndex = index;
      currentCardIndex = 0;
      renderSessionList();
      renderCurrentSession();

      console.log(currentSessionIndex);

      const preset1 = document.getElementById('preset1');
      const preset2 = document.getElementById('preset2');  
    
      preset1.value = sessions[currentSessionIndex].settings.model_preset1;
      preset2.value = sessions[currentSessionIndex].settings.model_preset2;
      console.log(preset1.value);
      console.log(preset2.value);
    
      preset2.classList.remove('active');
      preset1.classList.remove('active');          
    });
    if (index === currentSessionIndex) li.classList.add('active');
    sessionList.appendChild(li);
  });
}

export function removeSession(index) {
  sessions.splice(index, 1);
  if (sessions.length === 0) {
    initSessions();
  } else {
    if (currentSessionIndex >= sessions.length) {
      currentSessionIndex = sessions.length - 1;
    }
    currentCardIndex = 0;
  }
  renderSessionList();
  renderCurrentSession();
}

export function renderCurrentSession() {
  const session = sessions[currentSessionIndex];
  const carousel = document.getElementById('carousel');
  carousel.innerHTML = "";
  session.messages.forEach(message => {
    const card = document.createElement('div');
    card.className = 'card';
    let attachmentHTML = "";
    if (message.attachments && message.attachments.length > 0) {
      attachmentHTML = `
        <div class="vertical-file-list">
          ${message.attachments.map(file => `<div class="file-item-vertical">${file.path}</div>`).join("")}
        </div>
      `;
    }
    card.innerHTML = `
      <div class="conversation">
        <div class="message user">
          ${attachmentHTML}
          <div class="message-text markdown-body">${marked.parse(message.userText)}</div>
        </div>
        <div class="message ai">
          <div class="message-text markdown-body">${marked.parse(message.aiResponse)}</div>
          <div class="ai-meta">
            <span class="ai-model">${message.model}</span>
            <span class="ai-timestamp"> @${formatTimestamp(message.timestamp)}</span>
          </div>
        </div>
      </div>
    `;
    carousel.appendChild(card);
    processMessagesInContainer(card);
  });
  currentCardIndex = session.messages.length > 0 ? session.messages.length - 1 : 0;
  updateCarousel();
  updateLayout();
  document.getElementById('chatTitle').textContent = session.title;

  // Re-highlight code blocks and add copy buttons.
  document.querySelectorAll('.markdown-body pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
  addCopyButtons();

  summarizeToggleBtn.classList.toggle('active', session.settings.enableSummarization);  
}

export function updateCarousel() {
  const carousel = document.getElementById('carousel');
  if (!window.isTraditionalLayout) {
    const cards = document.querySelectorAll('.card');
    carousel.style.transform = `translateX(-${currentCardIndex * 100}%)`;
  }
  updateTurnLabel(sessionMessagesCount());
}

export function getCurrentCardIndex() {
  return currentCardIndex;
}

export function setCurrentCardIndex(newIndex) {
  currentCardIndex = newIndex;
  updateCarousel();
}

export function sessionMessagesCount() {
  return sessions[currentSessionIndex].messages.length;
}

export function updateTurnLabel(totalCards) {
  const turnLabel = document.getElementById('turnLabel');
  if (window.isTraditionalLayout) {
    turnLabel.textContent = `Turn: ${totalCards} / ${totalCards}`;
  } else {
    turnLabel.textContent = totalCards ? `Turn: ${currentCardIndex + 1} / ${totalCards}` : "Turn: 0 / 0";
  }
}

export function processMessage(messageEl) {
  if (messageEl.dataset.processed) return;
  const textEl = messageEl.querySelector('.message-text');
  if (messageEl.classList.contains('user') && textEl.scrollHeight > 80) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.textContent = 'Read more';
    toggleBtn.addEventListener('click', function () {
      if (messageEl.classList.contains('expanded')) {
        messageEl.classList.remove('expanded');
        toggleBtn.textContent = 'Read more';
      } else {
        messageEl.classList.add('expanded');
        toggleBtn.textContent = 'Read less';
      }
    });
    messageEl.appendChild(toggleBtn);
  }
  messageEl.dataset.processed = 'true';
}

export function processMessagesInContainer(container) {
  container.querySelectorAll('.message').forEach(processMessage);
}

/**
 * Adds copy buttons to code blocks in rendered markdown.
 */
export function addCopyButtons() {
  document.querySelectorAll('.markdown-body pre').forEach((pre) => {
    if (pre.querySelector('.copy-button')) return;
    pre.style.position = "relative";
    const button = document.createElement("button");
    button.className = "copy-button";
    button.innerText = "Copy";
    pre.appendChild(button);
    button.addEventListener("click", () => {
      const codeText = pre.querySelector("code").innerText;
      navigator.clipboard.writeText(codeText).then(() => {
        button.innerText = "Copied!";
        setTimeout(() => {
          button.innerText = "Copy";
        }, 2000);
      }).catch((err) => {
        console.error("Failed to copy code: ", err);
      });
    });
  });
}

document.getElementById('newSessionBtn').addEventListener('click', () => {
  const newSession = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      name: "Chat Session " + (sessions.length + 1),
      title: "Chat Session " + (sessions.length + 1),
      messages: [],
      summary: "# Chat Summary\n\nThis is the default summary for Chat Session " + (sessions.length + 1) + ".",
      settings: {
          temperature: 0.7,
          maxTokens: 8096,
          persona: "professional",
          model: "gpt-4o-mini",
          model_preset1: "gpt-4o-mini",
          model_preset2: "gpt-4o-mini",
          enableSummarization: false
      }
  };

  sessions.push(newSession);
  currentSessionIndex = sessions.length - 1;
  currentCardIndex = 0;

  summarizeToggleBtn.classList.remove('active');

  renderSessionList();
  renderCurrentSession();

  const preset1 = document.getElementById('preset1');
  const preset2 = document.getElementById('preset2');  

  preset1.value = "gpt-4o-mini";
  preset2.value = "gpt-4o-mini";

  preset2.classList.remove('active');
  preset1.classList.remove('active');
});
