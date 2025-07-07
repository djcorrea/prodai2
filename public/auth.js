// auth.js

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

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    localStorage.setItem("user", JSON.stringify(result.user));
    alert("Login realizado com sucesso!");
    console.log("Usuário autenticado:", result.user);

    // Caminho correto (ajuste conforme sua estrutura)
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro ao fazer login:", error.message);
    alert("Erro ao fazer login: " + error.message);
  }
};

// 👤 CADASTRO
window.register = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    localStorage.setItem("user", JSON.stringify(result.user));
    alert("Cadastro realizado com sucesso!");
    console.log("Usuário cadastrado:", result.user);

    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro ao cadastrar:", error.message);
    alert("Erro ao cadastrar: " + error.message);
  }
};

// 🔓 LOGOUT
window.logout = async function () {
  await auth.signOut();
  localStorage.removeItem("user");
  window.location.href = "login.html";
};
