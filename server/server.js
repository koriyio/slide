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

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com; font-src 'self' https://fonts.gstatic.com https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self';");
    next();
});

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
    socket.on('add-skater', async (skaterData) => {
        if (!requireAuth('Juez 1', 'agregar patinador')) return;
        if (!skaterData || typeof skaterData.firstName !== 'string') {
            console.warn('[AUDIT] Datos invalidos en add-skater');
            return;
        }
        await db.addSkater(skaterData);
        await broadcastUpdate();
    });

    socket.on('delete-skater', async (id) => {
        if (!requireAuth('Juez 1', 'eliminar patinador')) return;
        await db.deleteSkater(id);
        await broadcastUpdate();
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

    // --- PDF Export ---
    socket.on('export-pdf', async (data, callback) => {
        if (!requireAuth('Juez 1', 'exportar PDF')) return callback({ success: false, message: 'No autorizado' });

        try {
            const htmlContent = data.html;
            const options = { format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } };
            const file = { content: htmlContent };

            console.log(`[AUDIT] Generando PDF solicitado por ${currentRole}...`);

            HTML_PDF.generatePdf(file, options)
                .then(pdfBuffer => {
                    callback({ success: true, pdf: pdfBuffer.toString('base64') });
                    console.log(`[AUDIT] PDF generado exitosamente.`);
                })
                .catch(err => {
                    console.error('[AUDIT] Error generado PDF:', err.message);
                    callback({ success: false, message: 'Error interno al generar PDF' });
                });
        } catch (e) {
            console.error('[AUDIT] Excepcion en export-pdf:', e.message);
            callback({ success: false, message: 'Error critico en la generacion de PDF' });
        }
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
    console.error('ERROR: DATABASE_URL is not set. The server requires a PostgreSQL connection string.');
    console.error('Get it from Supabase > Project Settings > Database > Connection string');
    console.error('Format: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres');
    process.exit(1);
}

(async () => {
    try {
        await db.ready();
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor de Slide Battle corriendo en http://localhost:${PORT}`);
            console.log(`Para las otras computadoras, usa la IP de esta maquina: http://<tu-ip-local>:${PORT}`);
        });
    } catch (err) {
        console.error('Error fatal al iniciar el servidor:', err.message);
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
