// admin-documentos.js
import { renderAdminSidebar } from './admin-components.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// 1. Validar sesión y privilegios de Administrador
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists() || userDoc.data().rol !== 'admin') {
            alert("Acceso denegado. No eres administrador.");
            window.location.href = "dashboard.html";
            return;
        }

        // Renderizamos el menú lateral de administración (marcando 'documentos' o equivalente)
        renderAdminSidebar('documentos', auth);

        // Cargar la lista de documentos publicados
        await cargarDocumentosAdmin();

    } catch (error) {
        console.error("Error al verificar permisos de administrador:", error);
    }
});

// Función para obtener y listar los documentos en el panel de admin
async function cargarDocumentosAdmin() {
    const container = document.getElementById('adminDocumentosList');
    if (!container) return;

    container.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "documentos"));

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 1.5rem;">
                    <p style="color: var(--text-muted, #666); margin: 0;">No hay documentos publicados en el sistema.</p>
                </div>
            `;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;

            container.innerHTML += `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div>
                        <span style="font-size: 0.8rem; background-color: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 500;">
                            ${data.categoria || 'General'}
                        </span>
                        <h4 style="margin: 0.4rem 0 0.2rem 0; color: var(--text-main, #222);">${data.titulo}</h4>
                        <p style="margin: 0; color: var(--text-muted, #666); font-size: 0.9rem;">${data.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <a href="${data.urlArchivo}" target="_blank" class="btn" style="text-decoration: none; white-space: nowrap; font-size: 0.85rem; padding: 0.4rem 0.8rem; background-color: #0284c7; color: white;">
                            Ver Archivo
                        </a>
                        <button class="btn eliminar-doc-btn" data-id="${docId}" style="background-color: #ef4444; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error al cargar documentos:", error);
        container.innerHTML = `<p style="color: #991b1b;">Error al cargar la lista de documentos.</p>`;
    }
}

// 2. Manejar el formulario para publicar un nuevo documento
const formNuevoDocumento = document.getElementById('formNuevoDocumento');
if (formNuevoDocumento) {
    formNuevoDocumento.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titulo = document.getElementById('docTitulo').value.trim();
        const categoria = document.getElementById('docCategoria').value;
        const descripcion = document.getElementById('docDescripcion').value.trim();
        const urlArchivo = document.getElementById('docUrl').value.trim();

        const submitBtn = formNuevoDocumento.querySelector('button[type="submit"]');
        submitBtn.textContent = "Publicando...";
        submitBtn.disabled = true;

        try {
            await addDoc(collection(db, "documentos"), {
                titulo: titulo,
                categoria: categoria,
                descripcion: descripcion,
                urlArchivo: urlArchivo,
                fechaSubida: serverTimestamp()
            });

            alert("¡Documento publicado con éxito!");
            formNuevoDocumento.reset();
            submitBtn.textContent = "Publicar Documento";
            submitBtn.disabled = false;
            
            // Recargar la lista
            await cargarDocumentosAdmin();

        } catch (error) {
            console.error("Error al guardar el documento:", error);
            alert("Hubo un error al publicar el documento. Inténtalo de nuevo.");
            submitBtn.textContent = "Publicar Documento";
            submitBtn.disabled = false;
        }
    });
}

// 3. Delegación de eventos para eliminar documentos
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('eliminar-doc-btn')) {
        const docId = e.target.getAttribute('data-id');
        
        if (confirm("¿Estás segura de que deseas eliminar este documento del sistema?")) {
            try {
                await deleteDoc(doc(db, "documentos", docId));
                alert("Documento eliminado correctamente.");
                await cargarDocumentosAdmin();
            } catch (error) {
                console.error("Error al eliminar el documento:", error);
                alert("No se pudo eliminar el documento.");
            }
        }
    }
});