const fs = require('fs').promises;
const path = require('path');

class JsonDB {
    constructor() {
        this.dbPath = path.join(__dirname, 'db.json');
        this._ready = this.init();
        this._lock = Promise.resolve();
    }

    async _withLock(fn) {
        this._lock = this._lock.then(fn).catch(err => { console.error('[DB-JSON-LOCK] Error:', err); throw err; });
        return this._lock;
    }

    async init() {
        try {
            console.log('[DB-JSON] Iniciando modo local (JSON)...');
            // Verificar si el archivo existe
            try {
                await fs.access(this.dbPath);
            } catch {
                console.log('[DB-JSON] Archivo db.json no encontrado, creando uno nuevo...');
                const initialDB = {
                    skaters: [],
                    battles: [],
                    categories: [
                        { id: 'jun-f', name: 'Junior Femenino' },
                        { id: 'jun-m', name: 'Junior Masculino' },
                        { id: 'sen-f', name: 'Senior Femenino' },
                        { id: 'sen-m', name: 'Senior Masculino' },
                        { id: 'mini', name: 'Mini' }
                    ]
                };
                await fs.writeFile(this.dbPath, JSON.stringify(initialDB, null, 2), 'utf-8');
            }
            console.log('[DB-JSON] Conexión local exitosa ✓');
            return true;
        } catch (err) {
            console.error('[DB-JSON] Error inicializando base de datos local:', err);
            throw err;
        }
    }

    async ready() {
        return this._ready;
    }

    async getDB() {
        const data = await fs.readFile(this.dbPath, 'utf-8');
        return JSON.parse(data);
    }

    async saveDB(data) {
        await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    }

    // --- Interfaz compatible con db.js ---

    async getFullDB() {
        return await this.getDB();
    }

    async addSkater(skaterData) {
        return this._withLock(async () => {
            const db = await this.getDB();
            const newSkater = {
            id: skaterData.id || Date.now(),
            firstName: skaterData.firstName,
            lastName: skaterData.lastName,
            categoryId: skaterData.categoryId,
            seedNumber: parseInt(skaterData.seedNumber) || 0,
            externalId: skaterData.externalId || null,
            nationality: skaterData.nationality || 'CL'
        };
        db.skaters.push(newSkater);
        await this.saveDB(db);
        });
    }

    async deleteSkater(id) {
        return this._withLock(async () => {
            const db = await this.getDB();
        db.skaters = db.skaters.filter(s => String(s.id) !== String(id));
        db.battles.forEach(battle => {
            battle.skaters = battle.skaters.filter(s => String(s.skaterId) !== String(id));
        });
        await this.saveDB(db);
        });
    }

    async importSkaters(skaters) {
        return this._withLock(async () => {
            const db = await this.getDB();
        skaters.forEach(s => {
            const index = db.skaters.findIndex(existing => String(existing.id) === String(s.id));
            const skaterData = {
                id: s.id || Date.now() + Math.random(),
                firstName: s.firstName,
                lastName: s.lastName,
                categoryId: s.categoryId,
                seedNumber: parseInt(s.seedNumber) || 0,
                externalId: s.externalId || null,
                nationality: s.nationality || 'CL'
            };
            if (index !== -1) {
                db.skaters[index] = skaterData;
            } else {
                db.skaters.push(skaterData);
            }
        });
        await this.saveDB(db);
        });
    }

    async addBattles(battles) {
        return this._withLock(async () => {
            const db = await this.getDB();
        battles.forEach(newBattle => {
            const index = db.battles.findIndex(b => b.id === newBattle.id);
            if (index !== -1) {
                db.battles[index] = { ...db.battles[index], ...newBattle };
            } else {
                db.battles.push(newBattle);
            }
        });
        await this.saveDB(db);
        });
    }

    async replaceBattles(newBattles, categoryId) {
        return this._withLock(async () => {
            const db = await this.getDB();
        db.battles = db.battles.filter(b => b.categoryId !== categoryId);
        db.battles.push(...newBattles);
        await this.saveDB(db);
        });
    }

    async saveTrick(battleId, skaterId, trickPerformed, role, slotIndex) {
        return this._withLock(async () => {
            const db = await this.getDB();
        const battle = db.battles.find(b => b.id === battleId);
        if (!battle) return { success: false };

        const skater = battle.skaters.find(s => String(s.skaterId) === String(skaterId));
        if (!skater) return { success: false };

        if (!skater.judging) skater.judging = {};
        const maxSlots = battle.phase === 'Final' ? 5 : 4;

        if (!skater.judging[role]) {
            skater.judging[role] = new Array(maxSlots).fill(null);
        }

        // Scoring Logic (Copiada de db.js para consistencia)
        if (trickPerformed.isFail) {
            trickPerformed.finalScore = 0;
            trickPerformed.stopBonus = 0;
            trickPerformed.distanceBonus = 0;
        } else {
            const stopBonuses = { 0: 0, 1: 2.0, 2: 4.0, 3: 6.0 };
            const stopBonus = stopBonuses[trickPerformed.stopLevel] || 0;
            const adjustment = parseFloat(trickPerformed.adjustment) || 0;
            const distance = parseFloat(trickPerformed.distance) || 2.5;
            const distanceBonus = Math.max(0, Math.floor((distance - 2.5) / 0.5) * 1);
            
            let baseScore = trickPerformed.baseScore || 0;
            if (trickPerformed.isCombo && trickPerformed.baseScore2) {
                baseScore = Math.round((baseScore + trickPerformed.baseScore2) * 1.1 * 100) / 100;
            }

            const finalScore = baseScore + adjustment + distanceBonus + stopBonus;
            trickPerformed.stopBonus = stopBonus;
            trickPerformed.distanceBonus = distanceBonus;
            trickPerformed.finalScore = Math.max(0, Math.round(finalScore * 100) / 100);
        }

        trickPerformed.judgeRole = role;
        skater.judging[role][slotIndex] = trickPerformed;

        skater.totalScore = this.calculateTotalScore(skater.judging, battle.phase);
        
        await this.saveDB(db);
        return { success: true, judging: skater.judging, totalScore: skater.totalScore };
        });
    }

    async deleteTrick(battleId, skaterId, slotIndex, role) {
        return this._withLock(async () => {
            const db = await this.getDB();
        const battle = db.battles.find(b => b.id === battleId);
        if (!battle) return null;

        const skater = battle.skaters.find(s => String(s.skaterId) === String(skaterId));
        if (!skater || !skater.judging[role]) return null;

        skater.judging[role][slotIndex] = null;
        skater.totalScore = this.calculateTotalScore(skater.judging, battle.phase);

        await this.saveDB(db);
        return { judging: skater.judging, totalScore: skater.totalScore };
        });
    }

    async finishBattle(battleId) {
        return this._withLock(async () => {
            const db = await this.getDB();
        const battle = db.battles.find(b => b.id === battleId);
        if (!battle) return false;

        battle.status = 'completed';
        battle.skaters.sort((a, b) => b.totalScore - a.totalScore);
        battle.skaters.forEach((s, i) => {
            s.qualified = i < 2;
        });

        await this.saveDB(db);
        return true;
        });
    }

    async restoreDB(fullDB) {
        return this._withLock(async () => {
            await this.saveDB(fullDB);
        });
    }

    async resetDB() {
        return this._withLock(async () => {
            const initialDB = {
            skaters: [],
            battles: [],
            categories: [
                { id: 'jun-f', name: 'Junior Femenino' },
                { id: 'jun-m', name: 'Junior Masculino' },
                { id: 'sen-f', name: 'Senior Femenino' },
                { id: 'sen-m', name: 'Senior Masculino' },
                { id: 'mini', name: 'Mini' }
            ]
        };
        await this.saveDB(initialDB);
        });
    }

    async close() {
        // Nada que cerrar para JSON
    }

    // Helpers
    calculateTotalScore(judging, phase) {
        const calculateJudgeScore = (role) => {
            const tricks = judging[role] || [];
            const validTricks = tricks.filter(t => t !== null && !t.isFail && t.finalScore > 0);
            if (validTricks.length === 0) return 0;

            // Ordenar por puntaje final para tomar los mejores N
            const sortedByScore = [...validTricks].sort((a, b) => b.finalScore - a.finalScore);
            const maxToCount = phase === 'Final' ? 4 : 3;
            const bestTricks = sortedByScore.slice(0, maxToCount);
            const topScores = bestTricks.map(t => t.finalScore);

            // Multiplicador de variedad basado en los MEJORES trucos (bestTricks)
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
        return Math.round(((j1 + j2 + j3) / 3) * 100) / 100;
    }
}

module.exports = JsonDB;
