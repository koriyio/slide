const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) {
    console.error("No se encontró db.json en:", dbPath);
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Helper to calculate stop bonus
function getStopBonus(trick) {
    if (!trick || trick.isFail || !trick.stopLevel) return 0;
    const stopBonuses = { 0: 0, 1: 5.0, 2: 10.0 };
    return stopBonuses[trick.stopLevel] || 0;
}

// Helper to calculate totalScore
function calculateTotalScore(judging, phase) {
    const calculateJudgeScore = (role) => {
        const tricks = judging[role] || [];
        const validTricks = tricks.filter(t => t !== null && !t.isFail && t.finalScore > 0);
        if (validTricks.length === 0) return 0;

        let filteredTricks = validTricks;
        const isAdvancedPhase = (phase === 'Final' || phase === 'Semifinal' || phase === 'Semi-Final');

        if (isAdvancedPhase) {
            // Filtrar derrapes repetidos: sólo dejamos el de mayor puntaje final de los repetidos
            const seenTricks = {};
            validTricks.forEach(t => {
                const key = t.isCombo ? `${t.trickId}_combo_${t.trickId2}` : t.trickId;
                if (!seenTricks[key] || t.finalScore > seenTricks[key].finalScore) {
                    seenTricks[key] = t;
                }
            });
            filteredTricks = Object.values(seenTricks);
        }

        const sortedByScore = [...filteredTricks].sort((a, b) => b.finalScore - a.finalScore);
        const maxToCount = phase === 'Final' ? 4 : 3;
        const bestTricks = sortedByScore.slice(0, maxToCount);
        const topScores = bestTricks.map(t => t.finalScore);

        const families = new Set(bestTricks.map(t => (t.family || '').match(/^(F\d+)/)?.[1] || ''));
        const numFamilies = families.size;
        let m_var = 1.0;
        if (numFamilies === 3) m_var = 1.05;
        else if (numFamilies >= 4) m_var = 1.10;

        const baseTotal = topScores.reduce((acc, score) => acc + score, 0);
        return Math.round(baseTotal * m_var * 100) / 100;
    };

    const j1 = calculateJudgeScore('Juez 1');
    const j2 = calculateJudgeScore('Juez 2');
    const j3 = calculateJudgeScore('Juez 3');
    let total = Math.round(((j1 + j2 + j3) / 3) * 100) / 100;
    if (judging.bestSlideBonus) {
        total += 0.01;
    }
    return total;
}

console.log("Recalculando todos los puntajes en db.json...");

let tricksCount = 0;

if (db.battles && Array.isArray(db.battles)) {
    db.battles.forEach(battle => {
        if (battle.skaters && Array.isArray(battle.skaters)) {
            battle.skaters.forEach(skater => {
                if (skater.judging) {
                    const roles = ['Juez 1', 'Juez 2', 'Juez 3'];
                    roles.forEach(role => {
                        if (skater.judging[role] && Array.isArray(skater.judging[role])) {
                            skater.judging[role] = skater.judging[role].map((trickPerformed, idx) => {
                                if (!trickPerformed) return null;
                                
                                if (trickPerformed.isFail) {
                                    trickPerformed.finalScore = 0;
                                    trickPerformed.stopBonus = 0;
                                    trickPerformed.distanceBonus = 0;
                                    trickPerformed.distance2Bonus = 0;
                                } else {
                                    const stopBonus = getStopBonus(trickPerformed);
                                    const adjustment = parseFloat(trickPerformed.adjustment) || 0;
                                    const distance = parseFloat(trickPerformed.distance) || 2.0;
                                    const distanceBonus = Math.max(0, Math.floor((distance - 2.0) / 0.5) * 1);
                                    
                                    let distance2Bonus = 0;
                                    if (trickPerformed.isCombo) {
                                        const distance2 = parseFloat(trickPerformed.distance2) || 2.0;
                                        distance2Bonus = Math.max(0, Math.floor((distance2 - 2.0) / 0.5) * 1);
                                    }
                                    
                                    let baseScore = trickPerformed.baseScore || 0;
                                    if (trickPerformed.isCombo && trickPerformed.baseScore2) {
                                        const base1 = baseScore;
                                        const base2 = trickPerformed.baseScore2 || 0;
                                        const maxBase = Math.max(base1, base2);
                                        const minBase = Math.min(base1, base2);
                                        // 100% del mayor + 25% del menor con un multiplicador de 1.05x por la conexión
                                        baseScore = Math.round((maxBase + (minBase * 0.25)) * 1.05 * 100) / 100;
                                    }

                                    const finalScore = baseScore + adjustment + distanceBonus + distance2Bonus + stopBonus;
                                    trickPerformed.stopBonus = stopBonus;
                                    trickPerformed.distanceBonus = distanceBonus;
                                    trickPerformed.distance2Bonus = distance2Bonus;
                                    trickPerformed.finalScore = Math.max(0, Math.round(finalScore * 100) / 100);
                                    tricksCount++;
                                }
                                return trickPerformed;
                            });
                        }
                    });

                    // Recalcular totalScore para el patinador
                    skater.totalScore = calculateTotalScore(skater.judging, battle.phase);
                }
            });
        }
    });
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`¡Éxito! Se recalcularon ${tricksCount} trucos y se actualizaron las puntuaciones de todas las batallas.`);
