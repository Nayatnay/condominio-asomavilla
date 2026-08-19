// nueva-reserva.js
import { renderSidebar } from './components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

let currentUserData = null;
let currentUserId = null;

renderSidebar('reservas', auth);

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

                // Menú lateral
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

const reservaForm = document.getElementById('reservaForm');
if (reservaForm) {
    reservaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserId || !currentUserData) {
            alert("Error: Usuario no identificado. Recarga la página.");
            return;
        }

        const area = document.getElementById('area').value;
        const fecha = document.getElementById('fecha').value;
        const turno = document.getElementById('turno').value;
        const motivo = document.getElementById('motivo').value || "Reunión familiar";

        // Validación extra: Verificar si el usuario está solvente antes de reservar (Regla típica de condominio)
        if (currentUserData.estatusPago !== 'solvente') {
            alert("Atención: Para reservar áreas comunes debes encontrarte en estatus Solvente.");
            return;
        }

        const submitButton = reservaForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Procesando...";
        submitButton.disabled = true;

        try {
            await addDoc(collection(db, "reservas"), {
                uid: currentUserId,
                nombreResidente: currentUserData.nombre,
                inmueble: currentUserData.casa,
                area: area,
                fecha: fecha,
                turno: turno,
                motivo: motivo,
                estatus: "confirmada", // o "pendiente" si el administrador debe aprobarla
                fechaCreacion: serverTimestamp()
            });

            alert("¡Reserva realizada con éxito!");
            window.location.href = "reservas.html";

        } catch (error) {
            console.error("Error al guardar la reserva:", error);
            alert("Hubo un error al procesar la reserva. Inténtalo de nuevo.");
            submitButton.textContent = "Confirmar Reserva";
            submitButton.disabled = false;
        }
    });
}

// Lógica para cerrar sesión
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Error al cerrar sesión", error);
        });
    });
}