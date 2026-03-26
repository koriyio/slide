require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const pdf = require('html-pdf-node');
const crypto = require('crypto');

const app = express();

// Configuración de CORS para producción
const allowedOrigins = process.env.CORS_ORIGIN
    ? [process.env.CORS_ORIGIN, 'http://localhost:3005', 'http://127.0.0.1:3005']
    : ['http://localhost:3005', 'http://127.0.0.1:3005'];

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const DB_FILE = path.join(__dirname, 'db.json');

// Configuración de autenticación desde variables de entorno
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

// Servir la carpeta principal del frontend (un nivel superior)
app.use(express.static(path.join(__dirname, '..')));

// Middleware de seguridad para limitar tamaño de requests
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API endpoint para obtener la DB - SOLO en desarrollo
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/db', (req, res) => {
        res.json(db);
    });
}

// Cargar DB
let db = {
    skaters: [],
    battles: [],
    categories: [
        { id: 'jun-f', name: 'Junior Femenino' },
        { id: 'jun-m', name: 'Junior Masculino' },
        { id: 'sen-f', name: 'Senior Femenino' },
        { id: 'sen-m', name: 'Senior Masculino' }
    ]
};

if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error("Error leyendo DB", e);
    }
}

// Función para guardar DB de forma asíncrona con debounce
let saveTimeout = null;
function saveDB() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) console.error("[ERROR] Error guardando DB:", err);
        });
    }, 100); // Agrupar escrituras dentro de 100ms
}

// Estados de conexión (Mapa de Rol -> SocketID)
let connectedRoles = {
    'Juez 1': null,
    'Juez 2': null,
    'Juez 3': null
};

io.on('connection', (socket) => {
    let currentRole = null;
    let authenticated = false;

    // Log de conexión para auditoría
    console.log(`[AUDIT] Nueva conexión desde IP: ${socket.handshake.address} - ${new Date().toISOString()}`);

    // Enviar estado inicial
    socket.emit('init', { db, connectedRoles });

    // Login con validación de credenciales
    socket.on('login', (credentials, callback) => {
        const { role, username, password } = credentials || {};

        // Validar que el rol exista
        if (!role || !AUTH_CONFIG[role]) {
            console.warn(`[AUDIT] Intento de login con rol inválido: ${role} - IP: ${socket.handshake.address}`);
            return callback({ success: false, message: 'Rol inválido' });
        }

        // Validar credenciales
        const expectedUser = AUTH_CONFIG[role].user;
        const expectedPass = AUTH_CONFIG[role].pass;

        if (username !== expectedUser || password !== expectedPass) {
            console.warn(`[AUDIT] Credenciales incorrectas para ${role} - IP: ${socket.handshake.address}`);
            return callback({ success: false, message: 'Credenciales incorrectas' });
        }

        // Permitir takeover: si el rol ya existe, avisar al anterior y sobreescribir
        const oldSocketId = connectedRoles[role];
        if (oldSocketId && oldSocketId !== socket.id) {
            console.log(`[AUDIT] Takeover de sesión para ${role} - Nueva IP: ${socket.handshake.address}`);
            io.to(oldSocketId).emit('force-logout', { reason: 'session_taken' });
        }

        currentRole = role;
        authenticated = true;
        connectedRoles[role] = socket.id;

        console.log(`[AUDIT] Login exitoso para ${role} - IP: ${socket.handshake.address}`);
        io.emit('roles-update', connectedRoles);
        callback({ success: true, db });
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

    // --- ACCIONES DE BASE DE DATOS ---

    // Función helper para verificar autorización
    function requireAuth(requiredRole = 'Juez 1', actionName) {
        if (!authenticated) {
            console.warn(`[AUDIT] Intento de ${actionName} sin autenticar - IP: ${socket.handshake.address}`);
            return false;
        }
        if (requiredRole && currentRole !== requiredRole) {
            console.warn(`[AUDIT] ${currentRole || 'Desconocido'} intentó ${actionName} - IP: ${socket.handshake.address}`);
            return false;
        }
        return true;
    }

    // Acciones de Skaters - Solo Juez 1
    socket.on('add-skater', (skaterData) => {
        if (!requireAuth('Juez 1', 'agregar patinador')) return;

        // Validación de datos
        if (!skaterData || typeof skaterData.firstName !== 'string') {
            console.warn('[AUDIT] Datos inválidos en add-skater');
            return;
        }

        db.skaters.push(skaterData);
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('delete-skater', (id) => {
        if (!requireAuth('Juez 1', 'eliminar patinador')) return;
        db.skaters = db.skaters.filter(s => s.id !== id);
        saveDB();
        io.emit('db-update', db);
    });

    // Import Bulk - Solo Juez 1
    socket.on('import-skaters', (newSkaters) => {
        if (!requireAuth('Juez 1', 'importar patinadores masivamente')) return;

        // Validar que sea un array y limitar a 500 patinadores
        if (!Array.isArray(newSkaters)) return;
        if (newSkaters.length > 500) {
            console.warn(`[AUDIT] Intento de importar ${newSkaters.length} patinadores (máx 500)`);
            return;
        }

        db.skaters.push(...newSkaters);
        saveDB();
        io.emit('db-update', db);
    });

    // Acciones de Batallas - Solo Juez 1
    socket.on('generate-heats', ({ categoryId, newBattles }) => {
        if (!requireAuth('Juez 1', 'generar heats')) return;

        // Limpiar batallas existentes de la categoria
        db.battles = db.battles.filter(b => b.categoryId !== categoryId);
        // Insertar nuevas
        db.battles.push(...newBattles);
        saveDB();
        io.emit('db-update', db);
    });

    // Agregar batallas sin limpiar (para múltiples fases) - Solo Juez 1
    socket.on('add-battles', (newBattles) => {
        if (!requireAuth('Juez 1', 'agregar batallas')) return;
        db.battles.push(...newBattles);
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('save-trick', ({ battleId, skaterId, trickPerformed, role, slotIndex }) => {
        const battle = db.battles.find(b => b.id === battleId);
        if (!battle) return;
        const skater = battle.skaters.find(s => s.skaterId === skaterId);
        if (!skater) return;

        // Estructura de slots por juez (4 normal, 5 en Final)
        const maxSlots = battle.phase === 'Final' ? 5 : 4;
        if (!skater.judging) {
            skater.judging = {
                'Juez 1': new Array(maxSlots).fill(null),
                'Juez 2': new Array(maxSlots).fill(null),
                'Juez 3': new Array(maxSlots).fill(null)
            };
        }

        // Guardar en el slot específico
        trickPerformed.judgeRole = role;
        skater.judging[role][slotIndex] = trickPerformed;

        // Recalcular promedios en tiempo real para el resultado global (Mejores N derivado de la fase)
        const calculateJudgeScore = (jRole) => {
            const tricks = skater.judging[jRole] || [];
            let scores = tricks.map(t => t ? t.finalScore : 0);
            scores.sort((a, b) => b - a);
            const maxToCount = battle.phase === 'Final' ? 4 : 3;
            return scores.slice(0, maxToCount).reduce((acc, score) => acc + score, 0);
        };
        const j1Total = calculateJudgeScore('Juez 1');
        const j2Total = calculateJudgeScore('Juez 2');
        const j3Total = calculateJudgeScore('Juez 3');

        skater.totalScore = (j1Total + j2Total + j3Total) / 3;

        saveDB();
        io.emit('db-update', db);
    });

    socket.on('delete-trick', ({ battleId, skaterId, slotIndex, role }) => {
        const battle = db.battles.find(b => b.id === battleId);
        if (!battle) return;
        const skater = battle.skaters.find(s => s.skaterId === skaterId);
        if (!skater || !skater.judging) return;

        // Solo permite borrar trucos si es el dueño del slot o el admin (J1)
        if (role === 'Juez 1' || skater.judging[role]) {
            skater.judging[role][slotIndex] = null;

            // Recalcular
            const calculateJudgeScore = (jRole) => {
                const tricks = skater.judging[jRole] || [];
                let scores = tricks.map(t => t ? t.finalScore : 0);
                scores.sort((a, b) => b - a);
                const maxToCount = battle.phase === 'Final' ? 4 : 3;
                return scores.slice(0, maxToCount).reduce((acc, score) => acc + score, 0);
            };
            skater.totalScore = (calculateJudgeScore('Juez 1') + calculateJudgeScore('Juez 2') + calculateJudgeScore('Juez 3')) / 3;

            saveDB();
            io.emit('db-update', db);
        }
    });

    socket.on('finish-battle', (battleId, callback) => {
        if (currentRole !== 'Juez 1') {
            if (callback) callback({ success: false, message: 'Solo Juez 1 puede finalizar batallas' });
            return;
        }
        const battle = db.battles.find(b => b.id === battleId);
        if (!battle) {
            if (callback) callback({ success: false, message: 'Batalla no encontrada' });
            return;
        }

        battle.status = 'completed';

        // Ordenar por puntaje descendente
        battle.skaters.sort((a, b) => b.totalScore - a.totalScore);

        // Clasificar top 2
        if (battle.skaters.length > 0) battle.skaters[0].qualified = true;
        if (battle.skaters.length > 1) battle.skaters[1].qualified = true;

        saveDB();
        io.emit('db-update', db);
        if (callback) callback({ success: true });
    });

    socket.on('generate-next-phase', (newBattles) => {
        if (!requireAuth('Juez 1', 'generar siguiente fase')) return;
        db.battles.push(...newBattles);
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('admin-focus-battle', (battleId) => {
        // Enviar a todos los demás clientes (Jueces 2 y 3) para saltar automáticamente
        socket.broadcast.emit('focus-battle', battleId);
    });

    socket.on('restore-db', (fullDB) => {
        if (!requireAuth('Juez 1', 'restaurar base de datos')) return;
        console.log(`[AUDIT] Base de datos restaurada por ${currentRole} - IP: ${socket.handshake.address}`);
        db = fullDB;
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('reset-db', () => {
        if (!requireAuth('Juez 1', 'resetear base de datos')) return;
        console.warn(`[AUDIT] Base de datos RESETEADA por ${currentRole} - IP: ${socket.handshake.address}`);
        db = {
            skaters: [], battles: [],
            categories: [
                { id: 'jun-f', name: 'Junior Femenino' },
                { id: 'jun-m', name: 'Junior Masculino' },
                { id: 'sen-f', name: 'Senior Femenino' },
                { id: 'sen-m', name: 'Senior Masculino' },
                { id: 'mini', name: 'Mini' }
            ]
        };
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('export-pdf', async (data, callback) => {
        try {
            const options = {
                format: 'A4',
                landscape: true,
                printBackground: true,
                margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
            };
            const file = { content: data.html };

            pdf.generatePdf(file, options).then(pdfBuffer => {
                if (callback) callback({ success: true, buffer: pdfBuffer });
            }).catch(err => {
                console.error("Error generando PDF:", err);
                if (callback) callback({ success: false, message: 'Error generando PDF' });
            });
        } catch (error) {
            console.error("Error en export-pdf:", error);
            if (callback) callback({ success: false, message: 'Error interno generando PDF' });
        }
    });

    socket.on('restart-server', () => {
        if (!requireAuth('Juez 1', 'reiniciar servidor')) return;
        console.warn(`[AUDIT] Reinicio de servidor solicitado por ${currentRole} - IP: ${socket.handshake.address}`);
        console.log("Reiniciando servidor por solicitud del Admin...");
        // En Render, el servidor se reiniciará automáticamente
        setTimeout(() => process.exit(0), 500);
    });
});

const PORT = 3005;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Slide Battle corriendo en http://localhost:${PORT}`);
    console.log(`Para las otras computadoras, usa la IP de esta máquina: http://<tu-ip-local>:${PORT}`);
});
