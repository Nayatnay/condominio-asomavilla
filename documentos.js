// documentos.js
import { renderSidebar } from './components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

renderSidebar('documentos', auth);

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            // 1. Cargar datos del usuario para el perfil y badge
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) profileSpan.textContent = `${userData.casa} (${userData.nombre})`;

                const userBadge = document.getElementById('userBadge');
                if (userBadge) {
                    const estatus = userData.estatusPago || 'pendiente';
                    userBadge.textContent = estatus === 'solvente' ? 'Estado: Solvente' : 'Estado: Pendiente';
                    userBadge.style.backgroundColor = estatus === 'solvente' ? '#d1fae5' : '#fee2e2';
                    userBadge.style.color = estatus === 'solvente' ? '#065f46' : '#991b1b';
                }
            }

            // 2. Consultar los documentos en Firestore
            const querySnapshot = await getDocs(collection(db, "documentos"));
            const container = document.getElementById('documentosList');
            container.innerHTML = "";

            if (querySnapshot.empty) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 2rem;">
                        <p style="color: var(--text-muted, #666); margin: 0;">No hay documentos publicados en este momento.</p>
                    </div>
                `;
                return;
            }

            // Renderizar cada documento
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();

                const cardHTML = `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                        <div>
                            <span style="font-size: 0.8rem; background-color: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 500;">
                                ${data.categoria || 'General'}
                            </span>
                            <h4 style="margin: 0.4rem 0 0.2rem 0; color: var(--text-main, #222);">${data.titulo}</h4>
                            <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">${data.descripcion || 'Sin descripción'}</p>
                        </div>
                        <a href="${data.urlArchivo}" target="_blank" class="btn" style="text-decoration: none; white-space: nowrap; font-size: 0.9rem; padding: 0.5rem 1rem;">
                            Ver / Descargar PDF
                        </a>
                    </div>
                `;
                container.innerHTML += cardHTML;
            });

        } catch (error) {
            console.error("Error al cargar los documentos:", error);
            document.getElementById('documentosList').innerHTML = `<p style="color: #991b1b;">Error al cargar la lista de documentos.</p>`;
        }
    }
});

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