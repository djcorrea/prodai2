// auth.js

// 1. Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
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

