import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCMgOYewIjMNYyHF-yy71IbOSdW2hVk07E",
    authDomain: "condominio-asomavilla.firebaseapp.com",
    projectId: "condominio-asomavilla",
    storageBucket: "condominio-asomavilla.firebasestorage.app",
    messagingSenderId: "770299926737",
    appId: "1:770299926737:web:1df3cd723dc70dc62e4df0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Inicializamos Firestore

// Lógica del Login con validación de rol
const loginForm = document.querySelector('form');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // 1. Iniciamos sesión
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Consultamos sus datos en Firestore para verificar el rol
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().rol === 'admin') {
            // Si es administrador, lo mandamos al panel de control de admin
            window.location.href = "admin-dashboard.html";
        } else {
            // Si es un residente normal, lo mandamos al dashboard habitual
            window.location.href = "dashboard.html";
        }

    } catch (error) {
        console.error("Error de acceso:", error);
        alert("Error de acceso: Comprueba tu correo y contraseña.");
    }
});

// Lógica de "¿Olvidaste tu contraseña?"
document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();

    const emailPrompt = prompt("Por favor, introduce tu correo electrónico registrado:");

    if (emailPrompt) {
        sendPasswordResetEmail(auth, emailPrompt)
            .then(() => {
                alert("¡Correo enviado! Revisa tu bandeja de entrada (y spam) para restablecer tu contraseña.");
            })
            .catch((error) => {
                alert("No se pudo enviar el correo. Asegúrate de que la dirección sea correcta.");
                console.error(error.code, error.message);
            });
    }
});