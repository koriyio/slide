const io = require("socket.io-client");

const URL = "http://localhost:3005";
console.log("🚀 Iniciando Simulación de Torneo (12 participantes)...");
const socket = io(URL);

const CATEGORY_ID = 'jun-f';
const ROLES = ['Juez 1', 'Juez 2', 'Juez 3'];
let skaters = [];
let database = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

socket.on('connect', () => {
    console.log("✅ Conectado al servidor.");
});

socket.on('init', async (data) => {
    database = data.db;
    skaters = database.skaters.filter(s => s.categoryId === CATEGORY_ID);
    console.log(`📊 Patinadores encontrados: ${skaters.length}`);

    try {
        await login();
        await runFullTournament();
    } catch (err) {
        console.error("❌ Error en la simulación:", err);
    } finally {
        socket.disconnect();
        process.exit(0);
    }
});

// Actualizar base de datos local cuando el servidor emite cambios
socket.on('db-update', (db) => {
    database = db;
});

async function login() {
    return new Promise((resolve, reject) => {
        socket.emit('login', { role: 'Juez 1', username: 'Slide', password: 'slide2026' }, (res) => {
            if (res.success) {
                console.log("🗝️ Login exitoso.");
                resolve();
            } else reject(res.message);
        });
    });
}

async function runFullTournament() {
    // 1. Limpiar batallas previas
    console.log("🧹 Limpiando batallas previas...");
    socket.emit('generate-heats', { categoryId: CATEGORY_ID, newBattles: [] });
    await sleep(500);

    // 2. Generar Heats Preliminares
    console.log("📦 Generando Heats Preliminares...");
    const sorted = [...skaters].sort((a,b) => (a.seedNumber || 99) - (b.seedNumber || 99));
    const initialBattles = [];
    for (let i = 0; i < 3; i++) {
        initialBattles.push({
            id: Date.now() + i,
            categoryId: CATEGORY_ID,
            phase: 'Preliminar',
            heatNumber: i + 1,
            status: 'pending',
            skaters: sorted.slice(i * 4, (i + 1) * 4).map(s => ({
                skaterId: s.id,
                judging: {},
                totalScore: 0,
                qualified: false
            }))
        });
    }
    socket.emit('generate-heats', { categoryId: CATEGORY_ID, newBattles: initialBattles });
    await sleep(500);

    // 3. Procesar Heats
    await processPhase('Preliminar');

    // 4. Generar y procesar Semifinales
    console.log("➡️ Generando Semifinales...");
    await generateNextPhase('Semifinales');
    await sleep(500);
    await processPhase('Semifinales');

    // 5. Generar y procesar Final
    console.log("➡️ Generando FINAL...");
    await generateNextPhase('Final');
    await sleep(500);
    await processPhase('Final');

    console.log("🏁 ¡SIMULACIÓN COMPLETADA EXITOSAMENTE!");
}

async function processPhase(phaseName) {
    let pendingBattles = database.battles.filter(b => b.categoryId === CATEGORY_ID && b.phase === phaseName && b.status === 'pending');
    
    while (pendingBattles.length > 0) {
        const currentBattle = pendingBattles[0];
        console.log(`🎥 Juzgando: ${currentBattle.phase} - Heat ${currentBattle.heatNumber}`);
        await simulateJudging(currentBattle);
        
        socket.emit('finish-battle', currentBattle.id);
        await sleep(1000); // Dar tiempo al servidor para clasificar
        
        pendingBattles = database.battles.filter(b => b.categoryId === CATEGORY_ID && b.phase === phaseName && b.status === 'pending');
    }
}

async function simulateJudging(battle) {
    const maxEntries = battle.phase === 'Final' ? 5 : 4;
    const families = ['F1 Frontside', 'F2 Backside', 'F3 Footwork', 'F4 Special'];
    
    for (const bSkater of battle.skaters) {
        const sk = skaters.find(s => s.id === bSkater.skaterId);
        process.stdout.write(`   - ${sk.firstName} ${sk.lastName}... `);
        
        for (const role of ROLES) {
            for (let i = 0; i < maxEntries; i++) {
                const trick = {
                    id: `test-${Date.now()}-${i}`,
                    name: `Truco Test ${i+1}`,
                    family: families[i % families.length],
                    baseScore: (Math.random() * 4 + 5).toFixed(1),
                    distanceMeters: (Math.random() * 6 + 3).toFixed(1),
                    executionLevel: Math.floor(Math.random() * 3) + 1,
                    stopLevel: Math.floor(Math.random() * 2) + 1,
                    isFail: Math.random() > 0.95
                };
                
                socket.emit('save-trick', {
                    battleId: battle.id,
                    skaterId: bSkater.skaterId,
                    trickPerformed: trick,
                    role: role,
                    slotIndex: i
                });
                await sleep(20);
            }
        }
        process.stdout.write(`OK\n`);
        await sleep(200);
    }
}

async function generateNextPhase(nextPhaseName) {
    const winners = [];
    const lastPhase = nextPhaseName === 'Semifinales' ? 'Preliminar' : 'Semifinales';
    const currentBattles = database.battles.filter(b => b.categoryId === CATEGORY_ID && b.phase === lastPhase && b.status === 'completed');
    
    currentBattles.forEach(b => {
        b.skaters.filter(s => s.qualified).forEach(s => {
            winners.push(skaters.find(sk => sk.id === s.skaterId));
        });
    });

    const newBattles = [];
    if (nextPhaseName === 'Semifinales') {
        for (let i = 0; i < 2; i++) {
            newBattles.push({
                id: Date.now() + i + 100,
                categoryId: CATEGORY_ID,
                phase: 'Semifinales',
                heatNumber: i + 1,
                status: 'pending',
                skaters: winners.slice(i * 3, (i + 1) * 3).map(s => ({
                    skaterId: s.id,
                    judging: {},
                    totalScore: 0,
                    qualified: false
                }))
            });
        }
    } else {
        newBattles.push({
            id: Date.now() + 200,
            categoryId: CATEGORY_ID,
            phase: 'Final',
            heatNumber: 1,
            status: 'pending',
            skaters: winners.map(s => ({
                skaterId: s.id,
                judging: {},
                totalScore: 0,
                qualified: false
            }))
        });
    }
    socket.emit('add-battles', newBattles);
}
