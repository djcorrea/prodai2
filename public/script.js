const chatbox = document.getElementById('chatbox');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

// Respostas pré-definidas para funcionar sem backend
const responses = [
  "Interessante! Conte-me mais sobre isso.",
  "Entendi perfeitamente. Como posso te ajudar ainda mais?",
  "Essa é uma excelente pergunta! Vou te dar uma resposta completa.",
  "Perfeito! Vou analisar sua solicitação e te dar o melhor conselho.",
  "Compreendo sua necessidade. Deixe-me elaborar uma resposta detalhada.",
  "Ótima observação! Vou te ajudar com isso de forma prática.",
  "Muito bem! Vou te orientar passo a passo sobre isso.",
  "Excelente pergunta! Aqui está minha recomendação especializada.",
  "Entendo sua situação. Vou te dar dicas valiosas sobre isso.",
  "Perfeita escolha de tema! Vou te ajudar com informações úteis."
];

// Respostas específicas para palavras-chave
const keywordResponses = {
  'música': 'Como seu mentor musical, posso te ajudar com produção, composição, mixagem e estratégias para lançar suas músicas!',
  'beat': 'Vou te ajudar a criar beats incríveis! Que tipo de beat você quer produzir? Trap, Hip-Hop, Pop, ou outro estilo?',
  'produção': 'A produção musical é minha especialidade! Posso te ensinar sobre arranjos, mixagem, masterização e muito mais.',
  'carreira': 'Vamos construir sua carreira musical juntos! Posso te orientar sobre networking, marketing musical e estratégias de crescimento.',
  'estúdio': 'Te ajudo a montar seu home studio ou otimizar seu estúdio atual. Que equipamentos você tem disponível?',
  'mixagem': 'A mixagem é fundamental! Posso te ensinar técnicas de EQ, compressão, reverb e como dar vida às suas faixas.',
  'masterização': 'A masterização é o toque final! Te ensino a deixar suas músicas com som profissional e competitivo.',
  'olá': 'Olá! Sou seu mentor virtual especializado em música e produção. Como posso te ajudar hoje?',
  'oi': 'Oi! Que bom te ver aqui! Sou especialista em produção musical e estou aqui para te ajudar. O que você gostaria de saber?',
  'help': 'Estou aqui para te ajudar com tudo sobre música! Produção, composição, carreira musical, equipamentos... Me conta o que você precisa!'
};

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

function getSmartResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  for (const keyword in keywordResponses) {
    if (lowerMessage.includes(keyword)) {
      return keywordResponses[keyword];
    }
  }
  
  return responses[Math.floor(Math.random() * responses.length)];
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message || sendBtn.disabled) return;

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Enviando...';

  appendMessage(`<strong>Você:</strong> ${message}`, 'user');
  input.value = '';
  showTypingIndicator();

  const responseTime = Math.random() * 2000 + 1000;
  
  setTimeout(() => {
    hideTypingIndicator();
    
    const response = getSmartResponse(message);
    appendMessage(`<strong>Assistente:</strong> ${response}`, 'bot');
    
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>Enviar';
    
    input.focus();
  }, responseTime);
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

setTimeout(() => {
  if (chatbox.children.length === 1) {
    appendMessage('<strong>Assistente:</strong> 🎵 Bem-vindo! Sou seu mentor especializado em produção musical. Posso te ajudar com beats, mixagem, carreira musical e muito mais. O que você gostaria de aprender hoje?', 'bot');
  }
}, 2000);
