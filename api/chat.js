console.log("✅ Chave API:", process.env.OPENAI_API_KEY ? 'OK' : 'Faltando');
console.log("✅ Firebase Key:", process.env.FIREBASE_PRIVATE_KEY ? 'OK' : 'Faltando');
console.log("✅ Client Email:", process.env.FIREBASE_CLIENT_EMAIL);

import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialização do Firebase
if (!admin.apps.length) {
  try {
    console.log('🔄 Inicializando Firebase...');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "prodai-58436",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  console.log('🚀 Requisição recebida em /api/chat');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { message, conversationHistory = [], idToken } = req.body;

    if (!idToken) {
      console.warn('⚠️ idToken ausente na requisição');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    if (!process.env.OPENAI_API_KEY) {
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

    const userRef = db.collection('usuarios').doc(uid);
    const hoje = new Date().toISOString().split('T')[0];

    let userDoc = await userRef.get();
    let userData;

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

    const mensagensFiltradas = conversationHistory
      .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
      .slice(-10);

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

    console.log("📤 Enviando para OpenAI:", JSON.stringify(requestBody, null, 2));

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await openaiRes.text();

    if (!openaiRes.ok) {
      console.error('❌ Erro da OpenAI:', rawText);
      return res.status(500).json({
        error: 'Erro da API da OpenAI',
        detalhes: rawText,
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      console.error('❌ Erro ao fazer parse da resposta da OpenAI:', rawText);
      return res.status(500).json({ error: 'Resposta inválida da OpenAI', raw: rawText });
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.warn('⚠️ Resposta da OpenAI sem conteúdo');
      return res.status(500).json({ error: 'Resposta da OpenAI vazia ou inválida', data });
    }

    const reply = data.choices[0].message.content.trim();

    if (userData.plano === 'gratis') {
      await userRef.update({
        mensagensHoje: admin.firestore.FieldValue.increment(1),
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('💥 ERRO NO SERVIDOR:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', detalhes: error.message });
  }
}
