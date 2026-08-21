// admin-finanzas.js
import { renderAdminSidebar } from './admin-components.js';
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

let datosFinancierosGlobales = {};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || userDoc.data().rol !== 'admin') {
                alert("Acceso denegado. Sección exclusiva para administradores.");
                window.location.href = "dashboard.html";
                return;
            }

            renderAdminSidebar('finanzas', auth);
            await calcularYRenderizarFinanzas();

            const btnFiltrar = document.getElementById('btnFiltrarMes');
            if (btnFiltrar) {
                btnFiltrar.onclick = () => calcularYRenderizarFinanzas();
            }

            const btnPDF = document.getElementById('btnDescargarReportePDF');
            if (btnPDF) {
                btnPDF.onclick = () => generarReporteFinancieroPDF(datosFinancierosGlobales);
            }

        } catch (error) {
            console.error("Error al inicializar finanzas:", error);
        }
    }
});

async function calcularYRenderizarFinanzas() {
    const mesFiltro = document.getElementById('filtroMesFinanzas').value;
    
    try {
        const cuotasSnapshot = await getDocs(collection(db, "cuotas"));
        let totalEmitidoPeriodo = 0;
        let desgloseAgrupado = {};
        let cuotasPorCasa = {};

        cuotasSnapshot.forEach(docSnap => {
            const c = docSnap.data();
            if (!mesFiltro || c.mes === mesFiltro) {
                const montoCuota = Number(c.monto || 0);
                totalEmitidoPeriodo += montoCuota;

                if (!cuotasPorCasa[c.casa]) cuotasPorCasa[c.casa] = 0;
                cuotasPorCasa[c.casa] += montoCuota;

                if (c.desglose && Array.isArray(c.desglose)) {
                    c.desglose.forEach(item => {
                        const desc = item.descripcion || "Otros Gastos";
                        if (!desgloseAgrupado[desc]) desgloseAgrupado[desc] = 0;
                        desgloseAgrupado[desc] += Number(item.monto || 0);
                    });
                }
            }
        });

        const pagosSnapshot = await getDocs(collection(db, "pagos"));
        let totalIngresosReales = 0;
        let pagosPorCasa = {};

        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const uidACasa = {};
        usuariosSnapshot.forEach(uDoc => {
            const uData = uDoc.data();
            if (uData.casa) uidACasa[uDoc.id] = uData.casa;
        });

        pagosSnapshot.forEach(docSnap => {
            const p = docSnap.data();
            if ((p.estatus || '').toLowerCase() === 'aprobado') {
                const montoPago = Number(p.monto || 0);
                totalIngresosReales += montoPago;

                let casaPago = p.casa;
                if (!casaPago && p.uid && uidACasa[p.uid]) casaPago = uidACasa[p.uid];
                if (!casaPago) casaPago = 'Desconocida';

                if (!pagosPorCasa[casaPago]) pagosPorCasa[casaPago] = 0;
                pagosPorCasa[casaPago] += montoPago;
            }
        });

        const morosidadAcumulada = Math.max(0, totalEmitidoPeriodo - totalIngresosReales);
        const eficaciaCobranza = totalEmitidoPeriodo > 0 ? ((totalIngresosReales / totalEmitidoPeriodo) * 100).toFixed(1) : 0;

        datosFinancierosGlobales = {
            mes: mesFiltro,
            emitido: totalEmitidoPeriodo,
            ingresos: totalIngresosReales,
            morosidad: morosidadAcumulada,
            eficacia: eficaciaCobranza,
            desglose: desgloseAgrupado,
            cuotasPorCasa,
            pagosPorCasa
        };

        document.getElementById('kpiEmitido').textContent = `$${totalEmitidoPeriodo.toFixed(2)}`;
        document.getElementById('kpiIngresos').textContent = `$${totalIngresosReales.toFixed(2)}`;
        document.getElementById('kpiMorosidad').textContent = `$${morosidadAcumulada.toFixed(2)}`;
        document.getElementById('kpiEficacia').textContent = `${eficaciaCobranza}%`;

        const desgloseContainer = document.getElementById('desgloseGastosList');
        desgloseContainer.innerHTML = "";
        
        const llavesDesglose = Object.keys(desgloseAgrupado);
        if (llavesDesglose.length === 0) {
            desgloseContainer.innerHTML = `<p style="color: var(--text-muted, #666); font-size: 0.9rem;">No hay desglose registrado para el período ${mesFiltro}.</p>`;
        } else {
            llavesDesglose.forEach(key => {
                const val = desgloseAgrupado[key];
                const porcentaje = totalEmitidoPeriodo > 0 ? ((val / totalEmitidoPeriodo) * 100).toFixed(1) : 0;
                desgloseContainer.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.4rem;">
                        <span>🔹 ${key}</span>
                        <div>
                            <strong style="margin-right: 1rem;">$${val.toFixed(2)}</strong>
                            <span style="color: var(--text-muted, #666); font-size: 0.85rem;">(${porcentaje}%)</span>
                        </div>
                    </div>
                `;
            });
        }

        const inmueblesContainer = document.getElementById('balanceInmueblesList');
        inmueblesContainer.innerHTML = "";

        const todasLasCasas = [...new Set([...Object.keys(cuotasPorCasa), ...Object.keys(pagosPorCasa)])].sort();

        if (todasLasCasas.length === 0) {
            inmueblesContainer.innerHTML = `<div class="card" style="padding: 1rem; color: var(--text-muted, #666);">No hay registros financieros para este período.</div>`;
            return;
        }

        todasLasCasas.forEach(casa => {
            const deudaCasa = cuotasPorCasa[casa] || 0;
            const pagoCasa = pagosPorCasa[casa] || 0;
            const saldoCasa = deudaCasa - pagoCasa;
            const solvente = saldoCasa <= 0;

            inmueblesContainer.innerHTML += `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 1rem;">
                    <div>
                        <h4 style="margin: 0 0 0.2rem 0; color: var(--text-main, #222);">Inmueble: ${casa}</h4>
                        <span style="font-size: 0.85rem; color: var(--text-muted, #666);">Cargos: $${deudaCasa.toFixed(2)} | Abonado: $${pagoCasa.toFixed(2)}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 1rem; font-weight: 700; color: ${solvente ? '#059669' : '#991b1b'}; margin-bottom: 0.2rem;">
                            Saldo: $${solvente ? '0.00' : saldoCasa.toFixed(2)}
                        </span>
                        <span style="background-color: ${solvente ? '#d1fae5' : '#fee2e2'}; color: ${solvente ? '#065f46' : '#991b1b'}; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                            ${solvente ? 'SOLVENTE' : 'PENDIENTE'}
                        </span>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error al calcular finanzas:", error);
    }
}

function generarReporteFinancieroPDF(data) {
    if (!window.jspdf || !window.jspdf.jsPDF) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONDOMINIO ASOMAVILLA", 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Informe Financiero - ${data.mes}`, 105, 27, { align: 'center' });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total Emitido: $${data.emitido.toFixed(2)}`, 20, 47);
    doc.text(`Ingresos: $${data.ingresos.toFixed(2)}`, 120, 47);
    doc.text(`Morosidad: $${data.morosidad.toFixed(2)}`, 20, 54);
    doc.text(`Eficacia: ${data.eficacia}%`, 120, 54);

    const desgloseRows = Object.keys(data.desglose).map(k => [k, `$${data.desglose[k].toFixed(2)}`]);

    doc.autoTable({
        startY: 65,
        head: [['Concepto', 'Monto']],
        body: desgloseRows.length > 0 ? desgloseRows : [['Sin desglose', '$0.00']],
        theme: 'striped'
    });

    doc.save(`Informe_Financiero_${data.mes}.pdf`);
}