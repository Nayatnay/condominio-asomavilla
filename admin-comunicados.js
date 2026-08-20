// admin-comunicados.js
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || userDoc.data().rol !== 'admin') {
                alert("Acceso denegado.");
                window.location.href = "dashboard.html";
                return;
            }

            renderAdminSidebar('comunicados', auth);

            // Función para cargar y mostrar los comunicados en el panel de admin
            async function cargarComunicadosAdmin() {
                const container = document.getElementById('adminComunicadosList');
                if (!container) return;

                const querySnapshot = await getDocs(collection(db, "comunicados"));
                container.innerHTML = "";

                if (querySnapshot.empty) {
                    container.innerHTML = `<p style="color: var(--text-muted, #666); font-size: 0.9rem;">No hay comunicados publicados actualmente.</p>";`;
                    return;
                }

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const comunicadoId = docSnap.id;

                    const cardHTML = `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                            <div>
                                <span style="font-size: 0.75rem; color: var(--text-muted, #888); display: block; margin-bottom: 0.2rem; font-weight: 500;">${data.fecha || ''}</span>
                                <h4 style="margin: 0 0 0.4rem 0; color: var(--text-main, #222);">${data.titulo}</h4>
                                <p style="margin: 0; color: var(--text-muted, #555); font-size: 0.9rem; line-height: 1.4;">${data.mensaje}</p>
                            </div>
                            <button class="btn eliminar-comm-btn" data-id="${comunicadoId}" style="background-color: #ef4444; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; white-space: nowrap;">Eliminar</button>
                        </div>
                    `;
                    container.innerHTML += cardHTML;
                });

                // Asignar evento de eliminación a cada botón
                document.querySelectorAll('.eliminar-comm-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const id = e.target.getAttribute('data-id');
                        if (confirm("¿Estás segura de que deseas eliminar este comunicado?")) {
                            try {
                                await deleteDoc(doc(db, "comunicados", id));
                                alert("Comunicado eliminado con éxito.");
                                cargarComunicadosAdmin(); // Recargar la lista
                            } catch (error) {
                                console.error("Error al eliminar:", error);
                                alert("No se pudo eliminar el comunicado.");
                            }
                        }
                    });
                });
            }

            // Llamar a la función al cargar la página
            cargarComunicadosAdmin();

            // Manejar el envío del formulario de nuevo comunicado
            const form = document.getElementById('formComunicado');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const titulo = document.getElementById('tituloComm').value;
                const mensaje = document.getElementById('mensajeComm').value;
                const fechaHoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

                try {
                    await addDoc(collection(db, "comunicados"), {
                        titulo,
                        mensaje,
                        fecha: fechaHoy,
                        timestamp: Date.now()
                    });

                    alert("¡Comunicado publicado con éxito!");
                    form.reset();
                    cargarComunicadosAdmin(); // Actualizar la lista en pantalla
                } catch (error) {
                    console.error("Error al publicar:", error);
                    alert("No se pudo publicar el comunicado.");
                }
            });

        } catch (error) {
            console.error("Error:", error);
            window.location.href = "dashboard.html";
        }
    }
});