// admin-residentes.js - VERSIÓN CON REPORTE DE MOROSOS LIMPIO Y FORMAL
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

let listaResidentes = [];

// Cálculo financiero robusto con normalización de nombres de casa
async function calcularEstatusFinanciero(db, userId, casaInmueble) {
    try {
        if (!casaInmueble) return { estatus: 'pendiente', balance: 0 };
        
        // Normalizamos la casa del usuario (ej: quitar espacios extra)
        const casaLimpia = casaInmueble.toString().trim().toLowerCase();

        // 1. Traer todas las cuotas y filtrar en memoria para evitar errores de mayúsculas/espacios
        const cuotasSnapshot = await getDocs(collection(db, "cuotas"));
        let deudaTotal = 0;
        cuotasSnapshot.forEach(d => {
            const cuotaData = d.data();
            const casaCuota = cuotaData.casa ? cuotaData.casa.toString().trim().toLowerCase() : '';
            if (casaCuota === casaLimpia) {
                deudaTotal += Number(cuotaData.monto || 0);
            }
        });

        // 2. Sumar pagos aprobados (buscando por userId o uid)
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
        const esSolvente = balance <= 0;

        return {
            estatus: esSolvente ? 'solvente' : 'pendiente',
            balance: balance > 0 ? balance : 0
        };
    } catch (error) {
        console.error("Error al calcular estatus financiero:", error);
        return { estatus: 'pendiente', balance: 0 };
    }
}

// Renderizado de tarjetas en el panel
function renderizarLista(datos) {
    const container = document.getElementById('residentesList');
    if (!container) return;
    container.innerHTML = "";

    if (datos.length === 0) {
        container.innerHTML = `<div class="card" style="text-align: center; padding: 1.5rem;"><p style="color: var(--text-muted, #666); margin: 0;">No se encontraron residentes con este criterio.</p></div>`;
        return;
    }

    datos.forEach(data => {
        const esSolvente = data.financiero.estatus === 'solvente';
        const esInactivo = data.rol === 'inactivo';

        container.innerHTML += `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; opacity: ${esInactivo ? '0.7' : '1'};">
                <div>
                    <span style="font-size: 0.85rem; color: #0284c7; font-weight: 600;">Inmueble: ${data.casa || 'N/A'}</span>
                    <h4 style="margin: 0.2rem 0; color: var(--text-main, #222);">${data.nombre}</h4>
                    <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">Email: ${data.email || 'No registrado'}</p>
                </div>
                <div style="text-align: right;">
                    <span style="background-color: ${esSolvente ? '#d1fae5' : '#fee2e2'}; color: ${esSolvente ? '#065f46' : '#991b1b'}; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; display: inline-block;">
                        ${esSolvente ? 'SOLVENTE' : 'PENDIENTE'}
                    </span>
                    ${!esSolvente ? `<div style="font-size: 0.75rem; color: #991b1b; font-weight: 600; margin-top: 0.2rem;">Deuda: $${data.financiero.balance.toFixed(2)}</div>` : ''}
                    <button class="btn editar-btn" data-id="${data.id}" data-nombre="${data.nombre}" data-casa="${data.casa}" data-email="${data.email}" data-rol="${data.rol || 'residente'}" style="margin-left: 10px; background-color: #0284c7; font-size: 0.8rem; padding: 0.3rem 0.6rem;">Editar</button>
                </div>
            </div>
        `;
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (!userDoc.exists() || userDoc.data().rol !== 'admin') {
        alert("Acceso denegado.");
        window.location.href = "dashboard.html";
        return;
    }

    renderAdminSidebar('residentes', auth);

    const querySnapshot = await getDocs(collection(db, "usuarios"));
    listaResidentes = [];

    const promesas = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const userId = docSnap.id;
        const financiero = await calcularEstatusFinanciero(db, userId, data.casa);
        return { 
            id: userId, 
            ...data, 
            financiero 
        };
    });

    listaResidentes = await Promise.all(promesas);
    renderizarLista(listaResidentes);

    // Filtro
    const filtro = document.getElementById('filtroEstado');
    if (filtro) {
        filtro.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'morosos') {
                const filtrados = listaResidentes.filter(r => r.financiero.balance > 0 || r.financiero.estatus === 'pendiente');
                renderizarLista(filtrados);
            } else {
                renderizarLista(listaResidentes);
            }
        });
    }

    // REPORTE DE MOROSOS PROFESIONAL (Genera una ventana limpia de impresión)
    const btnPrintMorosos = document.getElementById('btnPrintMorosos');
    if (btnPrintMorosos) {
        btnPrintMorosos.addEventListener('click', () => {
            const morosos = listaResidentes.filter(r => r.financiero.balance > 0 || r.financiero.estatus === 'pendiente');

            if (morosos.length === 0) {
                alert("No hay morosos registrados actualmente.");
                return;
            }

            // Construir una ventana con HTML limpio y formal para impresión / PDF
            let ventanaReporte = window.open('', '_blank', 'width=800,height=600');
            
            let htmlContenido = `
                <html>
                <head>
                    <title>Reporte de Morosos - Condominio Asomavilla</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 2rem; color: #333; }
                        h2 { text-align: center; margin-bottom: 0.2rem; color: #111; }
                        p.sub { text-align: center; color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                        th, td { border: 1px solid #ccc; padding: 10px; text-align: left; font-size: 0.9rem; }
                        th { background-color: #f3f4f6; color: #111; }
                        .total { text-align: right; font-weight: bold; margin-top: 1.5rem; font-size: 1.1rem; }
                    </style>
                </head>
                <body>
                    <h2>CONDOMINIO ASOMAVILLA</h2>
                    <p class="sub">Listado Oficial de Cuentas Pendientes / Morosos</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Inmueble / Casa</th>
                                <th>Propietario / Residente</th>
                                <th>Correo Electrónico</th>
                                <th style="text-align: right;">Deuda Pendiente</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            let deudaTotalGeneral = 0;
            morosos.forEach(m => {
                deudaTotalGeneral += m.financiero.balance;
                htmlContenido += `
                    <tr>
                        <td><strong>${m.casa || 'N/A'}</strong></td>
                        <td>${m.nombre}</td>
                        <td>${m.email || 'No registrado'}</td>
                        <td style="text-align: right; color: #991b1b; font-weight: bold;">$${m.financiero.balance.toFixed(2)}</td>
                    </tr>
                `;
            });

            htmlContenido += `
                        </tbody>
                    </table>
                    <div class="total">
                        Deuda Total Acumulada: $${deudaTotalGeneral.toFixed(2)}
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
            `;

            ventanaReporte.document.write(htmlContenido);
            ventanaReporte.document.close();
        });
    }

    // Modal delegación de eventos
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('editar-btn')) {
            const b = e.target;
            document.getElementById('editUserId').value = b.getAttribute('data-id');
            document.getElementById('editNombre').value = b.getAttribute('data-nombre');
            document.getElementById('editCasa').value = b.getAttribute('data-casa');
            document.getElementById('editEmailDisplay').value = b.getAttribute('data-email');
            document.getElementById('editRol').value = b.getAttribute('data-rol');
            document.getElementById('editModal').style.display = 'flex';
        }
    });
});

// Formularios
document.getElementById('cerrarModalBtn')?.addEventListener('click', () => document.getElementById('editModal').style.display = 'none');
document.getElementById('formEditarResidente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await updateDoc(doc(db, "usuarios", document.getElementById('editUserId').value), {
            nombre: document.getElementById('editNombre').value,
            casa: document.getElementById('editCasa').value,
            rol: document.getElementById('editRol').value
        });
        alert("¡Datos actualizados!");
        location.reload();
    } catch(err) { alert("Error: " + err.message); }
});
document.getElementById('btnResetPassword')?.addEventListener('click', async () => {
    try { await sendPasswordResetEmail(auth, document.getElementById('editEmailDisplay').value); alert("Correo enviado"); } 
    catch(err) { alert("Error: " + err.message); }
});
// FORMULARIO DE NUEVO RESIDENTE (CORREGIDO: usando "nuevaCasa")
document.getElementById('formNuevoResidente')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        // Obtenemos los valores de forma segura
        const nombreVal = document.getElementById('nuevoNombre').value.trim();
        // CORRECCIÓN AQUÍ: cambiamos a "nuevaCasa" para coincidir con tu HTML
        const casaVal = document.getElementById('nuevaCasa').value.trim(); 
        const emailVal = document.getElementById('nuevoEmail').value.trim();
        const passwordVal = document.getElementById('nuevoPassword').value.trim();
        const rolVal = document.getElementById('nuevoRol').value;

        // Validamos que los elementos existan
        if (!nombreVal || !casaVal || !emailVal || !passwordVal) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        const cred = await createUserWithEmailAndPassword(secondaryAuth, emailVal, passwordVal);
        
        await setDoc(doc(db, "usuarios", cred.user.uid), {
            nombre: nombreVal,
            casa: casaVal,
            email: emailVal,
            rol: rolVal,
            fechaCreacion: new Date()
        });

        alert("¡Usuario creado con éxito!");
        location.reload();
    } catch(err) { 
        alert("Error al crear usuario: " + err.message); 
    }
});