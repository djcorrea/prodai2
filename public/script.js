const chatbox = document.getElementById('chatbox');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

let conversationHistory = [];

async function sendMessage() {
  const message = input.value.trim();
  if (!message || sendBtn.disabled) return;

  sendBtn.disabled = true;
  sendBtn.innerHTML = 'Enviando...';

  appendMessage(`<strong>Você:</strong> ${message}`, 'user');
  input.value = '';
  showTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory
      })
    });

    const data = await res.json();
    hideTypingIndicator();

    if (data.reply) {
      appendMessage(`<strong>Assistente:</strong> ${data.reply}`, 'bot');
      conversationHistory = data.conversationHistory || [];
    } else {
      appendMessage('<strong>Assistente:</strong> ❌ Erro: resposta vazia ou mal formatada.', 'bot');
      console.error('Erro na resposta:', data);
    }
  } catch (err) {
    hideTypingIndicator();
    appendMessage('<strong>Assistente:</strong> ❌ Erro de conexão com o servidor.', 'bot');
    console.error('Erro no fetch:', err);
  }

  sendBtn.disabled = false;
  sendBtn.innerHTML = 'Enviar';
  input.focus();
}

function appendMessage(content, className) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${className}`;
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.innerHTML = content.replace(/\n/g, '<br>');
  
  messageDiv.appendChild(messageContent);
  chatbox.appendChild(messageDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function showTypingIndicator() {
  typingIndicator.style.display = 'flex';
  chatbox.scrollTop = chatbox.scrollHeight;
}

function hideTypingIndicator() {
  typingIndicator.style.display = 'none';
}

input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

window.addEventListener('load', () => {
  input.focus();
});
