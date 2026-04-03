const { Pool } = require('pg');
const dns = require('dns');
const url = require('url');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skaters (
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    seed_number INTEGER DEFAULT 0,
    external_id TEXT,
    nationality TEXT DEFAULT 'CL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    phase TEXT NOT NULL,
    heat_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battle_skaters (
    id SERIAL PRIMARY KEY,
    battle_id INTEGER NOT NULL REFERENCES battles(id),
    skater_id INTEGER NOT NULL REFERENCES skaters(id),
    judging JSONB NOT NULL DEFAULT '{}',
    total_score REAL DEFAULT 0,
    qualified INTEGER DEFAULT 0,
    UNIQUE(battle_id, skater_id)
);
`;

class SlideDB {
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.error('[DB] DATABASE_URL no está definida en las variables de entorno.');
        }

        // Parse connection string to force IPv4 (Render free tier doesn't support IPv6)
        const parsed = url.parse(connectionString);
        const host = parsed.hostname;
        const port = parsed.port || 5432;
        const user = parsed.auth ? parsed.auth.split(':')[0] : 'postgres';
        const password = parsed.auth ? parsed.auth.split(':')[1] : '';
        const database = (parsed.pathname || '').replace(/^\//, '') || 'postgres';

        this.pool = new Pool({
            host: host,
            port: parseInt(port),
            user: user,
            password: password,
            database: database,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            // Force IPv4 resolution
            family: 4
        });

        this._ready = this.init();
    }

    async init() {
        try {
            await this.pool.query(SCHEMA_SQL);
            console.log('[DB] Esquema de PostgreSQL inicializado correctamente.');
            await this.seedCategories();
        } catch (err) {
            console.error('[DB] Error inicializando base de datos:', err.message);
            throw err;
        }
    }

    async ready() {
        return this._ready;
    }

    async seedCategories() {
        const categories = [
            { id: 'jun-f', name: 'Junior Femenino' },
            { id: 'jun-m', name: 'Junior Masculino' },
            { id: 'sen-f', name: 'Senior Femenino' },
            { id: 'sen-m', name: 'Senior Masculino' },
            { id: 'mini', name: 'Mini' }
        ];

        for (const cat of categories) {
            await this.pool.query(
                'INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
                [cat.id, cat.name]
            );
        }
    }

    // --- Get full DB (format used by frontend) ---
    async getFullDB() {
        try {
            const categories = await this.pool.query('SELECT id, name FROM categories');
            const skaters = await this.pool.query('SELECT id, first_name, last_name, category_id, seed_number, external_id, nationality FROM skaters');
            const battles = await this.pool.query('SELECT id, category_id, phase, heat_number, status FROM battles ORDER BY category_id, phase, heat_number');

            const skatersMapped = skaters.rows.map(r => ({
                id: r.id,
                firstName: r.first_name,
                lastName: r.last_name,
                categoryId: r.category_id,
                seedNumber: r.seed_number,
                externalId: r.external_id,
                nationality: r.nationality
            }));

            const battlesMapped = await Promise.all(battles.rows.map(async (b) => {
                const battleSkaters = await this.getBattleSkaters(b.id);
                return {
                    id: b.id,
                    categoryId: b.category_id,
                    phase: b.phase,
                    heatNumber: b.heat_number,
                    status: b.status,
                    skaters: battleSkaters
                };
            }));

            return { skaters: skatersMapped, battles: battlesMapped, categories: categories.rows };
        } catch (err) {
            console.error('[DB] Error en getFullDB:', err.message);
            return { skaters: [], battles: [], categories: [] };
        }
    }

    async getBattleSkaters(battleId) {
        const res = await this.pool.query(
            `SELECT skater_id, judging, total_score, qualified FROM battle_skaters WHERE battle_id = $1`,
            [battleId]
        );
        return res.rows.map(r => ({
            skaterId: r.skater_id,
            judging: r.judging,
            totalScore: r.total_score,
            qualified: r.qualified === 1
        }));
    }

    // --- Skaters ---
    async addSkater(skaterData) {
        await this.pool.query(
            `INSERT INTO skaters (id, first_name, last_name, category_id, seed_number, external_id, nationality)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                skaterData.id,
                skaterData.firstName,
                skaterData.lastName,
                skaterData.categoryId,
                skaterData.seedNumber || 0,
                skaterData.externalId || null,
                skaterData.nationality || 'CL'
            ]
        );
    }

    async deleteSkater(id) {
        // Primero eliminar de battle_skaters para evitar errores de integridad
        await this.pool.query('DELETE FROM battle_skaters WHERE skater_id = $1', [id]);
        await this.pool.query('DELETE FROM skaters WHERE id = $1', [id]);
    }

    async importSkaters(skaters) {
        for (const s of skaters) {
            await this.pool.query(
                `INSERT INTO skaters (id, first_name, last_name, category_id, seed_number, external_id, nationality)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE 
                 SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name`,
                [
                    s.id, s.firstName, s.lastName, s.categoryId,
                    s.seedNumber || 0, s.externalId || null, s.nationality || 'CL'
                ]
            );
        }
    }

    // --- Battles ---
    async addBattles(battles) {
        for (const battle of battles) {
            await this.pool.query(
                `INSERT INTO battles (id, category_id, phase, heat_number, status)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE
                 SET status = EXCLUDED.status`,
                [
                    battle.id,
                    battle.categoryId,
                    battle.phase,
                    battle.heatNumber,
                    battle.status || 'pending'
                ]
            );
            for (const s of battle.skaters) {
                await this.pool.query(
                    `INSERT INTO battle_skaters (battle_id, skater_id, judging, total_score, qualified)
                     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (battle_id, skater_id) DO UPDATE
                     SET total_score = EXCLUDED.total_score, qualified = EXCLUDED.qualified`,
                    [
                        battle.id,
                        s.skaterId,
                        s.judging || {},
                        s.totalScore || 0,
                        s.qualified ? 1 : 0
                    ]
                );
            }
        }
    }

    async replaceBattles(newBattles, categoryId) {
        // Eliminar batallas existentes de la categoría
        const battlesToDelRes = await this.pool.query('SELECT id FROM battles WHERE category_id = $1', [categoryId]);
        const ids = battlesToDelRes.rows.map(r => r.id);

        if (ids.length > 0) {
            await this.pool.query('DELETE FROM battle_skaters WHERE battle_id = ANY($1)', [ids]);
            await this.pool.query('DELETE FROM battles WHERE id = ANY($1)', [ids]);
        }

        await this.addBattles(newBattles);
    }

    // --- Tricks ---
    async saveTrick(battleId, skaterId, trickPerformed, role, slotIndex) {
        const res = await this.pool.query(
            `SELECT bs.judging, b.phase FROM battle_skaters bs
             JOIN battles b ON b.id = bs.battle_id
             WHERE bs.battle_id = $1 AND bs.skater_id = $2`,
            [battleId, skaterId]
        );

        if (res.rows.length === 0) return { success: false };

        const row = res.rows[0];
        let judging = row.judging;
        const phase = row.phase;
        const maxSlots = phase === 'Final' ? 5 : 4;

        if (!judging[role]) {
            judging[role] = new Array(maxSlots).fill(null);
        }
        while (judging[role].length < maxSlots) {
            judging[role].push(null);
        }

        // Scoring Logic
        if (trickPerformed.isFail) {
            trickPerformed.finalScore = 0;
            trickPerformed.stopBonus = 0;
            trickPerformed.distanceBonus = 0;
        } else if (trickPerformed.baseScore !== undefined) {
            const stopBonus = this.getStopBonus(trickPerformed);
            const adjustment = parseFloat(trickPerformed.adjustment) || 0;
            const distance = parseFloat(trickPerformed.distance) || 2.5;
            const distanceBonus = Math.max(0, Math.floor((distance - 2.5) / 0.5) * 1);
            const finalScore = (trickPerformed.baseScore || 0) + adjustment + distanceBonus + stopBonus;

            trickPerformed.stopBonus = stopBonus;
            trickPerformed.distanceBonus = distanceBonus;
            trickPerformed.finalScore = Math.max(0, Math.round(finalScore * 100) / 100);
        } else {
            trickPerformed.finalScore = 0;
            trickPerformed.stopBonus = 0;
            trickPerformed.distanceBonus = 0;
        }

        trickPerformed.judgeRole = role;
        judging[role][slotIndex] = trickPerformed;

        const totalScore = this.calculateTotalScore(judging, phase);

        await this.pool.query(
            `UPDATE battle_skaters SET judging = $1, total_score = $2
             WHERE battle_id = $3 AND skater_id = $4`,
            [JSON.stringify(judging), totalScore, battleId, skaterId]
        );

        return { success: true, judging, totalScore };
    }

    async deleteTrick(battleId, skaterId, slotIndex, role) {
        const res = await this.pool.query(
            `SELECT bs.judging, b.phase FROM battle_skaters bs
             JOIN battles b ON b.id = bs.battle_id
             WHERE bs.battle_id = $1 AND bs.skater_id = $2`,
            [battleId, skaterId]
        );

        if (res.rows.length === 0) return null;

        let judging = res.rows[0].judging;
        const phase = res.rows[0].phase;
        if (!judging[role]) return null;

        judging[role][slotIndex] = null;
        const totalScore = this.calculateTotalScore(judging, phase);

        await this.pool.query(
            'UPDATE battle_skaters SET judging = $1, total_score = $2 WHERE battle_id = $3 AND skater_id = $4',
            [JSON.stringify(judging), totalScore, battleId, skaterId]
        );

        return { judging, totalScore };
    }

    async finishBattle(battleId) {
        const res = await this.pool.query('SELECT id FROM battles WHERE id = $1', [battleId]);
        if (res.rows.length === 0) return false;

        const skaters = await this.getBattleSkaters(battleId);
        skaters.sort((a, b) => b.totalScore - a.totalScore);

        await this.pool.query('UPDATE battles SET status = $1 WHERE id = $2', ['completed', battleId]);

        for (let i = 0; i < skaters.length; i++) {
            await this.pool.query(
                'UPDATE battle_skaters SET qualified = $1 WHERE battle_id = $2 AND skater_id = $3',
                [i < 2 ? 1 : 0, battleId, skaters[i].skaterId]
            );
        }

        return true;
    }

    // --- Restore / Reset ---
    async restoreDB(fullDB) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM battle_skaters');
            await client.query('DELETE FROM battles');
            await client.query('DELETE FROM skaters');
            await client.query('DELETE FROM categories');

            for (const cat of fullDB.categories || []) {
                await client.query('INSERT INTO categories (id, name) VALUES ($1, $2)', [cat.id, cat.name]);
            }
            for (const s of fullDB.skaters || []) {
                await client.query(
                    `INSERT INTO skaters (id, first_name, last_name, category_id, seed_number, external_id, nationality)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [s.id, s.firstName, s.lastName, s.categoryId, s.seedNumber || 0, s.externalId || null, s.nationality || 'CL']
                );
            }
            for (const b of fullDB.battles || []) {
                await client.query(
                    `INSERT INTO battles (id, category_id, phase, heat_number, status)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [b.id, b.categoryId, b.phase, b.heatNumber, b.status || 'pending']
                );
                for (const s of b.skaters || []) {
                    await client.query(
                        `INSERT INTO battle_skaters (battle_id, skater_id, judging, total_score, qualified)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [b.id, s.skaterId, s.judging || {}, s.totalScore || 0, s.qualified ? 1 : 0]
                    );
                }
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async resetDB() {
        await this.pool.query('DELETE FROM battle_skaters');
        await this.pool.query('DELETE FROM battles');
        await this.pool.query('DELETE FROM skaters');
        await this.pool.query('DELETE FROM categories');
        await this.seedCategories();
    }

    // --- Scoring helpers ---
    getFamilyShort(familyName) {
        if (!familyName) return '';
        const match = familyName.match(/^(F\d+)/);
        return match ? match[1] : '';
    }

    getStopBonus(trick) {
        if (!trick || trick.isFail || !trick.stopLevel) return 0;
        const stopBonuses = { 0: 0, 1: 2.0, 2: 4.0, 3: 6.0 };
        return stopBonuses[trick.stopLevel] || 0;
    }

    getVarietyMultiplier(validTricks) {
        if (!validTricks || validTricks.length === 0) return 0.0;
        const families = new Set(validTricks.map(t => this.getFamilyShort(t.family)));
        const numFamilies = families.size;
        if (numFamilies === 1) return 1.00;
        if (numFamilies === 2) return 1.00;
        if (numFamilies === 3) return 1.05;
        return 1.10;
    }

    calculateJudgeScore(judging, role, phase) {
        const tricks = judging[role] || [];
        const validTricks = tricks.filter(t => t !== null && !t.isFail && t.finalScore > 0);
        if (validTricks.length === 0) return 0;

        let scores = validTricks.map(t => t.finalScore);
        scores.sort((a, b) => b - a);
        const maxToCount = phase === 'Final' ? 4 : 3;
        const topScores = scores.slice(0, maxToCount);
        const topTricksObjects = validTricks.filter(t => topScores.includes(t.finalScore)).slice(0, maxToCount);

        const baseTotal = topScores.reduce((acc, score) => acc + score, 0);
        const m_var = this.getVarietyMultiplier(topTricksObjects);
        return Math.round(baseTotal * m_var * 100) / 100;
    }

    calculateTotalScore(judging, phase) {
        const j1 = this.calculateJudgeScore(judging, 'Juez 1', phase);
        const j2 = this.calculateJudgeScore(judging, 'Juez 2', phase);
        const j3 = this.calculateJudgeScore(judging, 'Juez 3', phase);
        return Math.round(((j1 + j2 + j3) / 3) * 100) / 100;
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = SlideDB;
