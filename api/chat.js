import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { message, conversationHistory = [] } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente focado 100% em produção musical brasileira, principalmente funk. Responda com profundidade, dando dicas práticas sobre mixagem, beats, plugins, marketing musical, lançamentos, etc.`
          },
          ...conversationHistory,
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    res.status(200).json({ reply, conversationHistory: [...conversationHistory, { role: 'user', content: message }, { role: 'assistant', content: reply }] });
  } catch (error) {
    console.error('Erro na API do OpenAI:', error);
    res.status(500).json({ error: 'Erro ao se comunicar com o OpenAI' });
  }
}
