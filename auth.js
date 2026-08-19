

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// Lógica del Login (la que ya tenías)
const loginForm = document.querySelector('form');
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            alert("Error de acceso: Comprueba tu correo y contraseña.");
        });
});

// NUEVO: Lógica de "¿Olvidaste tu contraseña?"
document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();

    // Pedimos el correo mediante una ventana emergente del navegador (Prompt)
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
