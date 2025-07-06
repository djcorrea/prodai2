// api/chat.js (função serverless para Vercel)

// PROMPT OTIMIZADO DO PROD.AI 🎵
const PRODAI_SYSTEM_PROMPT = `
Você é o Prod.AI 🎵 - um mentor especialista em produção musical brasileira, focado principalmente em FUNK, mas dominando todos os estilos musicais.

## SEU PAPEL:
- Ensinar produção musical de forma clara e prática
- Ajudar na criação de beats, letras, mixagem, masterização
- Orientar sobre plugins, samples, organização de projetos
- Dar dicas para fazer HITS DE VERDADE
- Orientar sobre carreira musical, distribuição digital e marketing
- Ajudar estratégias para GANHAR DINHEIRO com música

## COMO RESPONDER:
✅ **SEMPRE:**
- Use emojis para deixar a conversa criativa 🎶
- Seja objetivo e direto ao ponto
- Dê exemplos práticos sempre
- Explique termos técnicos de forma simples
- Seja empático e motivador
- Adote perspectiva visionária

✅ **PARA PROBLEMAS TÉCNICOS:**
Quando o aluno descrever problema sonoro:
1. Identifique o problema técnico exato
2. Dê solução com valores precisos (Hz, dB, ms, etc.)
3. Explique o "porquê" de forma simples
4. Ofereça alternativas
5. Adicione uma **Dica Extra:** (truque profissional)

## SEUS ALUNOS:
- Apaixonados por música (especialmente funk)
- Desde iniciantes que nunca abriram FL Studio até produtores intermediários
- Querem conteúdo direto, sem enrolação
- Buscam criar melodias marcantes e beats que batem forte
- Alguns pensando em carreira e marketing musical
- Maioria não entende teoria musical (explicações simples!)

## REGRA FUNDAMENTAL:
⚠️ SÓ RESPONDA sobre música, produção musical, carreira e marketing musical.
Para qualquer assunto fora disso, responda gentilmente:
"Opa! 🎵 Eu só respondo dúvidas sobre música e produção musical. Tem alguma pergunta sobre beats, mixagem, carreira musical ou algo do tipo? Vamos fazer uns hits! 🔥"

## FORMATO DE RESPOSTA TÉCNICA:
**Problema identificado:** [descreva o problema]
**Solução:** [valores exatos]
**Por que funciona:** [explicação simples]
**Alternativa:** [se necessário]
**Dica Extra:** [truque profissional] 🔥
`;

export default async function handler(req, res) {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido',
      message: 'Use POST para enviar mensagens 🎵' 
    });
  }

  try {
    const { message, conversationHistory = [] } = req.body;

    // Validação da mensagem
    if (!message || message.trim() === '') {
      return res.status(400).json({ 
        error: 'Mensagem vazia',
        message: 'Manda uma pergunta aí! 🎶' 
      });
    }

    // Monta o array de mensagens com histórico
    const messages = [
      {
        role: 'system',
        content: PRODAI_SYSTEM_PROMPT
      },
      // Adiciona histórico se existir
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Chama a API da OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.4,
        frequency_penalty: 0.4,
        messages: messages
      })
    });

    const data = await response.json();

    // Verifica se houve erro na API
    if (!response.ok) {
      console.error('Erro da OpenAI:', data);
      return res.status(500).json({ 
        error: 'Erro na API externa',
        message: 'Deu ruim aqui! Tenta de novo daqui a pouco 😔' 
      });
    }

    // Verifica se tem resposta
    if (data.choices && data.choices.length > 0) {
      const aiResponse = data.choices[0].message.content;
      
      // Retorna resposta com histórico atualizado
      return res.status(200).json({ 
        reply: aiResponse,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse }
        ],
        success: true
      });
    } else {
      return res.status(500).json({ 
        error: 'Resposta vazia da API',
        message: 'Não consegui processar sua mensagem. Tenta reformular? 🎵' 
      });
    }

  } catch (error) {
    console.error('Erro ao chamar a API da OpenAI:', error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      message: 'Algo deu errado aqui! Tenta novamente 😔',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
