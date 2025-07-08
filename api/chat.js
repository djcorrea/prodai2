import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Função para processar a chave privada corretamente
function processPrivateKey(key) {
  if (!key) {
    throw new Error('FIREBASE_PRIVATE_KEY não definida');
  }
  
  // Remove aspas no início e fim se existirem
  let processedKey = key.trim();
  if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
    processedKey = processedKey.slice(1, -1);
  }
  
  // Substitui \\n por quebras de linha reais
  processedKey = processedKey.replace(/\\n/g, '\n');
  
  // Verifica se tem o formato correto
  if (!processedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Chave privada não tem formato PEM válido');
  }
  
  return processedKey;
}

// Inicialização do Firebase com tratamento robusto
let firebaseInitialized = false;
let firebaseError = null;

async function initializeFirebase() {
  if (firebaseInitialized) return true;
  if (firebaseError) throw firebaseError;
  
  try {
    console.log('🔄 Inicializando Firebase...');
    
    // Verificar variáveis obrigatórias
    const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Variável ${varName} não definida`);
      }
    }
    
    // Processar chave privada
    const privateKey = processPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    
    // Configuração do Firebase
    const firebaseConfig = {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    };
    
    // Inicializar apenas se não foi inicializado ainda
    if (!admin.apps.length) {
      admin.initializeApp(firebaseConfig);
    }
    
    // Testar se consegue acessar o Firestore
    const db = getFirestore();
    console.log('✅ Firebase inicializado com sucesso');
    
    firebaseInitialized = true;
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error.message);
    firebaseError = error;
    throw error;
  }
}

export default async function handler(req, res) {
  console.log('🚀 Requisição recebida em /api/chat');

  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    // Inicializar Firebase
    await initializeFirebase();
    const db = getFirestore();
    
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
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const uid = decoded.uid;
    const email = decoded.email;
    console.log(`✅ Usuário autenticado: ${email} (${uid})`);

    // Verificação do usuário no Firebase
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

    // Processar mensagem
    const messageContent = message.trim().substring(0, 2000);
    const mensagensFiltradas = conversationHistory
      .filter(msg => msg && msg.role && msg.content)
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
          content: messageContent,
        },
      ],
    };

    console.log("📤 Enviando para OpenAI...");

    // Requisição para OpenAI com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!openaiRes.ok) {
        const errorText = await openaiRes.text();
        console.error('❌ Erro da OpenAI:', openaiRes.status, errorText);
        
        if (openaiRes.status === 429) {
          return res.status(429).json({ error: 'Rate limit atingido. Tente novamente em alguns minutos.' });
        }
        
        return res.status(500).json({ error: 'Erro da API da OpenAI' });
      }

      const data = await openaiRes.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return res.status(500).json({ error: 'Resposta inválida da OpenAI' });
      }

      const reply = data.choices[0].message.content.trim();

      // Atualizar contador
      if (userData.plano === 'gratis') {
        await userRef.update({
          mensagensHoje: admin.firestore.FieldValue.increment(1),
        });
      }

      console.log('✅ Resposta enviada com sucesso');
      return res.status(200).json({ reply });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ Erro na requisição:', fetchError.message);
      
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({ error: 'Timeout na requisição' });
      }
      
      return res.status(500).json({ error: 'Erro na conexão com OpenAI' });
    }

  } catch (error) {
    console.error('💥 ERRO NO SERVIDOR:', error.message);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
