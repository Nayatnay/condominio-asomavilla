// incidencias.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// La misma configuración de Firebase que ya usas
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

let currentUserData = null;
let currentUserId = null;

// 1. Verificar sesión y cargar datos del usuario (para el menú lateral e insignia)
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

                // Actualizar menú lateral
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) {
                    profileSpan.textContent = `${currentUserData.casa} (${currentUserData.nombre})`;
                }

                // Actualizar badge superior
                // Actualizar badge superior con el estatus de pago
                const userBadge = document.getElementById('userBadge');
                if (userBadge) {
                    const estatus = currentUserData.estatusPago || 'pendiente';

                    if (estatus === 'solvente') {
                        userBadge.textContent = 'Estado: Solvente';
                        userBadge.style.backgroundColor = '#d1fae5';
                        userBadge.style.color = '#065f46';
                    } else {
                        userBadge.textContent = 'Estado: Pendiente';
                        userBadge.style.backgroundColor = '#fee2e2';
                        userBadge.style.color = '#991b1b';
                    }
                }
            }
        } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
        }
    }
});

// 2. Manejar el envío del formulario de incidencias
const incidentForm = document.getElementById('incidentForm');
if (incidentForm) {
    incidentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserId || !currentUserData) {
            alert("Error: No se ha identificado al usuario. Por favor, recarga la página.");
            return;
        }

        // Capturar los valores del formulario
        const tipo = document.getElementById('tipo').value;
        const ubicacion = document.getElementById('ubicacion').value;
        const descripcion = document.getElementById('descripcion').value;

        const submitButton = incidentForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Enviando...";
        submitButton.disabled = true;

        try {
            // Guardar en la colección "incidencias" de Firestore
            await addDoc(collection(db, "incidencias"), {
                uid: currentUserId,
                nombreResidente: currentUserData.nombre,
                inmueble: currentUserData.casa,
                tipo: tipo,
                ubicacion: ubicacion,
                descripcion: descripcion,
                estatus: "pendiente", // estatus inicial del reporte
                fechaCreacion: serverTimestamp()
            });

            alert("¡Reporte enviado con éxito! La administración ha sido notificada.");

            // Limpiar formulario o redirigir al dashboard
            window.location.href = "incidencias.html";

        } catch (error) {
            console.error("Error al guardar la incidencia:", error);
            alert("Hubo un error al enviar el reporte. Inténtalo de nuevo.");
            submitButton.textContent = "Enviar Reporte";
            submitButton.disabled = false;
        }
    });
}