// Create animated particles
function createParticles() {
    const particles = document.querySelector('.particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particles.appendChild(particle);
    }
}

// Initialize particles
createParticles();

// Chat functionality
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const typingIndicator = document.getElementById('typingIndicator');

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage('user', message);
    messageInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate AI response
    setTimeout(() => {
        hideTypingIndicator();
        const responses = [
            "Entendi! Como posso te ajudar com isso?",
            "Interessante! Conte-me mais sobre o que você precisa.",
            "Perfeito! Vou analisar sua solicitação e te dar a melhor resposta possível.",
            "Ótima pergunta! Deixe-me pensar na melhor forma de te ajudar.",
            "Compreendo sua necessidade. Vou elaborar uma resposta detalhada para você."
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage('assistant', randomResponse);
    }, 1500);
}

function addMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const label = type === 'user' ? 'Você:' : 'Assistente:';
    
    messageDiv.innerHTML = `
        <div>
            <div class="message-label">${label}</div>
            <div class="message-bubble">${text}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    typingIndicator.style.display = 'block';
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// Handle Enter key press
messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Auto-scroll to bottom
chatMessages.scrollTop = chatMessages.scrollHeight;
