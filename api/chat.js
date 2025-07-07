import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialização do Firebase com verificação melhorada
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "prodai-58436",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { message, conversationHistory = [], idToken } = req.body;

    // Validações de entrada
    if (!idToken) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY não configurada');
      return res.status(500).json({ error: 'Configuração do servidor incompleta' });
    }

    // Verificar token do usuário
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (authError) {
      console.error('Erro na autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const uid = decoded.uid;
    const email = decoded.email;

    // Gerenciar usuário no Firestore
    const userRef = db.collection('usuarios').doc(uid);
    const hoje = new Date().toISOString().split('T')[0];

    let userData;
    try {
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        await userRef.set({
          uid,
          email,
          plano: 'gratis',
          mensagensHoje: 0,
          ultimaData: hoje,
        });
        userData = { plano: 'gratis', mensagensHoje: 0, ultimaData: hoje };
      } else {
        userData = userDoc.data();
      }

      // Resetar contador se mudou o dia
      if (userData.ultimaData !== hoje) {
        await userRef.update({
          mensagensHoje: 0,
          ultimaData: hoje
        });
        userData.mensagensHoje = 0;
      }

      // Verificar limite de mensagens
      if (userData.plano === 'gratis' && userData.mensagensHoje >= 10) {
        return res.status(403).json({ 
          error: 'Limite diário de mensagens atingido',
          limite: 10,
          usadas: userData.mensagensHoje 
        });
      }

    } catch (firestoreError) {
      console.error('Erro no Firestore:', firestoreError);
      return res.status(500).json({ error: 'Erro ao acessar dados do usuário' });
    }

    // Filtrar e validar histórico de conversas
    const mensagensFiltradas = conversationHistory
      .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
      .slice(-10); // Limitar histórico para evitar tokens excessivos

    // Preparar requisição para OpenAI
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
          content: message.trim(),
        },
      ],
    };

    // Fazer requisição para OpenAI
    let openaiRes;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        timeout: 30000, // 30 segundos de timeout
      });
    } catch (fetchError) {
      console.error('Erro na requisição OpenAI:', fetchError);
      return res.status(500).json({ error: 'Erro ao conectar com o serviço de IA' });
    }

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('Erro da OpenAI:', openaiRes.status, errorText);
      
      if (openaiRes.status === 401) {
        return res.status(500).json({ error: 'Erro de autenticação com OpenAI' });
      } else if (openaiRes.status === 429) {
        return res.status(429).json({ error: 'Muitas requisições. Tente novamente em alguns minutos.' });
      } else {
        return res.status(500).json({ error: 'Erro no serviço de IA' });
      }
    }

    // Processar resposta da OpenAI
    let data;
    try {
      const rawText = await openaiRes.text();
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Erro ao parsear resposta da OpenAI:', parseError);
      return res.status(500).json({ error: 'Resposta inválida do serviço de IA' });
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('Resposta inválida da OpenAI:', data);
      return res.status(500).json({ error: 'Resposta vazia do serviço de IA' });
    }

    const reply = data.choices[0].message.content.trim();

    // Atualizar contador de mensagens
    if (userData.plano === 'gratis') {
      try {
        await userRef.update({
          mensagensHoje: admin.firestore.FieldValue.increment(1),
        });
      } catch (updateError) {
        console.error('Erro ao atualizar contador:', updateError);
        // Não retornar erro aqui para não bloquear a resposta
      }
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('[ERRO GERAL NO /api/chat.js]', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Tente novamente em alguns instantes'
    });
  }
}
