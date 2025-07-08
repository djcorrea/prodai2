import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialização do Firebase com melhor tratamento de erros
if (!admin.apps.length) {
  try {
    console.log('🔄 Inicializando Firebase...');
    
    // Verificar se todas as variáveis estão definidas
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Variáveis do Firebase não configuradas');
    }

    // Melhor tratamento da chave privada
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('✅ Firebase inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error.message);
    // Não lançar erro aqui, deixar para o handler lidar
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  console.log('🚀 Requisição recebida em /api/chat');

  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    // Verificar se o Firebase foi inicializado corretamente
    if (!admin.apps.length) {
      console.error('❌ Firebase não inicializado');
      return res.status(500).json({ error: 'Erro na configuração do servidor' });
    }

    const { message, conversationHistory = [], idToken } = req.body;

    // Validações básicas
    if (!idToken) {
      console.warn('⚠️ idToken ausente na requisição');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem inválida ou vazia' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ API Key da OpenAI não configurada');
      return res.status(500).json({ error: 'API Key da OpenAI não configurada' });
    }

    console.log('🔐 Verificando token do Firebase...');
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (err) {
      console.error('❌ Erro ao verificar o idToken:', err.message);
      return res.status(401).json({ error: 'Token inválido ou expirado', detalhes: err.message });
    }

    const uid = decoded.uid;
    const email = decoded.email;
    console.log(`✅ Usuário autenticado: ${email} (${uid})`);

    // Verificação do usuário no Firebase com tratamento de erro
    let userRef, userDoc, userData;
    try {
      userRef = db.collection('usuarios').doc(uid);
      const hoje = new Date().toISOString().split('T')[0];
      userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({ uid, email, plano: 'gratis', mensagensHoje: 0, ultimaData: hoje });
        userData = { plano: 'gratis', mensagensHoje: 0, ultimaData: hoje };
      } else {
        userData = userDoc.data();
      }

      if (userData.ultimaData !== hoje) {
        await userRef.update({ mensagensHoje: 0, ultimaData: hoje });
        userData.mensagensHoje = 0;
      }

      if (userData.plano === 'gratis' && userData.mensagensHoje >= 10) {
        return res.status(403).json({ error: 'Limite diário de mensagens atingido' });
      }
    } catch (firebaseError) {
      console.error('❌ Erro no Firebase:', firebaseError.message);
      return res.status(500).json({ error: 'Erro na verificação do usuário', detalhes: firebaseError.message });
    }

    // Filtrar e validar histórico de conversas
    const mensagensFiltradas = conversationHistory
      .filter(msg => {
        return msg && 
               msg.role && 
               typeof msg.role === 'string' && 
               ['user', 'assistant', 'system'].includes(msg.role) &&
               msg.content && 
               typeof msg.content === 'string' &&
               msg.content.trim().length > 0;
      })
      .slice(-10); // Limitar histórico

    // Limitar tamanho da mensagem
    const messageContent = message.trim().substring(0, 2000);

    const requestBody = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: 'Você é o Prod.AI 🎵 - um mentor especialista em produção musical brasileira, focado principalmente em FUNK, mas dominando todos os estilos musicais.',
        },
        ...mensagensFiltradas,
        {
          role: 'user',
          content: messageContent,
        },
      ],
    };

    console.log("📤 Enviando para OpenAI...");

    // Usar fetch nativo (disponível em Node.js 18+)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 segundos

    let openaiRes;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ Erro na requisição para OpenAI:', fetchError.message);
      
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({ error: 'Timeout na requisição para OpenAI' });
      }
      
      return res.status(500).json({ 
        error: 'Erro na conexão com OpenAI', 
        detalhes: fetchError.message 
      });
    }

    clearTimeout(timeoutId);

    // Verificar status da resposta
    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('❌ Erro da OpenAI:', {
        status: openaiRes.status,
        statusText: openaiRes.statusText,
        body: errorText
      });
      
      // Tratar diferentes tipos de erro da OpenAI
      if (openaiRes.status === 429) {
        return res.status(429).json({ error: 'Rate limit atingido. Tente novamente em alguns minutos.' });
      } else if (openaiRes.status === 401) {
        return res.status(500).json({ error: 'Erro de autenticação com a OpenAI' });
      } else if (openaiRes.status === 400) {
        return res.status(400).json({ error: 'Requisição inválida para OpenAI' });
      }
      
      return res.status(500).json({
        error: 'Erro da API da OpenAI',
        status: openaiRes.status,
        detalhes: errorText,
      });
    }

    // Processar resposta
    const rawText = await openaiRes.text();
    console.log("📥 Resposta recebida da OpenAI");

    if (!rawText || rawText.trim() === '') {
      console.error('❌ Resposta vazia da OpenAI');
      return res.status(500).json({ error: 'Resposta vazia da OpenAI' });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta da OpenAI:', {
        error: parseError.message,
        raw: rawText.substring(0, 500)
      });
      return res.status(500).json({ 
        error: 'Resposta inválida da OpenAI (não é JSON válido)', 
        parseError: parseError.message 
      });
    }

    // Validar estrutura da resposta
    if (!data) {
      return res.status(500).json({ error: 'Dados da OpenAI são nulos' });
    }

    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.warn('⚠️ Resposta da OpenAI sem choices válidos:', data);
      return res.status(500).json({ error: 'Resposta da OpenAI sem opções válidas', data });
    }

    if (!data.choices[0]?.message?.content) {
      console.warn('⚠️ Resposta da OpenAI sem conteúdo de mensagem:', data.choices[0]);
      return res.status(500).json({ error: 'Resposta da OpenAI sem conteúdo de mensagem', data });
    }

    const reply = data.choices[0].message.content.trim();

    if (!reply || reply.length === 0) {
      return res.status(500).json({ error: 'Resposta da OpenAI está vazia após trim' });
    }

    // Atualizar contador de mensagens
    if (userData.plano === 'gratis') {
      try {
        await userRef.update({
          mensagensHoje: admin.firestore.FieldValue.increment(1),
        });
      } catch (updateError) {
        console.warn('⚠️ Erro ao atualizar contador de mensagens:', updateError);
        // Não retornar erro aqui, pois a resposta já foi gerada
      }
    }

    console.log('✅ Resposta enviada com sucesso');
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('💥 ERRO NO SERVIDOR:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      detalhes: error.message 
    });
  }
}
