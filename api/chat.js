<<<<<<< HEAD
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialização do Firebase com logs detalhados
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
  console.log('🚀 Iniciando handler da API');
  console.log('📊 Método:', req.method);
  console.log('📊 Headers:', req.headers);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('📝 Body recebido:', JSON.stringify(req.body, null, 2));
    
    const { message, conversationHistory = [], idToken } = req.body;

    // Verificar variáveis de ambiente
    console.log('🔍 Verificando variáveis de ambiente...');
    console.log('OPENAI_API_KEY existe:', !!process.env.OPENAI_API_KEY);
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('FIREBASE_CLIENT_EMAIL existe:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.log('FIREBASE_PRIVATE_KEY existe:', !!process.env.FIREBASE_PRIVATE_KEY);

    // Validações de entrada
    if (!idToken) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!message || typeof message !== 'string') {
      console.log('❌ Mensagem inválida:', message);
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não configurada');
      return res.status(500).json({ error: 'Configuração do servidor incompleta' });
    }

    // Verificar token do usuário
    console.log('🔐 Verificando token do usuário...');
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
      console.log('✅ Token verificado para usuário:', decoded.uid);
    } catch (authError) {
      console.error('❌ Erro na autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const uid = decoded.uid;
    const email = decoded.email;

    // Gerenciar usuário no Firestore
    console.log('🗄️ Acessando Firestore...');
    const userRef = db.collection('usuarios').doc(uid);
    const hoje = new Date().toISOString().split('T')[0];

    let userData;
    try {
      const userDoc = await userRef.get();
      console.log('📄 Documento do usuário existe:', userDoc.exists);
      
      if (!userDoc.exists) {
        console.log('🆕 Criando novo usuário...');
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
        console.log('👤 Dados do usuário:', userData);
      }

      // Resetar contador se mudou o dia
      if (userData.ultimaData !== hoje) {
        console.log('🔄 Resetando contador diário...');
        await userRef.update({
          mensagensHoje: 0,
          ultimaData: hoje
        });
        userData.mensagensHoje = 0;
      }

      // Verificar limite de mensagens
      if (userData.plano === 'gratis' && userData.mensagensHoje >= 10) {
        console.log('⚠️ Limite de mensagens atingido');
        return res.status(403).json({ 
          error: 'Limite diário de mensagens atingido',
          limite: 10,
          usadas: userData.mensagensHoje 
        });
      }

    } catch (firestoreError) {
      console.error('❌ Erro no Firestore:', firestoreError);
      return res.status(500).json({ error: 'Erro ao acessar dados do usuário' });
    }

    // Filtrar e validar histórico de conversas
    console.log('📋 Processando histórico de conversas...');
    const mensagensFiltradas = conversationHistory
      .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
      .slice(-10);
    
    console.log('💬 Mensagens filtradas:', mensagensFiltradas.length);

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

    console.log('🤖 Enviando para OpenAI...');
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

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
      });
      
      console.log('📡 Status da resposta OpenAI:', openaiRes.status);
      console.log('📡 Headers da resposta:', openaiRes.headers);
      
    } catch (fetchError) {
      console.error('❌ Erro na requisição OpenAI:', fetchError);
      return res.status(500).json({ error: 'Erro ao conectar com o serviço de IA' });
    }

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('❌ Erro da OpenAI:', openaiRes.status, errorText);
      
      if (openaiRes.status === 401) {
        return res.status(500).json({ error: 'Erro de autenticação com OpenAI' });
      } else if (openaiRes.status === 429) {
        return res.status(429).json({ error: 'Muitas requisições. Tente novamente em alguns minutos.' });
      } else {
        return res.status(500).json({ error: 'Erro no serviço de IA', detalhes: errorText });
      }
    }

    // Processar resposta da OpenAI
    let data;
    try {
      const rawText = await openaiRes.text();
      console.log('📥 Resposta bruta da OpenAI:', rawText);
      data = JSON.parse(rawText);
      console.log('📥 Resposta parseada:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta da OpenAI:', parseError);
      return res.status(500).json({ error: 'Resposta inválida do serviço de IA' });
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('❌ Resposta inválida da OpenAI:', data);
      return res.status(500).json({ error: 'Resposta vazia do serviço de IA' });
    }

    const reply = data.choices[0].message.content.trim();
    console.log('✅ Resposta gerada:', reply);

    // Atualizar contador de mensagens
    if (userData.plano === 'gratis') {
      try {
        await userRef.update({
          mensagensHoje: admin.firestore.FieldValue.increment(1),
        });
        console.log('✅ Contador atualizado');
      } catch (updateError) {
        console.error('⚠️ Erro ao atualizar contador:', updateError);
      }
    }

    console.log('🎉 Resposta enviada com sucesso');
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('💥 ERRO GERAL NO /api/chat.js:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      stack: error.stack
    });
  }
}
=======
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicialização do Firebase com logs detalhados
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
  console.log('🚀 Iniciando handler da API');
  console.log('📊 Método:', req.method);
  console.log('📊 Headers:', req.headers);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('📝 Body recebido:', JSON.stringify(req.body, null, 2));
    
    const { message, conversationHistory = [], idToken } = req.body;

    // Verificar variáveis de ambiente
    console.log('🔍 Verificando variáveis de ambiente...');
    console.log('OPENAI_API_KEY existe:', !!process.env.OPENAI_API_KEY);
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('FIREBASE_CLIENT_EMAIL existe:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.log('FIREBASE_PRIVATE_KEY existe:', !!process.env.FIREBASE_PRIVATE_KEY);

    // Validações de entrada
    if (!idToken) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!message || typeof message !== 'string') {
      console.log('❌ Mensagem inválida:', message);
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY não configurada');
      return res.status(500).json({ error: 'Configuração do servidor incompleta' });
    }

    // Verificar token do usuário
    console.log('🔐 Verificando token do usuário...');
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
      console.log('✅ Token verificado para usuário:', decoded.uid);
    } catch (authError) {
      console.error('❌ Erro na autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const uid = decoded.uid;
    const email = decoded.email;

    // Gerenciar usuário no Firestore
    console.log('🗄️ Acessando Firestore...');
    const userRef = db.collection('usuarios').doc(uid);
    const hoje = new Date().toISOString().split('T')[0];

    let userData;
    try {
      const userDoc = await userRef.get();
      console.log('📄 Documento do usuário existe:', userDoc.exists);
      
      if (!userDoc.exists) {
        console.log('🆕 Criando novo usuário...');
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
        console.log('👤 Dados do usuário:', userData);
      }

      // Resetar contador se mudou o dia
      if (userData.ultimaData !== hoje) {
        console.log('🔄 Resetando contador diário...');
        await userRef.update({
          mensagensHoje: 0,
          ultimaData: hoje
        });
        userData.mensagensHoje = 0;
      }

      // Verificar limite de mensagens
      if (userData.plano === 'gratis' && userData.mensagensHoje >= 10) {
        console.log('⚠️ Limite de mensagens atingido');
        return res.status(403).json({ 
          error: 'Limite diário de mensagens atingido',
          limite: 10,
          usadas: userData.mensagensHoje 
        });
      }

    } catch (firestoreError) {
      console.error('❌ Erro no Firestore:', firestoreError);
      return res.status(500).json({ error: 'Erro ao acessar dados do usuário' });
    }

    // Filtrar e validar histórico de conversas
    console.log('📋 Processando histórico de conversas...');
    const mensagensFiltradas = conversationHistory
      .filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string')
      .slice(-10);
    
    console.log('💬 Mensagens filtradas:', mensagensFiltradas.length);

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

    console.log('🤖 Enviando para OpenAI...');
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

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
      });
      
      console.log('📡 Status da resposta OpenAI:', openaiRes.status);
      console.log('📡 Headers da resposta:', openaiRes.headers);
      
    } catch (fetchError) {
      console.error('❌ Erro na requisição OpenAI:', fetchError);
      return res.status(500).json({ error: 'Erro ao conectar com o serviço de IA' });
    }

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('❌ Erro da OpenAI:', openaiRes.status, errorText);
      
      if (openaiRes.status === 401) {
        return res.status(500).json({ error: 'Erro de autenticação com OpenAI' });
      } else if (openaiRes.status === 429) {
        return res.status(429).json({ error: 'Muitas requisições. Tente novamente em alguns minutos.' });
      } else {
        return res.status(500).json({ error: 'Erro no serviço de IA', detalhes: errorText });
      }
    }

    // Processar resposta da OpenAI
    let data;
    try {
      const rawText = await openaiRes.text();
      console.log('📥 Resposta bruta da OpenAI:', rawText);
      data = JSON.parse(rawText);
      console.log('📥 Resposta parseada:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao parsear resposta da OpenAI:', parseError);
      return res.status(500).json({ error: 'Resposta inválida do serviço de IA' });
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('❌ Resposta inválida da OpenAI:', data);
      return res.status(500).json({ error: 'Resposta vazia do serviço de IA' });
    }

    const reply = data.choices[0].message.content.trim();
    console.log('✅ Resposta gerada:', reply);

    // Atualizar contador de mensagens
    if (userData.plano === 'gratis') {
      try {
        await userRef.update({
          mensagensHoje: admin.firestore.FieldValue.increment(1),
        });
        console.log('✅ Contador atualizado');
      } catch (updateError) {
        console.error('⚠️ Erro ao atualizar contador:', updateError);
      }
    }

    console.log('🎉 Resposta enviada com sucesso');
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('💥 ERRO GERAL NO /api/chat.js:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      stack: error.stack
    });
  }
}
>>>>>>> 1f63759216d495c03d859ccb79c48666ea13f5aa
