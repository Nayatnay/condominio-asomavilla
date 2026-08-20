// reservas-list.js
import { renderSidebar } from './components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

renderSidebar('reservas', auth);

// Función contable automática para calcular el estatus real del residente
async function calcularEstatusRealResidente(db, userId, casaInmueble) {
    try {
        const cuotasSnapshot = await getDocs(query(collection(db, "cuotas"), where("casa", "==", casaInmueble)));
        let deudaTotal = 0;
        cuotasSnapshot.forEach(d => deudaTotal += Number(d.data().monto || 0));

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
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            let estatusVal = 'pendiente';

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) profileSpan.textContent = `${userData.casa} (${userData.nombre})`;

                // CÁLCULO REAL AUTOMÁTICO (Cruzando cuotas y pagos)
                estatusVal = await calcularEstatusRealResidente(db, user.uid, userData.casa);

                const userBadge = document.getElementById('userBadge');
                if (userBadge) {
                    const esSolvente = estatusVal.toLowerCase() === 'solvente';
                    userBadge.textContent = esSolvente ? 'Estado: Solvente' : 'Estado: Pendiente';
                    userBadge.style.backgroundColor = esSolvente ? '#d1fae5' : '#fee2e2';
                    userBadge.style.color = esSolvente ? '#065f46' : '#991b1b';
                }
            }

            // Consultar reservas del usuario
            const reservasRef = collection(db, "reservas");
            const q = query(reservasRef, where("uid", "==", user.uid));
            const querySnapshot = await getDocs(q);

            const container = document.getElementById('reservasList');
            container.innerHTML = "";

            if (querySnapshot.empty) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 2rem;">
                        <p style="color: var(--text-muted, #666); margin: 0;">No tienes ninguna reserva registrada.</p>
                    </div>
                `;
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();

                const cardHTML = `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                        <div>
                            <span style="font-size: 0.85rem; color: var(--text-muted, #666);">Fecha reservada: <strong>${data.fecha}</strong></span>
                            <h4 style="margin: 0.25rem 0 0.5rem 0; color: var(--text-main, #222);">${data.area}</h4>
                            <p style="margin: 0 0 0.25rem 0; color: var(--text-main, #444); font-size: 0.95rem;"><strong>Turno:</strong> ${data.turno}</p>
                            <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">Motivo: ${data.motivo}</p>
                        </div>
                        <span style="background-color: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">
                            ${data.estatus ? data.estatus.toUpperCase() : 'CONFIRMADA'}
                        </span>
                    </div>
                `;
                container.innerHTML += cardHTML;
            });

        } catch (error) {
            console.error("Error al cargar reservas:", error);
            document.getElementById('reservasList').innerHTML = `<p style="color: #991b1b;">Error al cargar el historial de reservas.</p>`;
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