// incidencias-list.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
            // 1. Cargar datos del usuario para el perfil y badge
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Menú lateral
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) profileSpan.textContent = `${userData.casa} (${userData.nombre})`;

                // Badge de estatus
                const userBadge = document.getElementById('userBadge');
                if (userBadge) {
                    const estatus = userData.estatusPago || 'pendiente';
                    userBadge.textContent = estatus === 'solvente' ? 'Estado: Solvente' : 'Estado: Pendiente';
                    userBadge.style.backgroundColor = estatus === 'solvente' ? '#d1fae5' : '#fee2e2';
                    userBadge.style.color = estatus === 'solvente' ? '#065f46' : '#991b1b';
                }
            }

            // 2. Consultar el historial de incidencias de este usuario específico
            const incidenciasRef = collection(db, "incidencias");
            const q = query(incidenciasRef, where("uid", "==", user.uid));
            const querySnapshot = await getDocs(q);

            const container = document.getElementById('incidenciasList');
            container.innerHTML = ""; // Limpiar texto de carga

            if (querySnapshot.empty) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 2rem;">
                        <p style="color: var(--text-muted, #666); margin: 0;">No has reportado ninguna incidencia todavía.</p>
                    </div>
                `;
                return;
            }

            // Renderizar cada reporte encontrado
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                
                // Formatear fecha si existe
                let fechaStr = "Fecha reciente";
                if (data.fechaCreacion && data.fechaCreacion.toDate) {
                    fechaStr = data.fechaCreacion.toDate().toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    });
                }

                // Estilos visuales para el estatus de la incidencia
                const estatusColor = data.estatus === 'resuelto' ? '#065f46' : '#b45309';
                const estatusBg = data.estatus === 'resuelto' ? '#d1fae5' : '#fef3c7';
                const estatusTexto = data.estatus ? data.estatus.toUpperCase() : 'PENDIENTE';

                const cardHTML = `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                        <div>
                            <span style="font-size: 0.85rem; color: var(--text-muted, #666);">${fechaStr}</span>
                            <h4 style="margin: 0.25rem 0 0.5rem 0; color: var(--text-main, #222); text-transform: capitalize;">${data.tipo} - <span style="font-weight: normal; font-size: 0.95rem;">${data.ubicacion}</span></h4>
                            <p style="margin: 0; color: var(--text-main, #444); font-size: 0.95rem;">${data.descripcion}</p>
                        </div>
                        <span style="background-color: ${estatusBg}; color: ${estatusColor}; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">
                            ${estatusTexto}
                        </span>
                    </div>
                `;
                container.innerHTML += cardHTML;
            });

        } catch (error) {
            console.error("Error al cargar las incidencias:", error);
            document.getElementById('incidenciasList').innerHTML = `<p style="color: #991b1b;">Error al cargar el historial.</p>`;
        }
    }
});