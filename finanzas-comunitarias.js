// finanzas-comunitarias.js
import { renderSidebar } from './components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

// Renderizamos el menú lateral del residente (puedes agregar un enlace nuevo llamado 'Finanzas' si gustas)
renderSidebar('finanzas', auth);

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) return;
            const userData = userDoc.data();

            const profileSpan = document.querySelector('.user-profile span');
            if (profileSpan) profileSpan.textContent = `${userData.casa} (${userData.nombre})`;

            const userBadge = document.getElementById('userBadge');
            if (userBadge) {
                userBadge.textContent = `Inmueble: ${userData.casa}`;
                userBadge.style.backgroundColor = '#e0f2fe';
                userBadge.style.color = '#0369a1';
            }

            await cargarDatosFinancierosComunitarios();

            const btnFiltrar = document.getElementById('btnFiltrarComunitario');
            if (btnFiltrar) {
                btnFiltrar.onclick = () => cargarDatosFinancierosComunitarios();
            }

        } catch (error) {
            console.error("Error al inicializar finanzas comunitarias:", error);
        }
    }
});

async function cargarDatosFinancierosComunitarios() {
    const mesFiltro = document.getElementById('filtroMesComunitario').value;
    const desgloseContainer = document.getElementById('desgloseComunitarioList');
    desgloseContainer.innerHTML = `<p class="loading-text">Calculando datos de la comunidad...</p>`;

    try {
        // 1. Obtener cuotas para calcular el total emitido y el desglose de gastos
        const cuotasSnapshot = await getDocs(collection(db, "cuotas"));
        let totalEmitido = 0;
        let desgloseAgrupado = {};

        cuotasSnapshot.forEach(docSnap => {
            const c = docSnap.data();
            if (!mesFiltro || c.mes === mesFiltro) {
                const montoCuota = Number(c.monto || 0);
                totalEmitido += montoCuota;

                if (c.desglose && Array.isArray(c.desglose)) {
                    c.desglose.forEach(item => {
                        const desc = item.descripcion || "Gastos Generales";
                        if (!desgloseAgrupado[desc]) desgloseAgrupado[desc] = 0;
                        desgloseAgrupado[desc] += Number(item.monto || 0);
                    });
                }
            }
        });

        // 2. Obtener pagos aprobados para el fondo común real
        const pagosSnapshot = await getDocs(collection(db, "pagos"));
        let totalIngresosReales = 0;

        pagosSnapshot.forEach(docSnap => {
            const p = docSnap.data();
            if ((p.estatus || '').toLowerCase() === 'aprobado') {
                // Si quieres filtrar los pagos por mes o mostrarlos de forma acumulada general
                totalIngresosReales += Number(p.monto || 0);
            }
        });

        const eficacia = totalEmitido > 0 ? ((totalIngresosReales / totalEmitido) * 100).toFixed(1) : 0;

        // Actualizar KPIs comunitarios
        document.getElementById('kpiIngresosComunidad').textContent = `$${totalIngresosReales.toFixed(2)}`;
        document.getElementById('kpiEficaciaComunidad').textContent = `${eficacia}%`;

        // Renderizar Desglose de Gastos
        desgloseContainer.innerHTML = "";
        const llavesDesglose = Object.keys(desgloseAgrupado);

        if (llavesDesglose.length === 0) {
            desgloseContainer.innerHTML = `<p style="color: var(--text-muted, #666); font-size: 0.9rem;">No hay registros de distribución de gastos para el período ${mesFiltro}.</p>`;
        } else {
            llavesDesglose.forEach(key => {
                const val = desgloseAgrupado[key];
                const porcentaje = totalEmitido > 0 ? ((val / totalEmitido) * 100).toFixed(1) : 0;
                desgloseContainer.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem;">
                        <span style="font-weight: 500; color: var(--text-main, #222);">🔹 ${key}</span>
                        <div>
                            <strong style="margin-right: 1rem; color: #0284c7;">$${val.toFixed(2)}</strong>
                            <span style="color: var(--text-muted, #666); font-size: 0.85rem;">(${porcentaje}% del total)</span>
                        </div>
                    </div>
                `;
            });
        }

    } catch (error) {
        console.error("Error al cargar finanzas comunitarias:", error);
        desgloseContainer.innerHTML = `<p style="color: #991b1b;">Error al cargar la información financiera.</p>`;
    }
}