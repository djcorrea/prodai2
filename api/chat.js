export default async function handler(req, res) {
  // Habilita CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Use POST 🎵' });
  }

  try {
    const { message, conversationHistory = [] } = req.body;

    // DEBUG: mostra a mensagem recebida
    console.log('Mensagem recebida:', message);

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ message: 'Mensagem inválida 🎶' });
    }

    const systemPrompt = `
Você é o Prod.AI 🎵, mentor de produção musical brasileira focado em funk, que responde de forma objetiva e com emojis. Só fala sobre música.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6),
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
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    // DEBUG: Mostra o que veio da OpenAI
    console.log('Resposta OpenAI:', JSON.stringify(data, null, 2));

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(500).json({ message: 'Sem resposta da IA 😕' });
    }

    return res.status(200).json({
      reply,
      conversationHistory: [
        ...conversationHistory.slice(-6),
        { role: 'user', content: message },
        { role: 'assistant', content: reply }
      ],
      success: true
    });

  } catch (err) {
    console.error('Erro:', err);
    return res.status(500).json({
      message: 'Erro interno 😔',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
