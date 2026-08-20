// dashboard.js
import { renderSidebar } from './components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 1. Renderizar el menú lateral inicialmente
renderSidebar('inicio', auth);

// Función contable automática para calcular el estatus real del residente
async function calcularEstatusRealResidente(db, userId, casaInmueble) {
    try {
        // 1. Sumar cuotas del inmueble
        const cuotasSnapshot = await getDocs(query(collection(db, "cuotas"), where("casa", "==", casaInmueble)));
        let deudaTotal = 0;
        cuotasSnapshot.forEach(d => deudaTotal += Number(d.data().monto || 0));

        // 2. Sumar pagos aprobados del usuario
        const pagosRef = collection(db, "pagos");
        const pagosSnapshot1 = await getDocs(query(pagosRef, where("userId", "==", userId)));
        const pagosSnapshot2 = await getDocs(query(pagosRef, where("uid", "==", userId)));
        
        const pagosMap = new Map();
        pagosSnapshot1.forEach(d => pagosMap.set(d.id, d.data()));
        pagosSnapshot2.forEach(d => pagosMap.set(d.id, d.data()));

        let pagosTotales = 0;
        pagosMap.forEach(pago => {
            const estatus = pago.estatus ? pago.estatus.toString().toLowerCase() : '';
            if (estatus === 'aprobado') {
                pagosTotales += Number(pago.monto || 0);
            }
        });

        const balance = deudaTotal - pagosTotales;
        return balance <= 0 ? 'solvente' : 'pendiente';
    } catch (error) {
        console.error("Error al calcular estatus real:", error);
        return 'pendiente';
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            // 2. Cargar datos del usuario para el perfil
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            let estatusVal = 'pendiente';

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // NUEVA VALIDACIÓN: Si el usuario está inactivo / suspendido
                if (userData.rol === 'inactivo') {
                    alert("Tu acceso al sistema ha sido suspendido por la administración.");
                    await signOut(auth);
                    window.location.href = "index.html";
                    return;
                }

                // Menú lateral
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) {
                    profileSpan.textContent = `${userData.casa} (${userData.nombre})`;
                }

                // CÁLCULO REAL AUTOMÁTICO (Cruzando cuotas y pagos)
                estatusVal = await calcularEstatusRealResidente(db, user.uid, userData.casa);
            }

            // 3. Actualizar la insignia de estatus principal en el dashboard.html
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