const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) {
    console.error("No se encontró db.json");
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (db.battles && Array.isArray(db.battles)) {
    // Buscar la batalla Final 1 de Senior Masculino
    const battle = db.battles.find(b => b.phase === 'Final' && b.heatNumber === 1);
    if (battle) {
        console.log(`Reseteando batalla ${battle.id} (${battle.phase} ${battle.heatNumber})...`);
        battle.status = 'progress'; // volver a en progreso
        if (battle.skaters && Array.isArray(battle.skaters)) {
            battle.skaters.forEach(skater => {
                skater.totalScore = 0;
                skater.qualified = false;
                skater.slides = [];
                skater.judging = {
                    "Juez 1": [],
                    "Juez 2": [],
                    "Juez 3": []
                };
            });
        }
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
        console.log("¡Batalla reseteada con éxito! Ahora está en progreso y vacía.");
    } else {
        console.error("No se encontró ninguna batalla de Final 1.");
    }
} else {
    console.error("No hay batallas en la base de datos.");
}
