// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app); // Inicializamos Firestore

// Proteger la ruta y cargar los datos del usuario
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Si no hay sesión, al login
        window.location.href = "index.html";
    } else {
        // El usuario está autenticado, buscamos sus datos en Firestore
        try {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Ejemplo: Mostrar la información dinámicamente en el HTML del Dashboard
                // Asegúrate de tener elementos con estos ID en tu dashboard.html
                const profileSpan = document.querySelector('.user-profile span');
                if (profileSpan) {
                    profileSpan.textContent = `${userData.casa} (${userData.nombre})`;
                }

                // 2. NUEVO: Actualiza la insignia superior con los datos de Firebase
                const userBadge = document.getElementById('userBadge');
                if (userBadge) {
                    const estatus = userData.estatusPago || 'pendiente'; // Valor por defecto si no existe

                    if (estatus === 'solvente') {
                        userBadge.textContent = 'Estado: Solvente';
                        userBadge.style.backgroundColor = '#d1fae5'; // Verde claro minimalista
                        userBadge.style.color = '#065f46';          // Texto verde oscuro
                    } else {
                        userBadge.textContent = 'Estado: Pendiente';
                        userBadge.style.backgroundColor = '#fee2e2'; // Rojo claro / Alerta
                        userBadge.style.color = '#991b1b';          // Texto rojo oscuro
                    }
                }

                // Si quisieras validar el rol para restringir acciones:
                if (userData.rol === 'administrador') {
                    console.log("Usuario con privilegios de administrador");
                }

            } else {
                console.log("No se encontraron datos adicionales para este usuario.");
            }
        } catch (error) {
            console.error("Error al obtener los datos del usuario:", error);
        }
    }
});

// Lógica de cerrar sesión (la que ya tenías)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Error al cerrar sesión", error);
        });
    });
}