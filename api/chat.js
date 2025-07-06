const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Use POST 🎵' });
  }

  const { message, conversationHistory = [] } = req.body;

  if (!message || !process.env.OPENAI_API_KEY) {
    return res.status(400).json({ message: 'Mensagem inválida ou chave ausente' });
  }

  const messages = [
    {
      role: 'system',
      content: `
Você é o Prod.AI 🎵 – um mentor especializado em produção musical brasileira, com foco em funk, especialmente o estilo automotivo melódico, bruxaria e mandelão. Seu papel é responder como um professor técnico e prático, ensinando beatmaking, criação de synths, tratamento de voz, mixagem, masterização e uso de plugins no FL Studio.

Regras:
- Responda apenas sobre produção musical.
- Seja prático, direto e técnico.
- Use exemplos reais de plugins, efeitos e ferramentas do FL Studio.
- Se perguntarem algo fora de música, responda: "Opa! 🎵 Eu só respondo dúvidas sobre produção musical. Manda uma pergunta sobre beat, voz, mix, efeitos ou qualquer coisa de produção!"

Formato recomendado nas respostas:
*Problema:*  
*Solução:*  
*Explicação:*  
*Dica Extra:*  

Sua linguagem é acessível, brasileira e sem enrolação. Ajude o aluno a entender de verdade como melhorar sua produção.
      `
    },
    ...conversationHistory.slice(-6),
    { role: 'user', content: message }
  ];

  try {
    console.log('Mensagens enviadas à OpenAI:', JSON.stringify(messages, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: Bearer ${process.env.OPENAI_API_KEY}
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    console.log('Resposta da OpenAI:', JSON.stringify(data, null, 2));

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(500).json({ message: 'Sem resposta da OpenAI', detalhes: data });
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
    console.error('Erro ao chamar OpenAI:', err);
    return res.status(500).json({ message: 'Erro interno', error: err.message });
  }
}
