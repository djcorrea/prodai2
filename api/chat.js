// /api/chat.js

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Use POST 🎵' });
  }

  const { message, conversationHistory = [] } = req.body;

  // LOG de debug da mensagem
  console.log('Mensagem recebida:', message);
  console.log('Chave recebida:', process.env.OPENAI_API_KEY);

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ message: 'Mensagem inválida 🎶' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      message: 'API KEY não encontrada no servidor 😔'
    });
  }

  const messages = [
    {
      role: 'system',
      content: `
Você é o Prod.AI 🎵, mentor de produção musical brasileira, focado em funk.

Seja direto, use emojis 🎶, explique de forma prática, ajude com mixagem, beat, voz e carreira.

Se o assunto for fora da música, diga: "Opa! 🎵 Só respondo dúvidas sobre produção musical. Manda aí um beat ou pergunta de mix!".
      `
    },
    ...conversationHistory.slice(-6),
    {
      role: 'user',
      content: message
    }
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    // LOGA o que veio da OpenAI
    console.log('Resposta da OpenAI:', JSON.stringify(data, null, 2));

    if (!response.ok || !data.choices || !data.choices[0]?.message?.content) {
      return res.status(500).json({
        message: 'Erro na resposta da OpenAI 😵',
        detalhes: data
      });
    }

    const reply = data.choices[0].message.content;

    return res.status(200).json({
      reply,
      conversationHistory: [
        ...conversationHistory.slice(-6),
        { role: 'user', content: message },
        { role: 'assistant', content: reply }
      ],
      success: true
    });

  } catch (error) {
    console.error('Erro ao chamar a OpenAI:', error);
    return res.status(500).json({
      message: 'Erro interno 😔',
      error: error.message
    });
  }
}
