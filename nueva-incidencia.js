// nueva-incidencia.js
import { renderSidebar } from './components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);

// 1. Renderizamos el menú lateral y activamos 'incidencias'
renderSidebar('incidencias', auth);

let currentUserData = null;
let currentUserId = null;

// 2. Validar sesión y cargar datos de usuario (para el badge y perfil)
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUserId = user.uid;
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                currentUserData = userDoc.data();

                // Menú lateral (perfil)
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) profileSpan.textContent = `${currentUserData.casa} (${currentUserData.nombre})`;

                // Badge de estatus
                const userBadge = document.getElementById('userBadge');
                if (userBadge) {
                    const estatus = currentUserData.estatusPago || 'pendiente';
                    userBadge.textContent = estatus === 'solvente' ? 'Estado: Solvente' : 'Estado: Pendiente';
                    userBadge.style.backgroundColor = estatus === 'solvente' ? '#d1fae5' : '#fee2e2';
                    userBadge.style.color = estatus === 'solvente' ? '#065f46' : '#991b1b';
                }
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
        }
    }
});

// 3. Manejar el envío del formulario
const incidenciaForm = document.getElementById('incidenciaForm');
if (incidenciaForm) {
    incidenciaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserId || !currentUserData) {
            alert("Error: Usuario no identificado. Recarga la página.");
            return;
        }

        const titulo = document.getElementById('titulo').value;
        const categoria = document.getElementById('categoria').value;
        const descripcion = document.getElementById('descripcion').value;

        const submitButton = incidenciaForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Enviando...";
        submitButton.disabled = true;

        try {
            await addDoc(collection(db, "incidencias"), {
                uid: currentUserId,
                nombreResidente: currentUserData.nombre,
                inmueble: currentUserData.casa,
                titulo: titulo,
                categoria: categoria,
                descripcion: descripcion,
                estatus: "pendiente", // pendiente, en proceso, resuelto
                fechaCreacion: serverTimestamp()
            });

            alert("¡Incidencia reportada con éxito!");
            window.location.href = "incidencias.html";

        } catch (error) {
            console.error("Error al guardar la incidencia:", error);
            alert("Hubo un error al enviar el reporte. Inténtalo de nuevo.");
            submitButton.textContent = "Enviar Reporte";
            submitButton.disabled = false;
        }
    });
}