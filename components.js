import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export function renderSidebar(currentPage, authInstance) {
    const db = getFirestore();

    // 1. Inyectar el botón hamburguesa y el overlay si no existen en el DOM
    if (!document.getElementById('hamburgerToggle')) {
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.id = 'hamburgerToggle';
        hamburgerBtn.className = 'hamburger-btn';
        hamburgerBtn.innerHTML = '☰';
        document.body.prepend(hamburgerBtn);

        const overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        document.body.prepend(overlay);
    }

    // Estructura base del menú sin la etiqueta de estatus
    const sidebarHTML = `
    <aside>
        <div>
            <div class="logo-area">
                <h2>Asomavilla</h2>
            </div>
            <ul class="nav-links" style="list-style: none; padding: 0;">
                <li><a href="dashboard.html" class="${currentPage === 'inicio' ? 'active' : ''}">Inicio</a></li>
                <li><a href="incidencias.html" class="${currentPage === 'incidencias' ? 'active' : ''}">Incidencias</a></li>
                <li><a href="reservas.html" class="${currentPage === 'reservas' ? 'active' : ''}">Reservas</a></li>
                <li><a href="documentos.html" class="${currentPage === 'documentos' ? 'active' : ''}">Documentos</a></li>
                <li><a href="estado-de-cuenta.html" class="${currentPage === 'estado' ? 'active' : ''}">Estado de Cuenta</a></li>
                <li><a href="finanzas-comunitarias.html" class="${currentPage === 'finanzas' ? 'active' : ''}">Finanzas Comunitarias</a></li>                
                <!-- Aquí se inyectará dinámicamente el botón de admin si corresponde -->
                <div id="adminButtonContainer"></div>

                <li><a href="#" id="logoutBtn" style="color: #f87171; margin-top: 1.5rem; cursor: pointer; display: block;">Cerrar Sesión</a></li>
            </ul>
        </div>
        <div class="user-profile">
            Residente,<br>
            <span id="residenteNameDisplay" style="font-weight: 600;">Cargando...</span>
        </div>
    </aside>
    `;

    // Inyectamos el menú inmediatamente
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // 2. Configurar la lógica del menú hamburguesa
    const sidebarElement = document.querySelector('body.dashboard-body > aside');
    const hamburgerBtn = document.getElementById('hamburgerToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebarElement && hamburgerBtn && overlay) {
        const toggleMenu = (e) => {
            e.stopPropagation();
            sidebarElement.classList.toggle('active');
            overlay.style.display = sidebarElement.classList.contains('active') ? 'block' : 'none';
        };

        hamburgerBtn.onclick = toggleMenu;
        overlay.onclick = toggleMenu;

        // Cerrar el menú automáticamente al hacer clic en cualquier opción del sidebar
        sidebarElement.querySelectorAll('a, button').forEach(item => {
            item.addEventListener('click', () => {
                sidebarElement.classList.remove('active');
                overlay.style.display = 'none';
            });
        });
    }

    // Configurar el botón de cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && authInstance) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(authInstance).then(() => {
                window.location.href = "index.html";
            }).catch((error) => console.error("Error al cerrar sesión", error));
        });
    }

    // Verificamos el usuario y cargamos sus datos de perfil (Casa, Nombre y Rol)
    if (authInstance) {
        onAuthStateChanged(authInstance, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "usuarios", user.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();

                        // 1. Actualizar Nombre con formato Casa (Nombre)
                        const nameDisplay = document.getElementById('residenteNameDisplay');
                        if (nameDisplay) {
                            const casa = userData.casa || '';
                            const nombre = userData.nombre || user.email;
                            nameDisplay.textContent = casa ? `${casa} (${nombre})` : nombre;
                        }

                        // 2. Si es admin, inyectar el botón de regreso al panel administrativo
                        if (userData.rol === 'admin') {
                            const adminContainer = document.getElementById('adminButtonContainer');
                            if (adminContainer) {
                                adminContainer.innerHTML = `
                                    <li><a href="admin-dashboard.html" style="color: #ef4444; font-weight: 600; margin-top: 1rem; border: 1px dashed #ef4444; border-radius: 6px; padding: 0.5rem; display: block; text-align: center;">⚙️ Volver a Admin</a></li>
                                `;
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error al cargar perfil de residente en sidebar:", error);
                }
            }
        });
    }
}