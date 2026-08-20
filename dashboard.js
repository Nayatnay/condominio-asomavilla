// dashboard.js
import { renderSidebar } from './components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 1. Renderizar el menú lateral inicialmente (igual que en incidencias)
renderSidebar('inicio', auth);

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            // 2. Cargar datos del usuario para el perfil y el estatus
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            let estatusVal = 'pendiente';

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Menú lateral (idéntico a incidencias)
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) {
                    profileSpan.textContent = `${userData.casa} (${userData.nombre})`;
                }

                estatusVal = userData.estatusPago || 'pendiente';
            }

            // 3. Actualizar la insignia de estatus principal en el dashboard.html (si existe)
            const statusBadge = document.getElementById('dashboardStatusBadge');
            if (statusBadge) {
                const esSolvente = estatusVal.toLowerCase() === 'solvente';
                statusBadge.textContent = estatusVal.toUpperCase();
                statusBadge.style.backgroundColor = esSolvente ? '#d1fae5' : '#fee2e2';
                statusBadge.style.color = esSolvente ? '#065f46' : '#991b1b';
            }

            // 4. Cargar y mostrar los comunicados en el dashboard
            const comunicadosRef = collection(db, "comunicados");
            const querySnapshot = await getDocs(comunicadosRef);
            
            const container = document.getElementById('comunicadosContainer');
            if (container) {
                container.innerHTML = "";

                if (querySnapshot.empty) {
                    container.innerHTML = `<div class="announcement-card" style="padding: 1rem; color: var(--text-muted, #666); font-size: 0.9rem;">No hay comunicados publicados en este momento.</div>`;
                } else {
                    querySnapshot.forEach((docSnap) => {
                        const comm = docSnap.data();
                        
                        const cardHTML = `
                            <div class="announcement-card">
                                <span style="font-size: 0.75rem; color: var(--text-muted, #888); display: block; margin-bottom: 0.25rem; font-weight: 500;">${comm.fecha || ''}</span>
                                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-main, #222);">${comm.titulo}</h4>
                                <p style="margin: 0; color: var(--text-muted, #555); font-size: 0.95rem; line-height: 1.4;">${comm.mensaje}</p>
                            </div>
                        `;
                        container.innerHTML += cardHTML;
                    });
                }
            }

        } catch (error) {
            console.error("Error al cargar el dashboard:", error);
        }
    }
});

// Lógica para cerrar sesión (idéntica a incidencias)
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