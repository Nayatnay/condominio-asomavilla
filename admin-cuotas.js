// admin-cuotas.js
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Variable global para almacenar las cuotas y filtrar localmente sin recargar
let todasLasCuotas = [];

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
            await cargarHistorialCuotas();
            inicializarFiltros();

        } catch (error) {
            console.error("Error de permisos o inicialización:", error);
            window.location.href = "dashboard.html";
        }
    }
});

// Función para poblar los selectores de destino y filtros
async function cargarCasasEnSelector() {
    const selectDestino = document.getElementById('cuotaDestino');
    const filtroCasa = document.getElementById('filtroCasa'); // Opcional si agregas el filtro visual en el HTML
    
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

        // Si creas un elemento select para filtrar en tu HTML con id="filtroInmueble"
        const selectFiltroInmueble = document.getElementById('filtroInmueble');
        if (selectFiltroInmueble) {
            selectFiltroInmueble.innerHTML = `<option value="todas">Todas las casas</option>`;
            casasList.forEach(casa => {
                selectFiltroInmueble.innerHTML += `<option value="${casa}">Inmueble: ${casa}</option>`;
            });
        }

    } catch (error) {
        console.error("Error al cargar las casas:", error);
    }
}

// Lógica del formulario para emitir nueva cuota (Con Lote / BatchID)
const formNuevaCuota = document.getElementById('formNuevaCuota');
if (formNuevaCuota) {
    formNuevaCuota.addEventListener('submit', async (e) => {
        e.preventDefault();

        const concepto = document.getElementById('cuotaConcepto').value.trim();
        const monto = parseFloat(document.getElementById('cuotaMonto').value);
        const mes = document.getElementById('cuotaMes').value; 
        const destino = document.getElementById('cuotaDestino').value;
        const batchId = "lote_" + Date.now(); // Identificador único para errores masivos

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
                            batchId: batchId, // Guardamos el lote
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
                    batchId: batchId,
                    fechaCreacion: new Date()
                });

                alert(`¡Cuota emitida con éxito para ${destino}!`);
            }

            formNuevaCuota.reset();
            document.getElementById('cuotaMes').value = "2026-08";
            await cargarHistorialCuotas();

        } catch (error) {
            console.error("Error al emitir la cuota:", error);
            alert("No se pudo emitir la cuota: " + error.message);
        }
    });
}

// Función para cargar el historial y guardarlo en memoria
async function cargarHistorialCuotas() {
    const container = document.getElementById('cuotasList');
    if (!container) return;

    container.innerHTML = `<p style="color: var(--text-muted, #666);">Cargando historial de cuotas...</p>`;

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

        // Renderizar inicialmente todas
        renderizarListaCuotas(todasLasCuotas);

    } catch (error) {
        console.error("Error al cargar historial de cuotas:", error);
        container.innerHTML = `<p style="color: #991b1b;">Error al cargar el historial.</p>`;
    }
}

// Función para pintar las tarjetas en pantalla
// Variable para llevar el registro de lo que se está viendo actualmente en pantalla
let cuotasFiltradasActuales = [];

function renderizarListaCuotas(arrayCuotas) {
    const container = document.getElementById('cuotasList');
    const btnEliminarFiltrados = document.getElementById('btnEliminarFiltrados');
    if (!container) return;

    cuotasFiltradasActuales = arrayCuotas; // Guardamos la vista actual
    container.innerHTML = "";

    // Mostrar u ocultar el botón de borrado masivo según si hay un filtro activo o resultados
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
        const cardHTML = `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; background: #fff; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 0.5rem;">
                <div>
                    <span style="font-size: 0.85rem; color: #0284c7; font-weight: 600;">Período: ${cuota.mes || 'N/A'} | Inmueble: ${cuota.casa}</span>
                    <h4 style="margin: 0.2rem 0; color: var(--text-main, #222);">${cuota.concepto}</h4>
                    <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">Monto asignado: <strong>$${Number(cuota.monto).toFixed(2)}</strong></p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="background-color: #e0f2fe; color: #0369a1; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600;">
                        ACTIVA
                    </span>
                    <button class="btn-eliminar-cuota" data-id="${cuota.id}" style="background-color: #fee2e2; color: #991b1b; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">Eliminar</button>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });

    // Eventos de eliminación individual
    document.querySelectorAll(".btn-eliminar-cuota").forEach(button => {
        button.addEventListener("click", async (e) => {
            const idCuota = e.target.getAttribute("data-id");
            await eliminarCuotaFirestore(idCuota);
        });
    });
}

// Evento para el botón de eliminar todos los filtrados
const btnEliminarFiltrados = document.getElementById('btnEliminarFiltrados');
if (btnEliminarFiltrados) {
    btnEliminarFiltrados.addEventListener('click', async () => {
        if (cuotasFiltradasActuales.length === 0) return;

        const confirmar = confirm(`¿Estás SEGURO de eliminar los ${cuotasFiltradasActuales.length} registros que coinciden con el filtro actual? Esta acción no se puede deshacer.`);
        
        if (confirmar) {
            try {
                // Borramos cada documento de la lista filtrada actual
                for (const cuota of cuotasFiltradasActuales) {
                    await deleteDoc(doc(db, "cuotas", cuota.id));
                }
                
                alert("Registros filtrados eliminados exitosamente.");
                
                // Limpiar el input de búsqueda y recargar
                document.getElementById('filtroTexto').value = "";
                await cargarHistorialCuotas();

            } catch (error) {
                console.error("Error al eliminar los registros filtrados:", error);
                alert("Ocurrió un error al intentar borrar los registros.");
            }
        }
    });
}

// Función para eliminar (individual o por lote completo si fue un error masivo)
// Función para eliminar una sola cuota y mantener el filtro activo si existía
async function eliminarCuotaFirestore(id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta cuota?")) {
        try {
            await deleteDoc(doc(db, "cuotas", id));
            
            // 1. Recargamos los datos desde Firestore sin perder la referencia global
            const cuotasRef = collection(db, "cuotas");
            const querySnapshot = await getDocs(cuotasRef);

            todasLasCuotas = [];
            querySnapshot.forEach(docSnap => {
                todasLasCuotas.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            // 2. Verificamos si hay un filtro de texto activo en ese momento
            const inputFiltroTexto = document.getElementById('filtroTexto');
            const textoFiltro = inputFiltroTexto ? inputFiltroTexto.value.trim().toLowerCase() : "";

            if (textoFiltro !== "") {
                // Si había filtro, lo re-aplicamos a la nueva lista de datos
                const filtradas = todasLasCuotas.filter(c => 
                    c.concepto.toLowerCase().includes(textoFiltro) || 
                    c.casa.toLowerCase().includes(textoFiltro) ||
                    (c.mes && c.mes.includes(textoFiltro))
                );
                renderizarListaCuotas(filtradas);
            } else {
                // Si no había filtro, mostramos todo normal
                renderizarListaCuotas(todasLasCuotas);
            }

            alert("Cuota eliminada correctamente.");

        } catch (error) {
            console.error("Error al eliminar la cuota:", error);
            alert("No se pudo eliminar la cuota.");
        }
    }
}

// Inicializar la barra de filtros en la interfaz si decides agregarla
function inicializarFiltros() {
    // Si agregas inputs de filtro en tu HTML, los puedes enlazar aquí.
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