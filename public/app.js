let currentMode = 'checkin';
let chatHistory = [];

function setMode(mode) {
  currentMode = mode;
  const checkinMode = document.getElementById('checkin-mode');
  const btnCheckin = document.getElementById('btn-checkin');
  const btnChat = document.getElementById('btn-chat');
  const input = document.getElementById('checkin');

  if (mode === 'checkin') {
    checkinMode.style.display = 'block';
    btnCheckin.style.background = '#0a84ff';
    btnChat.style.background = '#2c2c2e';
    input.placeholder = 'What did you work on today?';
  } else {
    checkinMode.style.display = 'none';
    btnCheckin.style.background = '#2c2c2e';
    btnChat.style.background = '#0a84ff';
    input.placeholder = 'Ask me anything...';
  }
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(text, type) {
  const messagesDiv = document.getElementById('messages');
  const msg = document.createElement('div');
  msg.className = 'message ' + type;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerText = text;
  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  timestamp.innerText = getTime();
  msg.appendChild(bubble);
  msg.appendChild(timestamp);
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTyping() {
  const messagesDiv = document.getElementById('messages');
  const typing = document.createElement('div');
  typing.className = 'message agent';
  typing.id = 'typing';
  typing.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  messagesDiv.appendChild(typing);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

async function submitMessage() {
  const input = document.getElementById('checkin').value;
  if (!input) return;

  if (currentMode === 'checkin') {
    const hours = document.getElementById('hours').value;
    const energy = document.getElementById('energy').value;
    if (!hours || !energy) { alert('Please fill in hours and energy'); return; }

    addMessage('Hours: ' + hours + '  Energy: ' + energy + '/10\n' + input, 'user');
    document.getElementById('checkin').value = '';
    document.getElementById('hours').value = '';
    document.getElementById('energy').value = '';

    showTyping();
    chatHistory.push({ role: 'user', content: input });

const res = await fetch('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: input, history: chatHistory.slice(0, -1) })
});
const data = await res.json();
removeTyping();
addMessage(data.response, 'agent');
chatHistory.push({ role: 'assistant', content: data.response });

  } else {
    addMessage(input, 'user');
    document.getElementById('checkin').value = '';
    showTyping();

   chatHistory.push({ role: 'user', content: input });

    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, history: chatHistory.slice(0, -1) })
    });
    const data = await res.json();
    removeTyping();
    addMessage(data.response, 'agent');
    chatHistory.push({ role: 'assistant', content: data.response });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('checkin').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  });
});