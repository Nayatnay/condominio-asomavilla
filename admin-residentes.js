// admin-residentes.js
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            // 1. Validar si el usuario actual es Administrador
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || userDoc.data().rol !== 'admin') {
                alert("Acceso denegado. Esta sección es exclusiva para administradores.");
                window.location.href = "dashboard.html";
                return;
            }

            // Si es admin, renderizamos el menú de admin
            renderAdminSidebar('residentes', auth);

            // 2. Cargar todos los residentes de la comunidad
            const querySnapshot = await getDocs(collection(db, "usuarios"));
            const container = document.getElementById('residentesList');
            container.innerHTML = "";

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const userId = docSnap.id;
                const esSolvente = data.estatusPago === 'solvente';

                const cardHTML = `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                        <div>
                            <span style="font-size: 0.85rem; color: #0284c7; font-weight: 600;">Inmueble: ${data.casa || 'N/A'}</span>
                            <h4 style="margin: 0.2rem 0; color: var(--text-main, #222);">${data.nombre}</h4>
                            <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">Email: ${data.email || 'No registrado'}</p>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="background-color: ${esSolvente ? '#d1fae5' : '#fee2e2'}; color: ${esSolvente ? '#065f46' : '#991b1b'}; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600;">
                                ${esSolvente ? 'SOLVENTE' : 'PENDIENTE'}
                            </span>
                            <button class="btn toggle-status-btn" data-id="${userId}" data-status="${esSolvente ? 'pendiente' : 'solvente'}" style="background-color: ${esSolvente ? '#ef4444' : '#10b981'}; font-size: 0.85rem; padding: 0.4rem 0.8rem;">
                                ${esSolvente ? 'Marcar Pendiente' : 'Marcar Solvente'}
                            </button>
                        </div>
                    </div>
                `;
                container.innerHTML += cardHTML;
            });

            // 3. Activar los botones de cambio de estatus en tiempo real
            document.querySelectorAll('.toggle-status-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const targetUserId = e.target.getAttribute('data-id');
                    const nuevoEstatus = e.target.getAttribute('data-status');

                    try {
                        const targetUserRef = doc(db, "usuarios", targetUserId);
                        await updateDoc(targetUserRef, {
                            estatusPago: nuevoEstatus
                        });

                        alert(`Estatus actualizado a: ${nuevoEstatus.toUpperCase()}`);
                        location.reload(); // Recarga para ver reflejado el cambio
                    } catch (error) {
                        console.error("Error al actualizar estatus:", error);
                        alert("No se pudo actualizar el estatus.");
                    }
                });
            });

        } catch (error) {
            console.error("Error de permisos:", error);
            window.location.href = "dashboard.html";
        }
    }
});