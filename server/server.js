require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const pdf = require('html-pdf-node');
const SliderDB = require('./db');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? (process.env.CORS_ORIGIN || true) : true,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const db = new SliderDB();

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

// CSP se maneja a nivel de infraestructura (Render/Cloudflare), no en Express
// para evitar bloquear conexiones Socket.io (WebSocket/polling)



app.use(express.static(path.join(__dirname, '..')));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'production') {
    app.get('/api/db', async (req, res) => {
        res.json(await db.getFullDB());
    });
}

let connectedRoles = {
    'Juez 1': null,
    'Juez 2': null,
    'Juez 3': null
};

const broadcastUpdate = async () => {
    const fullDB = await db.getFullDB();
    io.emit('db-update', fullDB);
};

io.on('connection', async (socket) => {
    let currentRole = null;
    let authenticated = false;

    console.log(`[AUDIT] Nueva conexion desde IP: ${socket.handshake.address} - ${new Date().toISOString()}`);

    // Enviar estado inicial
    const initialDB = await db.getFullDB();
    socket.emit('init', { db: initialDB, connectedRoles });

    // Login
    socket.on('login', async (credentials, callback) => {
        let { role, username, password } = credentials || {};

        // Si no se provee rol, o si el usuario no coincide con el rol enviado, 
        // intentar encontrar el rol correcto basado en el nombre de usuario.
        // Esto permite alias como 'admin' o 'juez1' si se configuran asì.
        const foundRole = Object.keys(AUTH_CONFIG).find(r =>
            AUTH_CONFIG[r].user.toLowerCase() === (username || "").toLowerCase()
        );

        if (foundRole) {
            role = foundRole;
        }

        if (!role || !AUTH_CONFIG[role]) {
            console.warn(`[AUDIT] Intento de login fallido: usuario no reconocido "${username}" - IP: ${socket.handshake.address}`);
            return callback({ success: false, message: 'Usuario o rol invalido' });
        }

        const expectedUser = AUTH_CONFIG[role].user;
        const expectedPass = AUTH_CONFIG[role].pass;

        // Validar contraseña (el usuario ya lo validamos al encontrar el rol, pero re-verificamos por seguridad)
        if (username.toLowerCase() !== expectedUser.toLowerCase() || password !== expectedPass) {
            console.warn(`[AUDIT] Credenciales incorrectas para ${role} - IP: ${socket.handshake.address}`);
            return callback({ success: false, message: 'Credenciales incorrectas' });
        }

        const oldSocketId = connectedRoles[role];
        if (oldSocketId && oldSocketId !== socket.id) {
            console.log(`[AUDIT] Takeover de sesion para ${role} - Nueva IP: ${socket.handshake.address}`);
            io.to(oldSocketId).emit('force-logout', { reason: 'session_taken' });
        }

        currentRole = role;
        authenticated = true;
        connectedRoles[role] = socket.id;

        console.log(`[AUDIT] Login exitoso para ${role} - IP: ${socket.handshake.address}`);
        io.emit('roles-update', connectedRoles);
        const currentDB = await db.getFullDB();
        callback({ success: true, db: currentDB });
    });

    socket.on('logout', () => {
        if (currentRole && connectedRoles[currentRole] === socket.id) {
            connectedRoles[currentRole] = null;
            io.emit('roles-update', connectedRoles);
        }
        currentRole = null;
    });

    socket.on('disconnect', () => {
        if (currentRole && connectedRoles[currentRole] === socket.id) {
            connectedRoles[currentRole] = null;
            io.emit('roles-update', connectedRoles);
        }
    });

    function requireAuth(requiredRole = 'Juez 1', actionName) {
        if (!authenticated) {
            console.warn(`[AUDIT] Intento de ${actionName} sin autenticar - IP: ${socket.handshake.address}`);
            return false;
        }
        if (requiredRole && currentRole !== requiredRole) {
            console.warn(`[AUDIT] ${currentRole || 'Desconocido'} intento ${actionName} - IP: ${socket.handshake.address}`);
            return false;
        }
        return true;
    }

    // --- Skaters ---
    socket.on('add-skater', async (skaterData, callback) => {
        console.log('[AUDIT] Intento de add-skater - Auth:', authenticated, '- Role:', currentRole);

        if (!requireAuth('Juez 1', 'agregar patinador')) {
            console.warn('[AUDIT] add-skater rechazado - no autenticado o rol incorrecto');
            if (callback) callback({ success: false, message: 'No autorizado. Debes iniciar sesión como Juez 1.' });
            return;
        }
        if (!skaterData || typeof skaterData.firstName !== 'string') {
            console.warn('[AUDIT] Datos invalidos en add-skater:', JSON.stringify(skaterData));
            if (callback) callback({ success: false, message: 'Datos invalidos' });
            return;
        }
        try {
            console.log('[AUDIT] Agregando patinador:', skaterData.firstName, skaterData.lastName);
            await db.addSkater(skaterData);
            console.log('[AUDIT] Patinador agregado exitosamente');
            await broadcastUpdate();
            if (callback) callback({ success: true });
        } catch (err) {
            console.error('[AUDIT] Error al agregar patinador:', err.message);
            if (callback) callback({ success: false, message: err.message });
        }
    });

    socket.on('delete-skater', async (id, callback) => {
        console.log(`[AUDIT] Solicitud de borrado para skater ID: ${id} | Tipo: ${typeof id} | Rol: ${currentRole}`);
        if (!requireAuth('Juez 1', 'eliminar patinador')) {
            console.warn(`[AUDIT] Borrado rechazado - rol actual: ${currentRole}`);
            if (callback) callback({ success: false, message: 'No autorizado' });
            return;
        }
        try {
            await db.deleteSkater(String(id));
            console.log(`[AUDIT] Patinador ${id} eliminado exitosamente`);
            await broadcastUpdate();
            if (callback) callback({ success: true });
        } catch (err) {
            console.error(`[AUDIT] Error al eliminar patinador ${id}:`, err.message);
            if (callback) callback({ success: false, message: err.message });
        }
    });

    socket.on('import-skaters', async (newSkaters) => {
        if (!requireAuth('Juez 1', 'importar patinadores masivamente')) return;
        if (!Array.isArray(newSkaters)) return;
        if (newSkaters.length > 500) {
            console.warn(`[AUDIT] Intento de importar ${newSkaters.length} patinadores (max 500)`);
            return;
        }
        await db.importSkaters(newSkaters);
        await broadcastUpdate();
    });

    // --- Battles ---
    socket.on('generate-heats', async ({ categoryId, newBattles }) => {
        if (!requireAuth('Juez 1', 'generar heats')) return;
        await db.replaceBattles(newBattles, categoryId);
        await broadcastUpdate();
    });

    socket.on('add-battles', async (newBattles) => {
        if (!requireAuth('Juez 1', 'agregar batallas')) return;
        await db.addBattles(newBattles);
        await broadcastUpdate();
    });

    // --- Tricks ---
    socket.on('save-trick', async ({ battleId, skaterId, trickPerformed, role, slotIndex }) => {
        const result = await db.saveTrick(battleId, skaterId, trickPerformed, role, slotIndex);
        if (result.success) {
            await broadcastUpdate();
        }
    });

    socket.on('delete-trick', async ({ battleId, skaterId, slotIndex, role }) => {
        const result = await db.deleteTrick(battleId, skaterId, slotIndex, role);
        if (result) {
            await broadcastUpdate();
        }
    });

    // --- Finish Battle ---
    socket.on('finish-battle', async (battleId, callback) => {
        if (currentRole !== 'Juez 1') {
            if (callback) callback({ success: false, message: 'Solo Juez 1 puede finalizar batallas' });
            return;
        }
        const success = await db.finishBattle(battleId);
        if (!success) {
            if (callback) callback({ success: false, message: 'Batalla no encontrada' });
            return;
        }
        await broadcastUpdate();
        if (callback) callback({ success: true });
    });

    socket.on('generate-next-phase', async (newBattles) => {
        if (!requireAuth('Juez 1', 'generar siguiente fase')) return;
        await db.addBattles(newBattles);
        await broadcastUpdate();
    });

    socket.on('admin-focus-battle', (battleId) => {
        socket.broadcast.emit('focus-battle', battleId);
    });

    // --- Restore / Reset ---
    socket.on('restore-db', async (fullDB) => {
        if (!requireAuth('Juez 1', 'restaurar base de datos')) return;
        console.log(`[AUDIT] Base de datos restaurada por ${currentRole} - IP: ${socket.handshake.address}`);
        await db.restoreDB(fullDB);
        await broadcastUpdate();
    });

    socket.on('reset-db', async () => {
        if (!requireAuth('Juez 1', 'resetear base de datos')) return;
        console.warn(`[AUDIT] Base de datos RESETEADA por ${currentRole} - IP: ${socket.handshake.address}`);
        await db.resetDB();
        await broadcastUpdate();
    });

    // --- Restart ---
    socket.on('restart-server', async () => {
        if (!requireAuth('Juez 1', 'reiniciar servidor')) return;
        console.warn(`[AUDIT] Inicio de servidor solicitado por ${currentRole} - IP: ${socket.handshake.address}`);
        console.log("Reiniciando servidor por solicitud del Admin...");
        await db.close();
        setTimeout(() => process.exit(0), 500);
    });
});

const PORT = process.env.PORT || 3005;

// Validate DATABASE_URL before starting
if (!process.env.DATABASE_URL) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    console.error('The server requires a PostgreSQL connection string to run.');
    console.error('');
    console.error('How to get DATABASE_URL from Supabase:');
    console.error('  1. Go to https://supabase.com/dashboard');
    console.error('  2. Select your project (slide-battle)');
    console.error('  3. Go to Project Settings > Database');
    console.error('  4. Find "Connection string" and copy the URI');
    console.error('  5. Format should be:');
    console.error('     postgresql://postgres:your_password@db.xxx.supabase.co:5432/postgres');
    console.error('');
    console.error('How to configure in Render:');
    console.error('  1. Go to https://dashboard.render.com');
    console.error('  2. Select your "slide" web service');
    console.error('  3. Click on "Environment" in the sidebar');
    console.error('  4. Click "Add Environment Variable"');
    console.error('  5. Add DATABASE_URL with your Supabase connection string');
    console.error('  6. Click "Save Changes" - the service will redeploy automatically');
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    process.exit(1);
}

(async () => {
    try {
        console.log('[STARTUP] Iniciando servidor...');
        console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV || 'undefined');
        console.log('[STARTUP] PORT:', process.env.PORT || '3005 (default)');
        console.log('[STARTUP] DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado ✓' : 'NO CONFIGURADO ✗');

        await db.ready();
        console.log('[STARTUP] Base de datos lista ✓');

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`═══════════════════════════════════════════════════════`);
            console.log(`Servidor de Slide Battle corriendo en http://localhost:${PORT}`);
            console.log(`Para las otras computadoras, usa la IP de esta maquina: http://<tu-ip-local>:${PORT}`);
            console.log(`═══════════════════════════════════════════════════════`);
        });
    } catch (err) {
        console.error('═══════════════════════════════════════════════════════');
        console.error('ERROR FATAL al iniciar el servidor:');
        console.error(err.message);
        console.error('');
        console.error('Detalles completos del error:');
        console.error(err.stack);
        console.error('═══════════════════════════════════════════════════════');
        process.exit(1);
    }
})();

process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido, cerrando BD...');
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT recibido, cerrando BD...');
    await db.close();
    process.exit(0);
});
