// auth.js

// 1. Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "AIzaSyBKby0RdI0GohrfBMRcWnL25peU3epGTw",
  authDomain: "prodai-58436.firebaseapp.com",
  projectId: "prodai-58436",
  storageBucket: "prodai-58436.appspot.com",
  messagingSenderId: "801631191322",
  appId: "1:801631191322:web:80e3d29cf7468331652ca3",
  measurementId: "G-MBDDHYN6Z0"
};


firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// 2. Função de login
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    localStorage.setItem("user", JSON.stringify(result.user));
    window.location.href = "index.html";
  } catch (error) {
    alert("Erro ao fazer login: " + error.message);
  }
};

// 3. Função de cadastro
window.register = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    localStorage.setItem("user", JSON.stringify(result.user));
    window.location.href = "index.html";
  } catch (error) {
    alert("Erro ao cadastrar: " + error.message);
  }
};

