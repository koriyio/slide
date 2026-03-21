const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const pdf = require('html-pdf-node');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const DB_FILE = path.join(__dirname, 'db.json');

// Servir la carpeta principal del frontend (un nivel superior)
app.use(express.static(path.join(__dirname, '..')));

// API endpoint para obtener la DB
app.get('/api/db', (req, res) => {
    res.json(db);
});

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

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Estados de conexión (Mapa de Rol -> SocketID)
let connectedRoles = {
    'Juez 1': null,
    'Juez 2': null,
    'Juez 3': null
};

io.on('connection', (socket) => {
    let currentRole = null;

    // Enviar estado inicial
    socket.emit('init', { db, connectedRoles });

    // Login
    socket.on('login', (role, callback) => {
        // Permitir takeover: si el rol ya existe, avisar al anterior y sobreescribir
        const oldSocketId = connectedRoles[role];
        if (oldSocketId && oldSocketId !== socket.id) {
            io.to(oldSocketId).emit('force-logout', { reason: 'session_taken' });
            // No reseteamos currentRole del viejo socket aquí, 
            // la lógica de disconnect se encargará de validar antes de limpiar.
        }

        currentRole = role;
        connectedRoles[role] = socket.id;
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

    // Acciones de Skaters
    socket.on('add-skater', (skaterData) => {
        db.skaters.push(skaterData);
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('delete-skater', (id) => {
        db.skaters = db.skaters.filter(s => s.id !== id);
        saveDB();
        io.emit('db-update', db);
    });
    
    // Import Bulk
    socket.on('import-skaters', (newSkaters) => {
       db.skaters.push(...newSkaters);
       saveDB();
       io.emit('db-update', db);
    });

    // Acciones de Batallas
    socket.on('generate-heats', ({ categoryId, newBattles }) => {
        // Limpiar batallas existentes de la categoria
        db.battles = db.battles.filter(b => b.categoryId !== categoryId);
        // Insertar nuevas
        db.battles.push(...newBattles);
        saveDB();
        io.emit('db-update', db);
    });

    // Agregar batallas sin limpiar (para múltiples fases)
    socket.on('add-battles', (newBattles) => {
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
        db.battles.push(...newBattles);
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('admin-focus-battle', (battleId) => {
        // Enviar a todos los demás clientes (Jueces 2 y 3) para saltar automáticamente
        socket.broadcast.emit('focus-battle', battleId);
    });

    socket.on('restore-db', (fullDB) => {
        db = fullDB;
        saveDB();
        io.emit('db-update', db);
    });

    socket.on('reset-db', () => {
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
        if (currentRole === 'Juez 1') {
            console.log("Reiniciando servidor por solicitud del Admin...");
            setTimeout(() => process.exit(0), 500);
        }
    });
});

const PORT = 3005;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Slide Battle corriendo en http://localhost:${PORT}`);
    console.log(`Para las otras computadoras, usa la IP de esta máquina: http://<tu-ip-local>:${PORT}`);
});
