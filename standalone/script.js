// ----------------- ChatGPT API (Stream Mode) -----------------
// Define a constant for the model name so it is used in both API call and UI.
const MODEL_NAME = "gpt-4o-mini";

// Modified to scroll the current card to the bottom after updating the message.
function updateLastMessage(content, isStreaming = false) {
  const session = sessions[currentSessionIndex];
  const cursorHTML = `<span class="blinking-cursor"></span>`;
  session.messages[session.messages.length - 1].aiResponse = isStreaming ? content + cursorHTML : content;
  
  // Get the current scroll position of the last card before re-rendering
  const lastCardBefore = document.querySelector('.card:last-child');
  const prevScrollTop = lastCardBefore ? lastCardBefore.scrollTop : 0;
  
  // Re-render the conversation
  renderCurrentSession();
  
  // Use requestAnimationFrame to wait until the new DOM is laid out
  requestAnimationFrame(() => {
    const lastCardAfter = document.querySelector('.card:last-child');
    if (lastCardAfter) {
      if (isStreaming) {
        lastCardAfter.scrollTop = lastCardAfter.scrollHeight;
      } else {
        // Restore the previous scroll position
        lastCardAfter.scrollTop = prevScrollTop;
      }
    }
  });
}

// ----------------- Layout and Navigation -----------------
let isTraditionalLayout = false;
const toggleLayoutBtn = document.getElementById('toggleLayoutBtn');
const carouselWrapper = document.getElementById('carouselWrapper');
function updateLayout() {
  if (isTraditionalLayout) {
    carousel.classList.add('traditional');
    carouselWrapper.classList.add('traditional-mode');
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    toggleLayoutBtn.innerHTML = `<img src="vertical.svg" alt="Icon" class="svg-icon">`;
  } else {
    carousel.classList.remove('traditional');
    carouselWrapper.classList.remove('traditional-mode');
    prevBtn.style.display = '';
    nextBtn.style.display = '';
    toggleLayoutBtn.innerHTML = `<img src="horizontal.svg" alt="Icon" class="svg-icon">`;
  }
  updateTurnLabel(sessionMessagesCount());
}
toggleLayoutBtn.addEventListener('click', function() {
  isTraditionalLayout = !isTraditionalLayout;
  updateLayout();
});

// This function will move hamburger + new chat button between nav-bar and the chat header
function updateHamburgerPosition() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const newSessionBtn = document.getElementById('newSessionBtn');
  const toggleLayoutBtn = document.getElementById('toggleLayoutBtn');
  const navBar = document.getElementById('navBar');
  const navHeader = navBar.querySelector('.nav-header');
  const headerLeft = document.getElementById('headerLeft');
  if (navBar.classList.contains('hidden')) {
    // Move both hamburger and new chat to header-left
    headerLeft.appendChild(hamburgerBtn);
    headerLeft.appendChild(newSessionBtn);
    headerLeft.appendChild(toggleLayoutBtn);    
  } else {
    // Move both back to navHeader
    navHeader.appendChild(hamburgerBtn);
    navHeader.appendChild(newSessionBtn);
    navHeader.appendChild(toggleLayoutBtn);
  }
}

// ----------------- Session Management -----------------
let sessions = [];
let currentSessionIndex = 0;
let currentCardIndex = 0;
function initSessions() {
  sessions.push({
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    name: "Chat Session 1",
    title: "Chat Session 1",
    messages: [],
    summary: "# Chat Summary\n\nThis is the default summary for Chat Session 1.",
    settings: {
      temperature: 0.7,
      maxTokens: 1024,
      persona: "professional",
      model: "gpt-4o-mini" // <-- new property
    }
  });
  currentSessionIndex = 0;
  currentCardIndex = 0;
  renderSessionList();
  renderCurrentSession();
}
function renderSessionList() {
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
    });
    if (index === currentSessionIndex) li.classList.add('active');
    sessionList.appendChild(li);
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
            maxTokens: 1024,
            persona: "professional",
            model: "gpt-4o-mini" // <-- default model
        }
    };

  sessions.push(newSession);
  currentSessionIndex = sessions.length - 1;
  currentCardIndex = 0;
  renderSessionList();
  renderCurrentSession();
});
function removeSession(index) {
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
// ----------------- Carousel Rendering / Traditional Layout -----------------
const carousel = document.getElementById('carousel');
function renderCurrentSession() {
  const session = sessions[currentSessionIndex];
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
    // Order: User message then AI message, rendered in Markdown
    card.innerHTML = `
      <div class="conversation">
        <div class="message user">
          ${attachmentHTML}
          <div class="message-text markdown-body">${marked.parse(message.userText)}</div>
        </div>
        <div class="message ai">
          <div class="message-text markdown-body">${marked.parse(message.aiResponse)}</div>
          <div class="ai-status">${message.model || session.settings.model}</div>
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
}
function updateCarousel() {
  if (!isTraditionalLayout) {
    const cards = document.querySelectorAll('.card');
    carousel.style.transform = `translateX(-${currentCardIndex * 100}%)`;
  }
  updateTurnLabel(sessionMessagesCount());
}
function sessionMessagesCount() {
  return sessions[currentSessionIndex].messages.length;
}
function updateTurnLabel(totalCards) {
  const turnLabel = document.getElementById('turnLabel');
  if (isTraditionalLayout) {
    turnLabel.textContent = `Turn: ${totalCards} / ${totalCards}`;
  } else {
    turnLabel.textContent = totalCards ? `Turn: ${currentCardIndex + 1} / ${totalCards}` : "Turn: 0 / 0";
  }
}
// ----------------- Message Processing -----------------
function processMessage(messageEl) {
  if (messageEl.dataset.processed) return;
  const textEl = messageEl.querySelector('.message-text');
  // Only add "Read more" toggle for user messages if text is long.
  if (messageEl.classList.contains('user') && textEl.scrollHeight > 80) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.textContent = 'Read more';
    toggleBtn.addEventListener('click', function() {
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
function processMessagesInContainer(container) {
  container.querySelectorAll('.message').forEach(processMessage);
}
// ----------------- Adding Conversation & Stream API Call -----------------
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Get the base64 string (remove the data URL prefix)
      const base64 = reader.result.split(',')[1];
      resolve({
        name: file.name,
        path: file.webkitRelativePath || file.path || file.name,
        size: file.size,
        type: file.type,
        content: base64
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const attachedFiles = [];
async function addConversation(userText) {
  if (userText.trim() === '' && attachedFiles.length === 0) return;

  // Store message with attachments
  sessions[currentSessionIndex].messages.push({
    userText,
    aiResponse: "",
    attachments: await Promise.all(attachedFiles.map(fileToBase64)),
    model: sessions[currentSessionIndex].settings.model,
    sessionId: sessions[currentSessionIndex].id
  });

  // Clear attachments after sending
  clearFileAttachments();
  renderCurrentSession();

  const conversation = [];
  sessions[currentSessionIndex].messages.forEach(msg => {
    conversation.push({ role: "user", content: msg.userText, attachments: msg.attachments, sessionId: msg.sessionId });
    if (msg.aiResponse) {
      conversation.push({ role: "assistant", content: msg.aiResponse, sessionId: msg.sessionId });
    }
  });

  try {
    const aiResponse = await callLLMStream(conversation);
    sessions[currentSessionIndex].messages[sessions[currentSessionIndex].messages.length - 1].aiResponse = aiResponse;
    renderCurrentSession();
  } catch (err) {
    console.error(err);
    sessions[currentSessionIndex].messages[sessions[currentSessionIndex].messages.length - 1].aiResponse = "Error: " + err.message;
    renderCurrentSession();
  }
}

function clearFileAttachments() {
  attachedFiles.length = 0;
  updateFileAttachments();
}
// ----------------- Auto-resize Textarea -----------------
const chatInput = document.getElementById('chatInput');
chatInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});
function resetTextarea() {
  chatInput.style.height = '36px';
}
// ----------------- Send Message -----------------
const sendBtn = document.getElementById('sendBtn');
sendBtn.addEventListener('click', async () => {
  const text = chatInput.value;
  if (text.trim() !== '') {
    await addConversation(text);
    chatInput.value = '';
    resetTextarea();
  }
});
chatInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendBtn.click();
  }
});
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
prevBtn.addEventListener('click', () => {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    updateCarousel();
  }
});
nextBtn.addEventListener('click', () => {
  const cards = document.querySelectorAll('.card');
  if (currentCardIndex < cards.length - 1) {
    currentCardIndex++;
    updateCarousel();
  }
});
// ----------------- File Attachment Handling -----------------
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const fileAttachments = document.getElementById('fileAttachments');
attachBtn.addEventListener('click', () => {
  fileInput.click();
});
fileInput.addEventListener('change', () => {
  for (const file of fileInput.files) {
    attachedFiles.push(file);
    // Display the file path in the console
  }
  fileInput.value = "";
  updateFileAttachments();
});

function updateFileAttachments() {
  fileAttachments.innerHTML = "";
  attachedFiles.forEach((file, index) => {
    const fileDiv = document.createElement("div");
    fileDiv.className = "file-item";
    fileDiv.innerHTML = `<span>${file.name}</span> <button data-index="${index}">&times;</button>`;
    fileAttachments.appendChild(fileDiv);
  });
  document.querySelectorAll(".file-item button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      attachedFiles.splice(idx, 1);
      updateFileAttachments();
    });
  });
}
// ----------------- Summary Overlay -----------------
const summaryOverlay = document.getElementById('summaryOverlay');
const closeSummaryBtn = document.getElementById('closeSummaryBtn');
const summaryContent = document.getElementById('summaryContent');
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
// ----------------- Settings Overlay -----------------
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const temperatureInput = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokens');
const personaSelect = document.getElementById('persona');
const saveSettingsBtn = document.getElementById('saveSettings');
closeSettingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.remove('active');
});
temperatureInput.addEventListener('input', () => {
  temperatureValue.textContent = temperatureInput.value;
});
saveSettingsBtn.addEventListener('click', () => {
  sessions[currentSessionIndex].settings = {
    temperature: parseFloat(temperatureInput.value),
    maxTokens: parseInt(maxTokensInput.value),
    persona: personaSelect.value
  };
  console.log('Session settings saved:', sessions[currentSessionIndex].settings);
  settingsOverlay.classList.remove('active');
});
// ----------------- Title Editing -----------------
const editTitleBtn = document.getElementById('editTitleBtn');
editTitleBtn.addEventListener('click', () => {
  const currentTitle = sessions[currentSessionIndex].title;
  const newTitle = prompt("Enter new chat title:", currentTitle);
  if (newTitle !== null && newTitle.trim() !== "") {
    sessions[currentSessionIndex].title = newTitle.trim();
    document.getElementById('chatTitle').textContent = newTitle.trim();
  }
});
// ----------------- Auto-Dismiss Overlays -----------------
document.addEventListener('click', (e) => {
  if (summaryOverlay.classList.contains('active') && !summaryOverlay.contains(e.target)) {
    summaryOverlay.classList.remove('active');
  }
  if (settingsOverlay.classList.contains('active') && !settingsOverlay.contains(e.target)) {
    settingsOverlay.classList.remove('active');
  }
});
// ----------------- Global Keyboard Navigation -----------------
document.addEventListener('keydown', (e) => {
  if (document.activeElement !== chatInput) {
    if (e.key === 'ArrowLeft' && currentCardIndex > 0) {
      currentCardIndex--;
      updateCarousel();
    } else if (e.key === 'ArrowRight') {
      const cards = document.querySelectorAll('.card');
      if (currentCardIndex < cards.length - 1) {
        currentCardIndex++;
        updateCarousel();
      }
    }
  }
});
// ----------------- Hamburger Toggle -----------------
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navBar = document.getElementById('navBar');
hamburgerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  navBar.classList.toggle('hidden');
  updateHamburgerPosition();
});

// ----------------- Custom Button Event Listeners -----------------
const customBtn1 = document.getElementById('customBtn1');
const customBtn2 = document.getElementById('customBtn2');

customBtn1.addEventListener('click', (e) => {
  e.stopPropagation();
  // Open the summary overlay for the current session
  document.getElementById('summaryContent').innerHTML = marked.parse(sessions[currentSessionIndex].summary);
  summaryOverlay.classList.add('active');
  settingsOverlay.classList.remove('active');
});

customBtn2.addEventListener('click', (e) => {
  e.stopPropagation();
  // Open the settings overlay for the current session and fill in the fields
  const settings = sessions[currentSessionIndex].settings;
  temperatureInput.value = settings.temperature;
  temperatureValue.textContent = settings.temperature;
  maxTokensInput.value = settings.maxTokens;
  personaSelect.value = settings.persona;
  settingsOverlay.classList.add('active');
  summaryOverlay.classList.remove('active');
});

// Get reference to the new select element
const modelSelect = document.getElementById('modelSelect');

function openSettingsForCurrentSession() {
  const settings = sessions[currentSessionIndex].settings;
  // Existing lines for temperature, maxTokens, persona...
  modelSelect.value = settings.model; // Populate the dropdown with the current model
}

// When opening the settings overlay:
customBtn2.addEventListener('click', (e) => {
  e.stopPropagation();
  // ...
  openSettingsForCurrentSession(); // load session settings into the UI
  settingsOverlay.classList.add('active');
  summaryOverlay.classList.remove('active');
});

// Saving:
saveSettingsBtn.addEventListener('click', () => {
  const sessionSettings = sessions[currentSessionIndex].settings;
  // Existing lines for temperature, maxTokens, persona...
  sessionSettings.model = modelSelect.value; // Save the selected model

  console.log('Session settings saved:', sessions[currentSessionIndex].settings);
  settingsOverlay.classList.remove('active');
});

async function callLLMStream(conversation) {
  const session = sessions[currentSessionIndex];
  const { model, temperature, maxTokens } = session.settings;

  if (model.startsWith("gpt-4o")) {
    // Call OpenAI endpoint
    return callOpenAIStream(session.id, conversation, model, temperature, maxTokens);
  } else if (model.startsWith("claude")) {
    // Call Anthropic endpoint
    return callAnthropicStream(session.id, conversation, model, temperature, maxTokens);
  } else if (model.startsWith("gemini")) {
    // Call Google endpoint
    return callGoogleStream(session.id, conversation, model, temperature, maxTokens);
  } else if (model.startsWith("huggingface")) {
    // Call Hugging Face endpoint
    return callHuggingFaceStream(session.id, conversation, model.replace("huggingface/", ""), temperature, maxTokens);
  } else {
    throw new Error("Unsupported model: " + model);
  }
}

async function callOpenAIStream(sessionId, conversation) {
  const response = await fetch("http://127.0.0.1:8000/openai_stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId
      // Remove the Authorization header since the Python backend handles the API key.
    },
    body: JSON.stringify({
      conversation: conversation,
      temperature: sessions[currentSessionIndex].settings.temperature,
      max_tokens: sessions[currentSessionIndex].settings.maxTokens,
      model: MODEL_NAME,
    })
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let aiMessage = "";

  updateLastMessage(aiMessage, true);
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(line => line.trim().startsWith("data:"));
    for (const line of lines) {
      const dataStr = line.replace(/^data:\s*/, "");
      if (dataStr === "[DONE]") {
        done = true;
        break;
      }
      try {
        // Parse the JSON returned by the Python backend.
        const parsed = JSON.parse(dataStr);
        // Assuming the payload structure is the same as OpenAI's response.
        const delta = parsed.choices[0].delta.content;
        if (delta) {
          aiMessage += delta;
          updateLastMessage(aiMessage, true);
        }
      } catch (err) {
        console.error("Stream parsing error:", err);
      }
    }
  }
  updateLastMessage(aiMessage, false);
  return aiMessage;
}


async function callAnthropicStream(sessionId, conversation, model, temperature, maxTokens) {
  model = model.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '-');
  console.log(`Calling Anthropic API with model: ${model}`);
  
  const response = await fetch("http://127.0.0.1:8000/anthropic_stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId
    },
    body: JSON.stringify({
      messages: conversation,
      temperature: temperature,
      max_tokens: maxTokens,
      model: model + "-latest",
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let aiMessage = "";
  
  updateLastMessage(aiMessage, true);
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(line => line.trim().startsWith("data:"));
    
    for (const line of lines) {
      const dataStr = line.replace(/^data:\s*/, "");
      if (dataStr === "[DONE]") {
        done = true;
        break;
      }
      
      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices[0].delta.content;
        if (delta) {
          aiMessage += delta;
          updateLastMessage(aiMessage, true);
        }
      } catch (err) {
        console.error("Anthropic stream parsing error:", err);
      }
    }
  }
  updateLastMessage(aiMessage, false);
  return aiMessage;

}

async function callGoogleStream(sessionId, conversation, model, temperature, maxTokens) {
  // Convert conversation messages to Gemini's "contents" format.
  model = model.toLowerCase().replace(/\s+/g, '-');
  console.log(model);  
  const response = await fetch("http://127.0.0.1:8000/gemini_stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId
    },
    body: JSON.stringify({
      messages: conversation,
      temperature: temperature,
      max_tokens: maxTokens,
      model: model,
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let aiMessage = "";

  updateLastMessage(aiMessage, true);
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(line => line.trim().startsWith("data:"));
    
    for (const line of lines) {
      const dataStr = line.replace(/^data:\s*/, "");
      if (dataStr === "[DONE]") {
        done = true;
        break;
      }
      
      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices[0].delta.content;
        if (delta) {
          aiMessage += delta;
          updateLastMessage(aiMessage, true);
        }
      } catch (err) {
        console.error("Gemini stream parsing error:", err);
      }
    }
  }
  updateLastMessage(aiMessage, false);
  return aiMessage;
}

async function callHuggingFaceStream(sessionId, conversation, model, temperature, maxTokens) {
  console.log(`Calling Hugging Face API with model: ${model}`);
  const response = await fetch("http://127.0.0.1:8000/huggingface_stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId
    },
    body: JSON.stringify({
      messages: conversation,
      temperature: temperature,
      max_tokens: maxTokens,
      model: model,
    })
  }); 

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let aiMessage = ""; 

  updateLastMessage(aiMessage, true);
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(line => line.trim().startsWith("data:"));  

    for (const line of lines) {
      const dataStr = line.replace(/^data:\s*/, "");
      if (dataStr === "[DONE]") {
        done = true;
        break;
      } 

      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices[0].delta.content;
        if (delta) {
          aiMessage += delta;
          updateLastMessage(aiMessage, true);
        }
      } catch (err) {
        console.error("Hugging Face stream parsing error:", err);
      }
    }
  }
  updateLastMessage(aiMessage, false);
  return aiMessage;
}

// ----------------- Initialization -----------------
initSessions();
updateHamburgerPosition();
