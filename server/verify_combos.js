/**
 * VERIFICACIÓN DE DERRAPES COMBINADOS (COMBOS)
 * Simulación de 4 participantes en Senior Masculino
 * Reglamento World Skate 2026 (Art. 9.5.2.2)
 */

class MockSlideDB {
    constructor() {
        this.stopBonuses = { 0: 0, 1: 2.0, 2: 4.0, 3: 6.0 };
    }

    calculateScore(trick1Base, trick2Base, adjustment, distance, stopLevel, isCombo) {
        let baseScore = trick1Base;
        let comboBonus = 0;

        if (isCombo && trick2Base) {
            // (Base1 + Base2) * 1.10
            const rawBase = baseScore + trick2Base;
            baseScore = Math.round((rawBase) * 1.1 * 100) / 100;
            comboBonus = Math.round((baseScore - rawBase) * 100) / 100;
        }

        const stopBonus = this.stopBonuses[stopLevel] || 0;
        const distBonus = Math.max(0, Math.floor((distance - 2.5) / 0.5) * 1);
        const finalScore = baseScore + adjustment + distBonus + stopBonus;

        return {
            baseScore,
            comboBonus,
            stopBonus,
            distBonus,
            finalScore: Math.round(finalScore * 100) / 100
        };
    }
}

const db = new MockSlideDB();
const skaters = [
    { name: 'MATÍAS GONZÁLEZ', t1: 15, t2: 20, isCombo: true, dist: 2.5, stop: 0, adj: 0 },
    { name: 'BENJAMÍN MUÑOZ', t1: 10, t2: 11, isCombo: true, dist: 2.5, stop: 0, adj: 0 },
    { name: 'JOAQUÍN ROJAS', t1: 15, t2: 17, isCombo: true, dist: 3.5, stop: 2, adj: 0 },
    { name: 'NICOLÁS DÍAZ', t1: 54, t2: 0, isCombo: false, dist: 2.5, stop: 0, adj: 0 }
];

console.log('===============================================================');
console.log(' SIMULACIÓN DE PRUEBA: SENIOR MASCULINO (COMBOS) ');
console.log('===============================================================');
console.log('SKATER           | T1+T2 (BASE) | BONUS 10% | DIST/STOP | TOTAL');
console.log('---------------------------------------------------------------');

skaters.forEach(s => {
    const result = db.calculateScore(s.t1, s.t2, s.adj, s.dist, s.stop, s.isCombo);
    const skaterName = s.name.padEnd(16);
    const bases = `${s.t1}+${s.t2 || '-'}`.padEnd(12);
    const bonus = `+${result.comboBonus.toFixed(1)}`.padEnd(9);
    const distStop = `${result.distBonus}/${result.stopBonus}`.padEnd(9);
    const total = `${result.finalScore.toFixed(1)} pts`.padStart(8);
    
    console.log(`${skaterName} | ${bases} | ${bonus} | ${distStop} | ${total}`);
});

console.log('---------------------------------------------------------------');
console.log('Verificación completada según Regla 9.5.2.2.');
