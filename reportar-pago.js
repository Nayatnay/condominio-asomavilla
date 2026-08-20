// reportar-pago.js
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

// Renderizamos el menú lateral
renderSidebar('estado', auth);

let currentUserData = null;
let currentUserId = null;

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

                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) profileSpan.textContent = `${currentUserData.casa} (${currentUserData.nombre})`;

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

const pagoForm = document.getElementById('pagoForm');
if (pagoForm) {
    pagoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserId || !currentUserData) {
            alert("Error: Usuario no identificado. Recarga la página.");
            return;
        }

        const banco = document.getElementById('banco').value;
        const referencia = document.getElementById('referencia').value;
        const monto = document.getElementById('monto').value;
        const fechaPago = document.getElementById('fechaPago').value;
        const observacion = document.getElementById('observacion').value || "Pago de cuota de condominio";

        const submitButton = pagoForm.querySelector('button[type="submit"]');
        submitButton.textContent = "Registrando...";
        submitButton.disabled = true;

        try {
            await addDoc(collection(db, "pagos"), {
                uid: currentUserId,
                nombreResidente: currentUserData.nombre,
                inmueble: currentUserData.casa,
                banco: banco,
                referencia: referencia,
                monto: parseFloat(monto),
                fechaPago: fechaPago,
                observacion: observacion,
                estatus: "en revision", // en revision, aprobado, rechazado
                fechaCreacion: serverTimestamp()
            });

            alert("¡Pago reportado con éxito! La administración lo verificará próximamente.");
            window.location.href = "estado-de-cuenta.html";

        } catch (error) {
            console.error("Error al registrar el pago:", error);
            alert("Hubo un error al procesar el pago. Inténtalo de nuevo.");
            submitButton.textContent = "Enviar Reporte de Pago";
            submitButton.disabled = false;
        }
    });
}