// admin-components.js
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export function renderAdminSidebar(currentPage, authInstance) {
    const adminSidebarHTML = `
    <aside>
        <div>
            <div class="logo-area">
                <h2>Asomavilla <span style="font-size: 0.75rem; background: #fee2e2; color: #991b1b; padding: 0.2rem 0.5rem; border-radius: 4px;">Admin</span></h2>
            </div>
            <ul class="nav-links">
                <li><a href="admin-dashboard.html" class="${currentPage === 'dashboard' ? 'active' : ''}">Resumen Admin</a></li>
                <li><a href="admin-residentes.html" class="${currentPage === 'residentes' ? 'active' : ''}">Control de Residentes</a></li>
                <li><a href="admin-pagos.html" class="${currentPage === 'pagos' ? 'active' : ''}">Validar Pagos</a></li>
                <li><a href="admin-comunicados.html" class="${currentPage === 'comunicados' ? 'active' : ''}">Comunicados</a></li>
                <li><a href="admin-cuotas.html" class="${currentPage === 'cuotas' ? 'active' : ''}">Gestionar Cuotas</a></li>
                <li><a href="admin-documentos.html" class="${currentPage === 'documentos' ? 'active' : ''}">Gestión de Documentos</a><li>
                <li><a href="dashboard.html" style="color: #0284c7; margin-top: 1.5rem;">← Vista Residente</a></li>
                <li><a href="#" id="logoutBtn" style="color: #f87171; margin-top: 1rem; cursor: pointer;">Cerrar Sesión</a></li>
            </ul>
        </div>
        <div class="user-profile">
            Administración,<br>
            <span>Control Total</span>
        </div>
    </aside>
    `;

    document.body.insertAdjacentHTML('afterbegin', adminSidebarHTML);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && authInstance) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(authInstance).then(() => {
                window.location.href = "index.html";
            }).catch((error) => console.error("Error al cerrar sesión", error));
        });
    }
}