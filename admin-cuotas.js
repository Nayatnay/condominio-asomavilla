// admin-cuotas.js
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let todasLasCuotas = [];
let cuotasFiltradasActuales = [];

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

            renderAdminSidebar('cuotas', auth);

            await cargarCasasEnSelector();
            inicializarConstructorGastos(); // Inicializar filas de gastos por defecto
            await cargarHistorialCuotas();
            inicializarFiltros();

        } catch (error) {
            console.error("Error de permisos o inicialización:", error);
            window.location.href = "dashboard.html";
        }
    }
});

// --- DINÁMICA DE GASTOS DESGLOSADOS ---
function inicializarConstructorGastos() {
    const container = document.getElementById('gastosContainer');
    const btnAdd = document.getElementById('btnAddGasto');
    if (!container || !btnAdd) return;

    // Agregar filas por defecto sugeridas
    const itemsSugeridos = [
        { desc: "Gastos de Vigilancia", monto: "" },
        { desc: "Reparaciones y Mantenimiento", monto: "" },
        { desc: "Fondo de Reserva", monto: "" }
    ];

    container.innerHTML = "";
    itemsSugeridos.forEach(item => agregarFilaGasto(item.desc, item.monto));

    btnAdd.onclick = () => agregarFilaGasto("", "");
    recalcularTotalGastos();
}

function agregarFilaGasto(descripcion, monto) {
    const container = document.getElementById('gastosContainer');
    const row = document.createElement('div');
    row.style.cssText = "display: flex; gap: 0.5rem; align-items: center;";
    
    row.innerHTML = `
        <input type="text" placeholder="Descripción del gasto (ej. Vigilancia)" value="${descripcion}" class="form-input gasto-desc" style="flex: 2;" required>
        <input type="number" step="0.01" placeholder="Monto ($)" value="${monto}" class="form-input gasto-monto" style="flex: 1;" required>
        <button type="button" class="btn-remove-gasto" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 4px; padding: 0.5rem 0.8rem; cursor: pointer; font-weight: bold;">✕</button>
    `;

    container.appendChild(row);

    // Eventos de cálculo y eliminación
    row.querySelector('.gasto-monto').oninput = recalcularTotalGastos;
    row.querySelector('.btn-remove-gasto').onclick = () => {
        if (container.children.length > 1) {
            row.remove();
            recalcularTotalGastos();
        } else {
            alert("Debes mantener al menos un ítem de gasto.");
        }
    };
}

function recalcularTotalGastos() {
    const montosInputs = document.querySelectorAll('.gasto-monto');
    let total = 0;
    montosInputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });

    document.getElementById('lblMontoTotal').textContent = `$${total.toFixed(2)}`;
    document.getElementById('cuotaMonto').value = total.toFixed(2);
}

// Recopilar el detalle de gastos antes de enviar
function obtenerDesgloseGastos() {
    const descInputs = document.querySelectorAll('.gasto-desc');
    const montoInputs = document.querySelectorAll('.gasto-monto');
    let desglose = [];

    for (let i = 0; i < descInputs.length; i++) {
        if (descInputs[i].value.trim() && montoInputs[i].value) {
            desglose.push({
                descripcion: descInputs[i].value.trim(),
                monto: parseFloat(montoInputs[i].value) || 0
            });
        }
    }
    return desglose;
}

// --- CARGA DE CASAS Y EMISIÓN ---
async function cargarCasasEnSelector() {
    const selectDestino = document.getElementById('cuotaDestino');
    try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        if (selectDestino) {
            selectDestino.innerHTML = `<option value="todas">Todas las casas (General)</option>`;
        }

        let casasList = [];
        usuariosSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.casa && data.rol !== 'inactivo') {
                casasList.push(data.casa);
            }
        });

        casasList = [...new Set(casasList)].sort();
        casasList.forEach(casa => {
            if (selectDestino) {
                selectDestino.innerHTML += `<option value="${casa}">Inmueble: ${casa}</option>`;
            }
        });
    } catch (error) {
        console.error("Error al cargar las casas:", error);
    }
}

const formNuevaCuota = document.getElementById('formNuevaCuota');
if (formNuevaCuota) {
    formNuevaCuota.addEventListener('submit', async (e) => {
        e.preventDefault();

        const concepto = document.getElementById('cuotaConcepto').value.trim();
        const montoTotal = parseFloat(document.getElementById('cuotaMonto').value);
        const mes = document.getElementById('cuotaMes').value; 
        const destino = document.getElementById('cuotaDestino').value;
        const desgloseGastos = obtenerDesgloseGastos();
        const batchId = "lote_" + Date.now();

        if (montoTotal <= 0 || desgloseGastos.length === 0) {
            alert("El monto total debe ser mayor a 0 y debes incluir al menos un gasto válido.");
            return;
        }

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
                            monto: montoTotal,
                            mes: mes,
                            desglose: desgloseGastos, // Guardamos el desglose detallado
                            batchId: batchId,
                            fechaCreacion: new Date()
                        });
                        count++;
                    }
                }
                alert(`¡Se han emitido ${count} cuotas desglosadas con éxito para el período ${mes}!`);

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
                    monto: montoTotal,
                    mes: mes,
                    desglose: desgloseGastos,
                    batchId: batchId,
                    fechaCreacion: new Date()
                });

                alert(`¡Cuota desglosada emitida con éxito para ${destino}!`);
            }

            formNuevaCuota.reset();
            document.getElementById('cuotaMes').value = "2026-08";
            inicializarConstructorGastos();
            await cargarHistorialCuotas();

        } catch (error) {
            console.error("Error al emitir la cuota:", error);
            alert("No se pudo emitir la cuota: " + error.message);
        }
    });
}

// --- HISTORIAL Y RENDERIZADO ---
async function cargarHistorialCuotas() {
    const container = document.getElementById('cuotasList');
    if (!container) return;

    container.innerHTML = `<p class="loading-text">Cargando historial de cuotas...</p>`;

    try {
        const cuotasRef = collection(db, "cuotas");
        const querySnapshot = await getDocs(cuotasRef);

        todasLasCuotas = [];
        querySnapshot.forEach(docSnap => {
            todasLasCuotas.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        renderizarListaCuotas(todasLasCuotas);

    } catch (error) {
        console.error("Error al cargar historial de cuotas:", error);
        container.innerHTML = `<p style="color: #991b1b;">Error al cargar el historial.</p>`;
    }
}

function renderizarListaCuotas(arrayCuotas) {
    const container = document.getElementById('cuotasList');
    const btnEliminarFiltrados = document.getElementById('btnEliminarFiltrados');
    if (!container) return;

    cuotasFiltradasActuales = arrayCuotas;
    container.innerHTML = "";

    const inputFiltroTexto = document.getElementById('filtroTexto');
    if (btnEliminarFiltrados && inputFiltroTexto) {
        if (inputFiltroTexto.value.trim() !== "" && arrayCuotas.length > 0) {
            btnEliminarFiltrados.style.display = "block";
            btnEliminarFiltrados.textContent = `Eliminar ${arrayCuotas.length} registros filtrados`;
        } else {
            btnEliminarFiltrados.style.display = "none";
        }
    }

    if (arrayCuotas.length === 0) {
        container.innerHTML = `<div class="card" style="padding: 1rem; color: var(--text-muted, #666); font-size: 0.9rem;">No hay cuotas que coincidan con los filtros seleccionados.</div>`;
        return;
    }

    arrayCuotas.forEach(cuota => {
        const tieneBatch = cuota.batchId ? true : false;
        
        // Construir HTML del desglose si existe
        let desgloseHTML = "";
        if (cuota.desglose && Array.isArray(cuota.desglose)) {
            desgloseHTML = `<ul style="margin: 0.5rem 0 0 1rem; padding: 0; font-size: 0.85rem; color: var(--text-muted, #555);">`;
            cuota.desglose.forEach(item => {
                desgloseHTML += `<li>${item.descripcion}: $${Number(item.monto).toFixed(2)}</li>`;
            });
            desgloseHTML += `</ul>`;
        }

        const cardHTML = `
            <div class="card" style="background: #fff; padding: 1.2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 0.8rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                    <div>
                        <span style="font-size: 0.85rem; color: #0284c7; font-weight: 600;">Período: ${cuota.mes || 'N/A'} | Inmueble: ${cuota.casa}</span>
                        <h4 style="margin: 0.2rem 0; color: var(--text-main, #222);">${cuota.concepto}</h4>
                        <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.95rem;">Monto Total: <strong>$${Number(cuota.monto).toFixed(2)}</strong></p>
                        ${desgloseHTML}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                        <span style="background-color: #e0f2fe; color: #0369a1; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600;">
                            ACTIVA
                        </span>
                        ${tieneBatch ? `<button class="btn-eliminar-lote" data-batch="${cuota.batchId}" style="background-color: #fef3c7; color: #92400e; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.85rem;" title="Borrar todo el lote masivo">🗑️ Borrar Lote</button>` : ''}
                        <button class="btn-eliminar-cuota" data-id="${cuota.id}" style="background-color: #fee2e2; color: #991b1b; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });

    document.querySelectorAll(".btn-eliminar-cuota").forEach(button => {
        button.addEventListener("click", async (e) => {
            const idCuota = e.target.getAttribute("data-id");
            await eliminarCuotaFirestore(idCuota);
        });
    });

    document.querySelectorAll(".btn-eliminar-lote").forEach(button => {
        button.addEventListener("click", async (e) => {
            const batchId = e.target.getAttribute("data-batch");
            await eliminarLoteFirestore(batchId);
        });
    });
}

async function eliminarLoteFirestore(batchId) {
    if (confirm("¿Estás SEGURO de eliminar TODO el lote de cuotas desglosadas asociado a esta emisión masiva?")) {
        try {
            const cuotasRef = collection(db, "cuotas");
            const querySnapshot = await getDocs(cuotasRef);
            
            let contadorBorrados = 0;
            for (const docSnap of querySnapshot.docs) {
                if (docSnap.data().batchId === batchId) {
                    await deleteDoc(doc(db, "cuotas", docSnap.id));
                    contadorBorrados++;
                }
            }

            alert(`¡Lote eliminado con éxito! Se borraron ${contadorBorrados} registros.`);
            await cargarHistorialCuotas();

        } catch (error) {
            console.error("Error al eliminar el lote:", error);
            alert("No se pudo completar la eliminación del lote.");
        }
    }
}

const btnEliminarFiltrados = document.getElementById('btnEliminarFiltrados');
if (btnEliminarFiltrados) {
    btnEliminarFiltrados.addEventListener('click', async () => {
        if (cuotasFiltradasActuales.length === 0) return;

        const confirmar = confirm(`¿Estás SEGURO de eliminar los ${cuotasFiltradasActuales.length} registros filtrados?`);
        if (confirmar) {
            try {
                for (const cuota of cuotasFiltradasActuales) {
                    await deleteDoc(doc(db, "cuotas", cuota.id));
                }
                alert("Registros eliminados con éxito.");
                document.getElementById('filtroTexto').value = "";
                await cargarHistorialCuotas();
            } catch (error) {
                console.error("Error al eliminar filtrados:", error);
                alert("Ocurrió un error al borrar los registros.");
            }
        }
    });
}

async function eliminarCuotaFirestore(id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta cuota?")) {
        try {
            await deleteDoc(doc(db, "cuotas", id));
            await cargarHistorialCuotas();
            alert("Cuota eliminada correctamente.");
        } catch (error) {
            console.error("Error al eliminar la cuota:", error);
            alert("No se pudo eliminar la cuota.");
        }
    }
}

function inicializarFiltros() {
    const inputFiltroTexto = document.getElementById('filtroTexto');
    if (inputFiltroTexto) {
        inputFiltroTexto.addEventListener('input', (e) => {
            const texto = e.target.value.toLowerCase();
            const filtradas = todasLasCuotas.filter(c => 
                c.concepto.toLowerCase().includes(texto) || 
                c.casa.toLowerCase().includes(texto) ||
                (c.mes && c.mes.includes(texto))
            );
            renderizarListaCuotas(filtradas);
        });
    }
}