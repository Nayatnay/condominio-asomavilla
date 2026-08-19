// components.js
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export function renderSidebar(currentPage, authInstance) {
    const sidebarHTML = `
    <aside>
        <div>
            <div class="logo-area">
                <h2>Asomavilla</h2>
            </div>
            <ul class="nav-links">
                <li><a href="dashboard.html" class="${currentPage === 'dashboard' ? 'active' : ''}">Inicio</a></li>
                <li><a href="#" class="${currentPage === 'estado' ? 'active' : ''}">Estado de Cuenta</a></li>
                <li><a href="reservas.html" class="${currentPage === 'reservas' ? 'active' : ''}">Reservas</a></li>
                <li><a href="incidencias.html" class="${currentPage === 'incidencias' ? 'active' : ''}">Incidencias</a></li>
                <li><a href="documentos.html" class="${currentPage === 'documentos' ? 'active' : ''}">Documentos</a></li>
                <li><a href="#" id="logoutBtn" style="color: #f87171; margin-top: 2rem; cursor: pointer;">Cerrar Sesión</a></li>
            </ul>
        </div>
        <div class="user-profile">
            Bienvenido,<br>
            <span>Cargando...</span>
        </div>
    </aside>
    `;
    
    // Insertamos el menú al inicio del body
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // Configuramos el cierre de sesión automáticamente aquí mismo
    if (authInstance) {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(authInstance).then(() => {
                    window.location.href = "index.html";
                }).catch((error) => {
                    console.error("Error al cerrar sesión", error);
                });
            });
        }
    }
}