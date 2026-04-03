require('dotenv').config();

const AUTH_CONFIG = {
    'Juez 1': {
        user: process.env.JUEZ1_USER || 'Slide',
        pass: process.env.JUEZ1_PASS || 'slide2026'
    },
    'Juez 2': {
        user: process.env.JUEZ2_USER || 'juez2',
        pass: process.env.JUEZ2_PASS || 'slide'
    },
    'Juez 3': {
        user: process.env.JUEZ3_USER || 'juez3',
        pass: process.env.JUEZ3_PASS || 'slide'
    }
};

console.log("Configuración cargada:");
console.log(AUTH_CONFIG);

function verifyLogin(username, password) {
    console.log(`\nProbando login para usuario: "${username}"`);
    
    // Simulación de la lógica en server.js
    const foundRole = Object.keys(AUTH_CONFIG).find(r => 
        AUTH_CONFIG[r].user.toLowerCase() === (username || "").toLowerCase()
    );

    let role = foundRole;
    
    if (!role || !AUTH_CONFIG[role]) {
        console.log("❌ Error: Rol no encontrado para este usuario");
        return;
    }

    const expectedUser = AUTH_CONFIG[role].user;
    const expectedPass = AUTH_CONFIG[role].pass;

    if (username.toLowerCase() !== expectedUser.toLowerCase() || password !== expectedPass) {
        console.log(`❌ Error: Credenciales incorrectas para ${role}`);
        console.log(`   Esperado: ${expectedUser} / ${expectedPass}`);
        console.log(`   Recibido: ${username} / ${password}`);
    } else {
        console.log(`✅ Éxito: Login correcto como ${role}`);
    }
}

// Pruebas (basadas en el .env detectado)
verifyLogin('Slide', 'slide2026'); // Juez 1 estándar
verifyLogin('slide', 'slide2026'); // Case insensitive check
verifyLogin('juez2', 'slide');      // Juez 2
verifyLogin('juez3', 'slide');      // Juez 3
verifyLogin('Admin', 'slide2026'); // Debería fallar si JUEZ1_USER=Slide
