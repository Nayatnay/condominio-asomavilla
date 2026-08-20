// estado-de-cuenta.js
import { renderSidebar } from './components.js';
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

// Renderizamos el menú lateral marcando 'estado' como activo
renderSidebar('estado', auth);

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            // 1. Obtener datos del usuario (Nombre e Inmueble/Casa)
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) return;
            const userData = userDoc.data();
            const casaInmueble = userData.casa;
            const nombreResidente = userData.nombre;

            const profileSpan = document.querySelector('.user-profile span');
            if (profileSpan) profileSpan.textContent = `${casaInmueble} (${nombreResidente})`;

            // 2. Calcular Deuda Total (Cuotas de este inmueble)
            const cuotasRef = collection(db, "cuotas");
            const qCuotas = query(cuotasRef, where("casa", "==", casaInmueble));
            const cuotasSnapshot = await getDocs(qCuotas);

            let deudaTotal = 0;
            let listaMovimientos = [];

            cuotasSnapshot.forEach(docSnap => {
                const cuota = docSnap.data();
                deudaTotal += Number(cuota.monto || 0);
                
                // Agregamos la cuota al array de movimientos
                listaMovimientos.push({
                    tipo: 'Cargo (Deuda)',
                    fecha: cuota.mes ? `Período: ${cuota.mes}` : 'Cargo de Cuota',
                    titulo: cuota.concepto,
                    detalle: cuota.concepto || `Cargo por mantenimiento`,
                    monto: Number(cuota.monto || 0),
                    esDeuda: true
                });
            });

            // 3. Calcular Pagos Totales (Aprobados y en revisión del usuario)
            const pagosRef = collection(db, "pagos");
            const qPagos = query(pagosRef, where("uid", "==", user.uid));
            const pagosSnapshot = await getDocs(qPagos);

            let pagosAprobadosTotales = 0;

            pagosSnapshot.forEach(docSnap => {
                const pago = docSnap.data();
                const estatusPago = (pago.estatus || 'pendiente').toLowerCase();

                if (estatusPago === 'aprobado') {
                    pagosAprobadosTotales += Number(pago.monto || 0);
                }

                // Agregamos el pago al array de movimientos
                listaMovimientos.push({
                    tipo: `Pago (${estatusPago})`,
                    fecha: pago.fechaPago || 'Fecha no registrada',
                    titulo: `Banco: ${pago.banco} (Ref: ${pago.referencia})`,
                    detalle: pago.observacion || 'Pago reportado',
                    monto: Number(pago.monto || 0),
                    estatus: estatusPago,
                    esDeuda: false
                });
            });

            // 4. Calcular el Balance Real / Saldo Pendiente
            const saldoPendiente = deudaTotal - pagosAprobadosTotales;
            const esSolvente = saldoPendiente <= 0;

            // Actualizar la insignia de estado superior
            const userBadge = document.getElementById('userBadge');
            if (userBadge) {
                userBadge.textContent = esSolvente ? 'Estado: Solvente' : 'Estado: Pendiente';
                userBadge.style.backgroundColor = esSolvente ? '#d1fae5' : '#fee2e2';
                userBadge.style.color = esSolvente ? '#065f46' : '#991b1b';
            }

            // Actualizar la tarjeta de saldo total
            const saldoEl = document.getElementById('saldoTotal');
            if (saldoEl) {
                saldoEl.textContent = esSolvente ? '$0.00' : `$${saldoPendiente.toFixed(2)}`;
                saldoEl.style.color = esSolvente ? '#059669' : '#991b1b';
            }

            // 5. Configurar el botón de Descarga PDF
            const btnPDF = document.getElementById('btnDescargarPDF');
            if (btnPDF) {
                // Removemos listeners anteriores clonando el nodo para evitar duplicidad
                const nuevoBtnPDF = btnPDF.cloneNode(true);
                btnPDF.parentNode.replaceChild(nuevoBtnPDF, btnPDF);

                nuevoBtnPDF.addEventListener('click', () => {
                    generarPDFEstadoCuenta(nombreResidente, casaInmueble, listaMovimientos, saldoPendiente);
                });
            }

            // 6. Renderizar los movimientos en pantalla
            const container = document.getElementById('movimientosList');
            container.innerHTML = "";

            if (listaMovimientos.length === 0) {
                container.innerHTML = `
                    <div class="card" style="text-align: center; padding: 2rem;">
                        <p style="color: var(--text-muted, #666); margin: 0;">No hay movimientos financieros registrados en tu cuenta.</p>
                    </div>
                `;
                return;
            }

            listaMovimientos.forEach(item => {
                if (item.esDeuda) {
                    container.innerHTML += `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; border-left: 4px solid #ef4444;">
                            <div>
                                <span style="font-size: 0.85rem; color: #ef4444; font-weight: 600;">${item.fecha}</span>
                                <h4 style="margin: 0.25rem 0; color: var(--text-main, #222);">${item.titulo}</h4>
                                <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">${item.detalle}</p>
                            </div>
                            <div style="text-align: right;">
                                <span style="display: block; font-size: 1.1rem; font-weight: 700; color: #991b1b; margin-bottom: 0.25rem;">
                                    +$${item.monto.toFixed(2)}
                                </span>
                                <span style="background-color: #fee2e2; color: #991b1b; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                                    CARGO / DEUDA
                                </span>
                            </div>
                        </div>
                    `;
                } else {
                    const estatusUpper = item.estatus.toUpperCase();
                    const badgeBg = item.estatus === 'aprobado' ? '#d1fae5' : (item.estatus === 'rechazado' ? '#fee2e2' : '#fef3c7');
                    const badgeColor = item.estatus === 'aprobado' ? '#065f46' : (item.estatus === 'rechazado' ? '#991b1b' : '#92400e');

                    container.innerHTML += `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; border-left: 4px solid #10b981;">
                            <div>
                                <span style="font-size: 0.85rem; color: #10b981; font-weight: 600;">Fecha de Pago: ${item.fecha}</span>
                                <h4 style="margin: 0.25rem 0; color: var(--text-main, #222);">${item.titulo}</h4>
                                <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">${item.detalle}</p>
                            </div>
                            <div style="text-align: right;">
                                <span style="display: block; font-size: 1.1rem; font-weight: 700; color: #065f46; margin-bottom: 0.25rem;">
                                    -$${item.monto.toFixed(2)}
                                </span>
                                <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                                    ${estatusUpper}
                                </span>
                            </div>
                        </div>
                    `;
                }
            });

        } catch (error) {
            console.error("Error al cargar el estado de cuenta:", error);
            document.getElementById('movimientosList').innerHTML = `<p style="color: #991b1b;">Error al cargar los movimientos financieros.</p>`;
        }
    }
});

// Función independiente para armar y descargar el PDF formal
async function generarPDFEstadoCuenta(nombreResidente, casa, movimientos, saldoActual) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("Error: La librería de PDF no se ha cargado correctamente.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado del documento
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONDOMINIO ASOMAVILLA", 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Estado de Cuenta Financiero del Residente", 105, 27, { align: 'center' });

    // Datos del residente
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Propietario / Residente: ${nombreResidente}`, 20, 40);
    doc.text(`Inmueble / Casa: ${casa}`, 20, 47);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 140, 40);

    // Preparar filas para la tabla autoTable
    const tablaData = movimientos.map(m => [
        m.fecha,
        m.titulo,
        m.tipo,
        `$${m.monto.toFixed(2)}`
    ]);

    // Generar tabla limpia con autotable
    doc.autoTable({
        startY: 55,
        head: [['Fecha / Período', 'Descripción / Detalle', 'Tipo de Movimiento', 'Monto']],
        body: tablaData,
        theme: 'striped',
        headStyles: { fillColor: [2, 132, 199] }, // Azul corporativo
        styles: { fontSize: 9, cellPadding: 5 }
    });

    // Saldo final al pie de la tabla
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    
    if (saldoActual <= 0) {
        doc.setTextColor(5, 150, 105); // Verde si está solvente
        doc.text(`Saldo Pendiente Total: $0.00 (SOLVENTE)`, 190, finalY, { align: 'right' });
    } else {
        doc.setTextColor(153, 27, 27); // Rojo si tiene deuda
        doc.text(`Saldo Pendiente Total: $${saldoActual.toFixed(2)} (PENDIENTE)`, 190, finalY, { align: 'right' });
    }

    // Descargar archivo PDF automático
    doc.save(`Estado_de_Cuenta_${casa.replace(/\s+/g, '_')}.pdf`);
}