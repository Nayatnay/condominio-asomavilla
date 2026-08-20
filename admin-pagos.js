// admin-pagos.js
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
            // 1. Validar si el usuario actual es Administrador
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || userDoc.data().rol !== 'admin') {
                alert("Acceso denegado. Esta sección es exclusiva para administradores.");
                window.location.href = "dashboard.html";
                return;
            }

            // Renderizar el menú lateral de administrador
            renderAdminSidebar('pagos', auth);

            // 2. Cargar todos los pagos reportados
            const pagosRef = collection(db, "pagos");
            const querySnapshot = await getDocs(pagosRef);

            const container = document.getElementById('adminPagosList');
            container.innerHTML = "";

            if (querySnapshot.empty) {
                container.innerHTML = `<p style="color: var(--text-muted, #666);">No hay pagos registrados en el sistema.</p>`;
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const pagoId = docSnap.id;
                const estatus = data.estatus || 'en revision';

                // Definir los botones de acción dependiendo del estatus actual
                let botonesAccion = '';
                if (estatus === 'en revision') {
                    botonesAccion = `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                            <button class="btn aprobar-btn" data-pago-id="${pagoId}" data-user-id="${data.uid}" style="background-color: #10b981; font-size: 0.75rem; padding: 0.3rem 0.6rem;">Aprobar</button>
                            <button class="btn rechazar-btn" data-pago-id="${pagoId}" data-user-id="${data.uid}" style="background-color: #ef4444; font-size: 0.75rem; padding: 0.3rem 0.6rem;">Rechazar</button>
                        </div>
                    `;
                } else if (estatus === 'rechazado') {
                    botonesAccion = `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                            <button class="btn aprobar-btn" data-pago-id="${pagoId}" data-user-id="${data.uid}" style="background-color: #10b981; font-size: 0.75rem; padding: 0.3rem 0.6rem;">Reversar y Aprobar</button>
                        </div>
                    `;
                } else if (estatus === 'aprobado') {
                    // Opcional: Si ya está aprobado pero el admin quiere castigar/reversar a rechazado por error
                    botonesAccion = `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                            <button class="btn rechazar-btn" data-pago-id="${pagoId}" data-user-id="${data.uid}" style="background-color: #ef4444; font-size: 0.75rem; padding: 0.3rem 0.6rem;">Cambiar a Rechazado</button>
                        </div>
                    `;
                }

                const cardHTML = `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                        <div>
                            <span style="font-size: 0.85rem; color: #0284c7; font-weight: 600;">Inmueble: ${data.inmueble || 'N/A'} - Propietario: ${data.nombreResidente || 'Desconocido'}</span>
                            <h4 style="margin: 0.2rem 0; color: var(--text-main, #222);">Banco: ${data.banco} | Ref: ${data.referencia}</h4>
                            <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">Fecha: ${data.fechaPago} | Nota: ${data.observacion || 'Ninguna'}</p>
                        </div>
                        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                            <span style="font-size: 1.2rem; font-weight: 700; color: var(--text-main, #222);">$${data.monto}</span>
                            <span style="background-color: ${estatus === 'aprobado' ? '#d1fae5' : estatus === 'rechazado' ? '#fee2e2' : '#fef3c7'}; color: ${estatus === 'aprobado' ? '#065f46' : estatus === 'rechazado' ? '#991b1b' : '#92400e'}; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                                ${estatus.toUpperCase()}
                            </span>
                            ${botonesAccion}
                        </div>
                    </div>
                `;
                container.innerHTML += cardHTML;
            });

            // 3. Lógica para los botones de Aprobar / Reversar a Aprobado
            document.querySelectorAll('.aprobar-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const pagoId = e.target.getAttribute('data-pago-id');
                    const targetUserId = e.target.getAttribute('data-user-id');

                    try {
                        // Cambiar pago a aprobado
                        const pagoRef = doc(db, "pagos", pagoId);
                        await updateDoc(pagoRef, { estatus: 'aprobado' });

                        // RIGUROSO: Solo si el pago se aprueba, el usuario pasa a ser 'solvente'
                        if (targetUserId) {
                            const userRef = doc(db, "usuarios", targetUserId);
                            await updateDoc(userRef, { estatusPago: 'solvente' });
                        }

                        alert("¡Pago aprobado! El residente figura como solvente.");
                        location.reload();
                    } catch (error) {
                        console.error("Error al aprobar el pago:", error);
                        alert("No se pudo aprobar el pago.");
                    }
                });
            });

            // 4. Lógica para los botones de Rechazar (¡Aquí está la corrección clave!)
            document.querySelectorAll('.rechazar-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const pagoId = e.target.getAttribute('data-pago-id');
                    const targetUserId = e.target.getAttribute('data-user-id');

                    try {
                        // Cambiar pago a rechazado
                        const pagoRef = doc(db, "pagos", pagoId);
                        await updateDoc(pagoRef, { estatus: 'rechazado' });

                        // RIGUROSO: Si se rechaza el pago, el usuario NUNCA puede ser solvente. Pasa a 'pendiente'.
                        if (targetUserId) {
                            const userRef = doc(db, "usuarios", targetUserId);
                            await updateDoc(userRef, { estatusPago: 'pendiente' });
                        }

                        alert("El pago ha sido rechazado y el estatus del residente se ha actualizado a pendiente.");
                        location.reload();
                    } catch (error) {
                        console.error("Error al rechazar el pago:", error);
                        alert("No se pudo rechazar el pago.");
                    }
                });
            });

        } catch (error) {
            console.error("Error de permisos en admin:", error);
            window.location.href = "dashboard.html";
        }
    }
});