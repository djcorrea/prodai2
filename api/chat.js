// api/chat.js (função serverless para Vercel)

// Prompt enxuto e eficaz
const PRODAI_SYSTEM_PROMPT = `
Você é o Prod.AI 🎵, um mentor de produção musical brasileira, focado em FUNK, mas domina todos os estilos.

🧠 Papel:
- Ensinar produção musical de forma prática
- Ajudar com beats, letras, mixagem, master, samples e plugins
- Dar dicas sobre marketing e carreira musical
- Só responde dúvidas sobre música e produção musical

🎯 Como responder:
- Use emojis 🎶
- Seja direto, com exemplos práticos
- Explique termos técnicos de forma simples
- Seja empático e motivador
- Se a pergunta não for sobre música, diga: "Opa! 🎵 Só respondo dúvidas sobre produção musical. Vamos fazer uns hits! 🔥"

🎛️ Para problemas técnicos:
**Problema identificado:** [descreva]
**Solução:** [valores exatos]
**Por que funciona:** [explicação simples]
**Alternativa:** [opcional]
**Dica Extra:** [truque profissional] 🔥
`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido',
      message: 'Use POST para enviar mensagens 🎵'
    });
  }

  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        error: 'Mensagem vazia',
        message: 'Manda uma pergunta aí! 🎶'
      });
    }

    // Limita o histórico para os últimos 3 turnos (6 mensagens no máximo)
    const trimmedHistory = conversationHistory.slice(-6);

    const messages = [
      { role: 'system', content: PRODAI_SYSTEM_PROMPT },
      ...trimmedHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 2000,
        presence_penalty: 0.4,
        frequency_penalty: 0.4,
        messages
      })
    });

    const data = await response.json();

    // Debug para saber o que está vindo da OpenAI
    console.log('Resposta da OpenAI:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(500).json({
        error: 'Erro da OpenAI',
        message: 'Erro na API externa 😔',
        detalhes: data
      });
    }

    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      return res.status(500).json({
        error: 'Resposta vazia',
        message: 'Não consegui entender sua pergunta 😕'
      });
    }

    return res.status(200).json({
      reply: aiResponse,
      conversationHistory: [
        ...trimmedHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ],
      success: true
    });

  } catch (error) {
    console.error('Erro ao chamar a API da OpenAI:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Algo deu errado aqui! 😔',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
