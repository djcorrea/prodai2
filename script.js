const chatbox = document.getElementById('chatbox');
const input = document.getElementById('user-input');

function appendMessage(content, className) {
  const msg = document.createElement('div');
  msg.className = `message ${className}`;
  msg.innerHTML = content.replace(/\n/g, '<br>'); // permite quebra de linha
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  appendMessage(`<strong>Você:</strong> ${message}`, 'user');
  input.value = '';
  appendMessage('Digitando...', 'bot');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    document.querySelector('.bot:last-child').remove(); // remove "digitando"
    appendMessage(`<strong>Assistente:</strong> ${data.reply}`, 'bot');
  } catch (error) {
    document.querySelector('.bot:last-child').remove();
    appendMessage('❌ Erro ao se comunicar com o servidor.', 'bot');
  }
}

input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') sendMessage();
});
