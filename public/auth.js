const firebaseConfig = {
  apiKey: "AIzaSyBKby0RdIOGorhrfBRMCWnL25peU3epGTw",
  authDomain: "prodai-58436.firebaseapp.com",
  projectId: "prodai-58436",
  storageBucket: "prodai-58436.firebasestorage.app",
  messagingSenderId: "801631191322",
  appId: "1:801631191322:web:80e3d29cf7468331652ca3",
  measurementId: "G-MBDHDYN6Z0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// 🔐 LOGIN
window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  
  if (!email || !password) {
    alert("Por favor, preencha todos os campos");
    return;
  }

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    
    // Obter o token ID
    const idToken = await result.user.getIdToken();
    
    // Salvar dados do usuário
    const userData = {
      uid: result.user.uid,
      email: result.user.email,
      idToken: idToken
    };
    
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("idToken", idToken);
    
    console.log("Login realizado com sucesso");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro no login:", error);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = "Erro desconhecido";
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = "Usuário não encontrado";
        break;
      case 'auth/wrong-password':
        errorMessage = "Senha incorreta";
        break;
      case 'auth/invalid-email':
        errorMessage = "Email inválido";
        break;
      case 'auth/user-disabled':
        errorMessage = "Conta desabilitada";
        break;
      case 'auth/too-many-requests':
        errorMessage = "Muitas tentativas. Tente novamente mais tarde";
        break;
      default:
        errorMessage = error.message;
    }
    
    alert("Erro ao fazer login: " + errorMessage);
  }
};

// 👤 REGISTRO
window.register = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  
  if (!email || !password) {
    alert("Por favor, preencha todos os campos");
    return;
  }

  if (password.length < 6) {
    alert("A senha deve ter pelo menos 6 caracteres");
    return;
  }

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    
    // Obter o token ID
    const idToken = await result.user.getIdToken();
    
    // Salvar dados do usuário
    const userData = {
      uid: result.user.uid,
      email: result.user.email,
      idToken: idToken
    };
    
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("idToken", idToken);
    
    console.log("Usuário cadastrado com sucesso");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro no registro:", error);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = "Erro desconhecido";
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = "Este email já está em uso";
        break;
      case 'auth/invalid-email':
        errorMessage = "Email inválido";
        break;
      case 'auth/weak-password':
        errorMessage = "Senha muito fraca";
        break;
      default:
        errorMessage = error.message;
    }
    
    alert("Erro ao cadastrar: " + errorMessage);
  }
};

// 🔓 LOGOUT
window.logout = async function () {
  try {
    await auth.signOut();
    localStorage.removeItem("user");
    localStorage.removeItem("idToken");
    console.log("Logout realizado com sucesso");
    window.location.href = "login.html";
  } catch (error) {
    console.error("Erro no logout:", error);
  }
};

// 🔄 VERIFICAÇÃO DE SESSÃO E RENOVAÇÃO DE TOKEN
auth.onAuthStateChanged(async (user) => {
  const isLoginPage = window.location.pathname.includes("login.html");
  
  if (!user && !isLoginPage) {
    // Usuário não autenticado, redirecionar para login
    localStorage.removeItem("user");
    localStorage.removeItem("idToken");
    window.location.href = "login.html";
    return;
  }
  
  if (user && isLoginPage) {
    // Usuário autenticado na página de login, redirecionar para index
    window.location.href = "index.html";
    return;
  }
  
  if (user && !isLoginPage) {
    // Usuário autenticado, renovar token se necessário
    try {
      const idToken = await user.getIdToken(true); // force refresh
      
      const userData = {
        uid: user.uid,
        email: user.email,
        idToken: idToken
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("idToken", idToken);
      
      console.log("Token renovado com sucesso");
    } catch (error) {
      console.error("Erro ao renovar token:", error);
      // Se não conseguir renovar o token, fazer logout
      window.logout();
    }
  }
});

// 🔧 FUNÇÃO PARA OBTER TOKEN ATUALIZADO
window.getIdToken = async function() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Usuário não autenticado");
    }
    
    const idToken = await user.getIdToken(true); // force refresh
    localStorage.setItem("idToken", idToken);
    
    return idToken;
  } catch (error) {
    console.error("Erro ao obter token:", error);
    throw error;
  }
};

// 🔧 FUNÇÃO PARA VERIFICAR SE TOKEN ESTÁ VÁLIDO
window.isTokenValid = async function() {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    
    // Tentar obter um novo token
    await user.getIdToken(true);
    return true;
  } catch (error) {
    console.error("Token inválido:", error);
    return false;
  }
};
