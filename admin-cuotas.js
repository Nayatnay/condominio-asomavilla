// admin-cuotas.js
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
            // 1. Validar permisos de administrador
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || userDoc.data().rol !== 'admin') {
                alert("Acceso denegado. Sección exclusiva para administradores.");
                window.location.href = "dashboard.html";
                return;
            }

            // Renderizar el menú lateral de admin (marcando 'cuotas')
            renderAdminSidebar('cuotas', auth);

            // 2. Cargar casas en el selector de destino del formulario
            await cargarCasasEnSelector();

            // 3. Cargar el historial de cuotas emitidas
            await cargarHistorialCuotas();

        } catch (error) {
            console.error("Error de permisos o inicialización:", error);
            window.location.href = "dashboard.html";
        }
    }
});

// Función para poblar el select de destinatarios con las casas registradas
async function cargarCasasEnSelector() {
    const selectDestino = document.getElementById('cuotaDestino');
    if (!selectDestino) return;

    try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        
        selectDestino.innerHTML = `<option value="todas">Todas las casas (General)</option>`;

        let casasList = [];
        usuariosSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.casa && data.rol !== 'inactivo') {
                casasList.push(data.casa);
            }
        });

        casasList = [...new Set(casasList)].sort();

        casasList.forEach(casa => {
            selectDestino.innerHTML += `<option value="${casa}">Inmueble: ${casa}</option>`;
        });

    } catch (error) {
        console.error("Error al cargar las casas:", error);
    }
}

// Lógica del formulario para emitir nueva cuota
const formNuevaCuota = document.getElementById('formNuevaCuota');
if (formNuevaCuota) {
    formNuevaCuota.addEventListener('submit', async (e) => {
        e.preventDefault();

        const concepto = document.getElementById('cuotaConcepto').value.trim();
        const monto = parseFloat(document.getElementById('cuotaMonto').value);
        const mes = document.getElementById('cuotaMes').value; 
        const destino = document.getElementById('cuotaDestino').value;

        try {
            if (destino === 'todas') {
                const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
                let count = 0;

                for (const docSnap of usuariosSnapshot.docs) {
                    const data = docSnap.data();
                    if (data.casa && data.rol !== 'inactivo') {
                        await addDoc(collection(db, "cuotas"), {
                            casa: data.casa,
                            userId: docSnap.id,
                            concepto: concepto,
                            monto: monto,
                            mes: mes,
                            fechaCreacion: new Date()
                        });
                        count++;
                    }
                }
                alert(`¡Se han emitido ${count} cuotas generales con éxito para el período ${mes}!`);

            } else {
                const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
                let targetUserId = "";
                usuariosSnapshot.forEach(docSnap => {
                    if (docSnap.data().casa === destino) {
                        targetUserId = docSnap.id;
                    }
                });

                await addDoc(collection(db, "cuotas"), {
                    casa: destino,
                    userId: targetUserId,
                    concepto: concepto,
                    monto: monto,
                    mes: mes,
                    fechaCreacion: new Date()
                });

                alert(`¡Cuota emitida con éxito para ${destino}!`);
            }

            formNuevaCuota.reset();
            await cargarHistorialCuotas();

        } catch (error) {
            console.error("Error al emitir la cuota:", error);
            alert("No se pudo emitir la cuota: " + error.message);
        }
    });
}

// Función para listar las cuotas emitidas en la interfaz
async function cargarHistorialCuotas() {
    const container = document.getElementById('cuotasList');
    if (!container) return;

    container.innerHTML = `<p style="color: var(--text-muted, #666);">Cargando historial de cuotas...</p>`;

    try {
        const cuotasRef = collection(db, "cuotas");
        const querySnapshot = await getDocs(cuotasRef);

        container.innerHTML = "";

        if (querySnapshot.empty) {
            container.innerHTML = `<div class="card" style="padding: 1rem; color: var(--text-muted, #666); font-size: 0.9rem;">No hay cuotas emitidas registradas en el sistema.</div>`;
            return;
        }

        querySnapshot.forEach(docSnap => {
            const cuota = docSnap.data();
            
            const cardHTML = `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div>
                        <span style="font-size: 0.85rem; color: #0284c7; font-weight: 600;">Período: ${cuota.mes || 'N/A'} | Inmueble: ${cuota.casa}</span>
                        <h4 style="margin: 0.2rem 0; color: var(--text-main, #222);">${cuota.concepto}</h4>
                        <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">Monto asignado: <strong>$${Number(cuota.monto).toFixed(2)}</strong></p>
                    </div>
                    <div>
                        <span style="background-color: #e0f2fe; color: #0369a1; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600;">
                            ACTIVA
                        </span>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Error al cargar historial de cuotas:", error);
        container.innerHTML = `<p style="color: #991b1b;">Error al cargar el historial.</p>`;
    }
}