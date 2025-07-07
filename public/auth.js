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

// Login
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    localStorage.setItem("user", JSON.stringify(result.user));
    console.log("Login realizado com sucesso");
    window.location.href = "/index.html";

  } catch (error) {
    console.error("Erro ao fazer login:", error.message);
    alert("Erro ao fazer login: " + error.message);
  }
};

// Cadastro
window.register = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    localStorage.setItem("user", JSON.stringify(result.user));
    console.log("Usuário cadastrado com sucesso");
    window.location.href = "/index.html";

  } catch (error) {
    console.error("Erro ao cadastrar:", error.message);
    alert("Erro ao cadastrar: " + error.message);
  }
};

window.logout = async function () {
  await firebase.auth().signOut();
  localStorage.removeItem("user");
  window.location.href = "login.html";
};
