/* =========================================
   STORAGE MANAGEMENT (WebSockets)
   Handles Skaters, Battles, and Rules
========================================= */

class SlideStorage {
    constructor() {
        this.socket = io();
        this.localData = {
            skaters: [],
            battles: [],
            categories: []
        };
        this.currentRole = null;

        // Listeners for Server State
        this.socket.on('init', (data) => {
            this.localData = data.db;
            if (window.renderDashboard) {
                // Initial render once DB load
                try {
                    if (window.populateCategories) window.populateCategories();
                    if (window.populateTricks) window.populateTricks();
                    renderDashboard();
                    renderSkaters();
                } catch (e) { }
            }
        });

        this.socket.on('db-update', (newDB) => {
            this.localData = newDB;
            // Force re-renders if available in window scope
            if (window.renderDashboard) {
                if (window.populateCategories) window.populateCategories();
                renderDashboard();
                renderSkaters();

                // Si la vista de batallas está activa, renderizarla. 
                const viewBattles = document.getElementById('view-battles');
                if (viewBattles && viewBattles.classList.contains('active')) {
                    if (!ui.battlesCategorySelect.value && window.db.getCategories().length > 0) {
                        ui.battlesCategorySelect.value = window.db.getCategories()[0].id;
                    }
                    renderBattles();
                }

                const viewBrackets = document.getElementById('view-brackets');
                if (viewBrackets && viewBrackets.classList.contains('active')) renderBrackets();

                const viewActive = document.getElementById('view-active-battle');
                if (viewActive && viewActive.classList.contains('active')) renderActiveBattle();
            }
        });

        this.socket.on('force-logout', () => {
            this.currentRole = null;
            alert('Tu sesión ha iniciado en otro dispositivo o ha sido reiniciada.');
            location.reload();
        });

        this.socket.on('focus-battle', (battleId) => {
            // Ir a la batalla activa automáticamente si no somos Juez 1
            if (this.currentRole !== 'Juez 1') {
                if (typeof window.openBattle === 'function') {
                    window.openBattle(battleId, true);
                }
            }
        });
    }

    // Role Methods (Async callback via Socket.io)
    login(role, username, password, callback) {
        // Si no se proveen credenciales, usar las por defecto según el rol
        const defaultCredentials = {
            'Juez 1': { user: 'Slide', pass: 'slide2026' },
            'Juez 2': { user: 'juez2', pass: 'slide' },
            'Juez 3': { user: 'juez3', pass: 'slide' }
        };

        const creds = username && password
            ? { role, username, password }
            : {
                role,
                username: defaultCredentials[role]?.user || role.toLowerCase().replace(' ', ''),
                password: defaultCredentials[role]?.pass || 'slide'
            };

        this.socket.emit('login', creds, (res) => {
            if (res.success) {
                this.currentRole = role;
                this.localData = res.db;
                callback(true);
            } else {
                callback(false, res.message);
            }
        });
    }

    logout() {
        this.socket.emit('logout');
        this.currentRole = null;
    }

    // --- SKATERS ---
    getSkaters() { return this.localData.skaters || []; }

    addSkater(firstName, lastName, categoryId, seedNumber, externalId = '', nationality = '', callback) {
        const newSkater = {
            id: Date.now() + Math.floor(Math.random() * 10000000),
            firstName,
            lastName,
            categoryId,
            seedNumber: parseInt(seedNumber) || 0,
            externalId: externalId,
            nationality: nationality
        };

        // Actualizar localmente PRIMERO para que la UI se actualice inmediatamente
        if (!this.localData.skaters) this.localData.skaters = [];
        this.localData.skaters.push(newSkater);

        // Emitir al servidor con callback
        console.log('[STORAGE] Emitiendo add-skater:', newSkater);
        this.socket.emit('add-skater', newSkater, (response) => {
            console.log('[STORAGE] Recibida respuesta add-skater:', response);
            if (callback) callback(response);
            if (!response || !response.success) {
                // Si falló, revertir el cambio local
                this.localData.skaters = this.localData.skaters.filter(s => s.id != newSkater.id);
                if (window.renderSkaters) renderSkaters();
            }
        });
        return newSkater;
    }

    deleteSkater(id) {
        // Actualizar localmente PRIMERO
        if (this.localData.skaters) {
            this.localData.skaters = this.localData.skaters.filter(s => s.id != id);
        }
        // Eliminar también de las batallas locales
        if (this.localData.battles) {
            this.localData.battles.forEach(battle => {
                if (battle.skaters) {
                    battle.skaters = battle.skaters.filter(s => s.skaterId != id);
                }
            });
        }

        this.socket.emit('delete-skater', id);
        return true;
    }

    importSkaters(arr) {
        this.socket.emit('import-skaters', arr);
    }

    // --- CATEGORIES ---
    getCategories() { return this.localData.categories || []; }

    // --- BATTLES & HEATS ---
    getBattles() { return this.localData.battles || []; }

    getBattlesByCategory(categoryId) {
        return this.getBattles().filter(b => b.categoryId === categoryId);
    }

    getStats() {
        const db = this.localData;
        if (!db.skaters) return { totalSkaters: 0, totalBattles: 0, completedBattles: 0, pendingBattles: 0 };
        return {
            totalSkaters: db.skaters.length,
            totalBattles: db.battles.length,
            completedBattles: db.battles.filter(b => b.status === 'completed').length,
            pendingBattles: db.battles.filter(b => b.status !== 'completed').length
        };
    }

    _calculateHeatSizes(n) {
        if (n <= 5) return [n];
        const k = Math.floor(n / 4);
        const rem = n % 4;
        if (rem === 0) return Array(k).fill(4);
        if (rem === 3) return [...Array(k).fill(4), 3];
        if (rem === 2) return [...Array(k - 1).fill(4), 3, 3];
        if (rem === 1) return [...Array(k - 2).fill(4), 3, 3, 3];
        return [n];
    }

    generateHeats(categoryId) {
        let skaters = this.getSkaters().filter(s => s.categoryId === categoryId);
        if (skaters.length === 0) return [];

        skaters.sort((a, b) => {
            if (a.seedNumber === 0 && b.seedNumber > 0) return 1;
            if (b.seedNumber === 0 && a.seedNumber > 0) return -1;
            return a.seedNumber - b.seedNumber;
        });

        const n = skaters.length;

        // Si hay 3 o 4 participantes, es Final directa
        if (n === 3 || n === 4) {
            let newBattles = [];
            newBattles.push({
                id: Date.now(),
                categoryId: categoryId,
                phase: 'Final',
                heatNumber: 1,
                status: 'pending',
                skaters: skaters.map(m => ({
                    skaterId: m.id,
                    slides: [],
                    totalScore: 0,
                    qualified: false
                }))
            });

            this.socket.emit('generate-heats', { categoryId, newBattles });
            return newBattles;
        }

        const sizes = this._calculateHeatSizes(n);
        const g = sizes.length;

        let buckets = sizes.map(size => ({ maxSize: size, members: [] }));
        let dir = 1; let c = 0;

        for (let i = 0; i < n; i++) {
            while (buckets[c].members.length >= buckets[c].maxSize) {
                c += dir;
                if (c >= g) { c = g - 1; dir = -1; }
                else if (c < 0) { c = 0; dir = 1; }
            }
            buckets[c].members.push(skaters[i]);
            c += dir;
            if (c >= g) { c = g - 1; dir = -1; }
            else if (c < 0) { c = 0; dir = 1; }
        }

        const wsBracketOrder = {
            1: [0], 2: [0, 1], 3: [0, 2, 1], 4: [0, 3, 2, 1],
            5: [0, 4, 2, 3, 1], 6: [0, 4, 3, 2, 5, 1],
            7: [0, 6, 3, 4, 2, 5, 1], 8: [0, 7, 3, 4, 2, 5, 6, 1]
        };

        const order = wsBracketOrder[g] || Array.from({ length: g }, (_, i) => i);
        let finalGroups = order.map(idx => buckets[idx]);

        let newBattles = [];
        finalGroups.forEach((grp, idx) => {
            if (!grp) return;
            newBattles.push({
                id: Date.now() + idx + Math.floor(Math.random() * 1000),
                categoryId: categoryId,
                phase: 'Preliminar',
                heatNumber: idx + 1,
                status: 'pending',
                skaters: grp.members.map(m => ({
                    skaterId: m.id,
                    slides: [],
                    totalScore: 0,
                    qualified: false
                }))
            });
        });

        this.socket.emit('generate-heats', { categoryId, newBattles });
        return newBattles;
    }

    // --- TRICKS & JUDGING ---
    getTricks() {
        return [
            // --- F1 - Interior ---
            // Nivel E (10-19)
            { id: 'f1-e4', name: 'Soul', family: 'F1 - Interior', baseScore: 10 },
            { id: 'f1-e5', name: 'Powerslide', family: 'F1 - Interior', baseScore: 11 },
            { id: 'f1-e2', name: 'Heel/Toe Soul', family: 'F1 - Interior', baseScore: 12 },
            { id: 'f1-e3', name: '5W Powerslide', family: 'F1 - Interior', baseScore: 13 },
            { id: 'f1-e1', name: '2W Powerslide', family: 'F1 - Interior', baseScore: 14 },
            // Nivel D (20-29)
            { id: 'f1-d1', name: 'Magic', family: 'F1 - Interior', baseScore: 20 },
            { id: 'f1-d2', name: 'Fast Wheel', family: 'F1 - Interior', baseScore: 21 },
            // Nivel C (30-39)
            { id: 'f1-c4', name: 'Heel Fast Wheel', family: 'F1 - Interior', baseScore: 30 },
            { id: 'f1-c5', name: 'Toe Fast Wheel', family: 'F1 - Interior', baseScore: 31 },
            { id: 'f1-c2', name: 'Heel Toe Magic', family: 'F1 - Interior', baseScore: 32 },
            { id: 'f1-c1', name: 'Heel Heel Magic', family: 'F1 - Interior', baseScore: 33 },
            { id: 'f1-c3', name: 'Toe Toe Magic', family: 'F1 - Interior', baseScore: 34 },
            // Nivel B (40-49)
            { id: 'f1-b1', name: 'Fast Slide', family: 'F1 - Interior', baseScore: 40 },
            // Nivel A (50-59)
            { id: 'f1-a3', name: 'Heel Toe Cowboy', family: 'F1 - Interior', baseScore: 50 },
            { id: 'f1-a4', name: 'Heel/Toe Backslide', family: 'F1 - Interior', baseScore: 51 },
            { id: 'f1-a1', name: 'Heel Fast', family: 'F1 - Interior', baseScore: 52 },
            { id: 'f1-a2', name: 'Toe Fast', family: 'F1 - Interior', baseScore: 53 },

            // --- F2 - Exterior ---
            // Nivel E (10-19)
            { id: 'f2-e2', name: 'Royal Barrow', family: 'F2 - Exterior', baseScore: 10 },
            { id: 'f2-e3', name: 'Wheel Barrow', family: 'F2 - Exterior', baseScore: 11 },
            { id: 'f2-e4', name: 'Acid Toe', family: 'F2 - Exterior', baseScore: 12 },
            { id: 'f2-e5', name: 'Cross Acid', family: 'F2 - Exterior', baseScore: 13 },
            { id: 'f2-e7', name: '5W Acid', family: 'F2 - Exterior', baseScore: 14 },
            { id: 'f2-e8', name: 'Acid', family: 'F2 - Exterior', baseScore: 15 },
            { id: 'f2-e1', name: 'Cross Acid Toe', family: 'F2 - Exterior', baseScore: 16 },
            { id: 'f2-e6', name: 'Mistrial', family: 'F2 - Exterior', baseScore: 17 },
            // Nivel D (20-29)
            { id: 'f2-d1', name: '2W Cross Acid', family: 'F2 - Exterior', baseScore: 20 },
            { id: 'f2-d2', name: '2W Royal Barrow', family: 'F2 - Exterior', baseScore: 21 },
            { id: 'f2-d3', name: '2W Wheel Barrow', family: 'F2 - Exterior', baseScore: 22 },
            { id: 'f2-d4', name: '2W Acid', family: 'F2 - Exterior', baseScore: 23 },
            // Nivel C (30-39)
            // Nivel B (40-49)
            { id: 'f2-b1', name: 'Cowboy', family: 'F2 - Exterior', baseScore: 40 },
            { id: 'f2-b2', name: 'Backslide', family: 'F2 - Exterior', baseScore: 41 },
            // Nivel A (50-59)
            { id: 'f2-a5', name: 'Heel/Toe Backslide', family: 'F2 - Exterior', baseScore: 50 },
            { id: 'f2-a6', name: '4W Torque', family: 'F2 - Exterior', baseScore: 51 },
            { id: 'f2-a3', name: 'Heel Toe Cowboy', family: 'F2 - Exterior', baseScore: 52 },
            { id: 'f2-a4', name: '1W Torque', family: 'F2 - Exterior', baseScore: 53 },
            { id: 'f2-a1', name: 'Heel Heel Cowboy', family: 'F2 - Exterior', baseScore: 54 },
            { id: 'f2-a2', name: 'Toe Toe Cowboy', family: 'F2 - Exterior', baseScore: 55 },

            // --- F3 - De Frente ---
            // Nivel E (10-19)
            { id: 'f3-e1', name: 'Snowplow', family: 'F3 - De Frente', baseScore: 10 },
            // Nivel D (20-29)
            // Nivel C (30-39)
            { id: 'f3-c4', name: 'UFO', family: 'F3 - De Frente', baseScore: 30 },
            { id: 'f3-c1', name: '2W Snowplow', family: 'F3 - De Frente', baseScore: 31 },
            { id: 'f3-c3', name: 'UFO Special', family: 'F3 - De Frente', baseScore: 32 },
            { id: 'f3-c2', name: '2W UFO', family: 'F3 - De Frente', baseScore: 33 },
            // Nivel B (40-49)
            { id: 'f3-b2', name: 'Cross UFO', family: 'F3 - De Frente', baseScore: 40 },
            { id: 'f3-b4', name: 'Eagle', family: 'F3 - De Frente', baseScore: 41 },
            { id: 'f3-b1', name: '2W UFO Special', family: 'F3 - De Frente', baseScore: 42 },
            { id: 'f3-b3', name: '2W Eagle', family: 'F3 - De Frente', baseScore: 43 },
            // Nivel A (50-59)
            { id: 'f3-a7', name: '8 Cross', family: 'F3 - De Frente', baseScore: 50 },
            { id: 'f3-a3', name: 'Heel Toe 8 Cross', family: 'F3 - De Frente', baseScore: 51 },
            { id: 'f3-a6', name: 'Heel Toe Cross UFO', family: 'F3 - De Frente', baseScore: 52 },
            { id: 'f3-a1', name: 'Heel Heel 8 Cross', family: 'F3 - De Frente', baseScore: 53 },
            { id: 'f3-a2', name: 'Toe Toe 8 Cross', family: 'F3 - De Frente', baseScore: 54 },
            { id: 'f3-a4', name: 'Heel Heel Cross UFO', family: 'F3 - De Frente', baseScore: 55 },
            { id: 'f3-a5', name: 'Toe Toe Cross UFO', family: 'F3 - De Frente', baseScore: 56 },

            // --- F4 - De Espaldas ---
            // Nivel E (10-19)
            { id: 'f4-e3', name: 'Back Snowplow', family: 'F4 - De Espaldas', baseScore: 10 },
            { id: 'f4-e4', name: 'P-Star', family: 'F4 - De Espaldas', baseScore: 11 },
            { id: 'f4-e1', name: '5W P-Star', family: 'F4 - De Espaldas', baseScore: 12 },
            { id: 'f4-e2', name: '8W Soyale', family: 'F4 - De Espaldas', baseScore: 13 },
            // Nivel D (20-29)
            { id: 'f4-d3', name: 'Soyale', family: 'F4 - De Espaldas', baseScore: 20 },
            { id: 'f4-d1', name: '2W Back Snowplow', family: 'F4 - De Espaldas', baseScore: 21 },
            { id: 'f4-d2', name: '2W P-Star', family: 'F4 - De Espaldas', baseScore: 22 },
            // Nivel C (30-39)
            { id: 'f4-c1', name: 'Heel Ernsui', family: 'F4 - De Espaldas', baseScore: 30 },
            { id: 'f4-c2', name: 'Toe Ernsui', family: 'F4 - De Espaldas', baseScore: 31 },
            { id: 'f4-c3', name: 'Heel Soyale', family: 'F4 - De Espaldas', baseScore: 32 },
            { id: 'f4-c4', name: 'Toe Soyale', family: 'F4 - De Espaldas', baseScore: 33 },
            { id: 'f4-c5', name: 'Ernsui', family: 'F4 - De Espaldas', baseScore: 34 },
            // Nivel B (40-49)
            { id: 'f4-b1', name: 'Cross Ernsui', family: 'F4 - De Espaldas', baseScore: 40 },
            // Nivel A (50-59)
            { id: 'f4-a2', name: 'Butterfly', family: 'F4 - De Espaldas', baseScore: 50 },
            { id: 'f4-a5', name: 'Cross V', family: 'F4 - De Espaldas', baseScore: 51 },
            { id: 'f4-a6', name: 'V Flat', family: 'F4 - De Espaldas', baseScore: 52 },
            { id: 'f4-a7', name: 'Heel Cross Ernsui', family: 'F4 - De Espaldas', baseScore: 53 },
            { id: 'f4-a8', name: 'Toe Cross Ernsui', family: 'F4 - De Espaldas', baseScore: 54 },
            { id: 'f4-a3', name: 'V Heel Toe', family: 'F4 - De Espaldas', baseScore: 55 },
            { id: 'f4-a4', name: 'V Toe Toe', family: 'F4 - De Espaldas', baseScore: 56 },
            { id: 'f4-a1', name: '2W Butterfly', family: 'F4 - De Espaldas', baseScore: 57 },

            // --- F5 - Laterales ---
            // Nivel E (10-19)
            // Nivel D (20-29)
            { id: 'f5-d1', name: 'Unity / Savannah', family: 'F5 - Laterales', baseScore: 20 },
            { id: 'f5-d2', name: 'Parallel', family: 'F5 - Laterales', baseScore: 21 },
            // Nivel C (30-39)
            { id: 'f5-c2', name: 'Cross Parallel', family: 'F5 - Laterales', baseScore: 30 },
            { id: 'f5-c3', name: '2W Parallel', family: 'F5 - Laterales', baseScore: 31 },
            { id: 'f5-c1', name: '2W Unity / Savannah', family: 'F5 - Laterales', baseScore: 32 },
            // Nivel B (40-49)
            { id: 'f5-b1', name: '8W Torque', family: 'F5 - Laterales', baseScore: 40 },
            // Nivel A (50-59)
            { id: 'f5-a4', name: 'Supercross Parallel', family: 'F5 - Laterales', baseScore: 50 },
            { id: 'f5-a8', name: 'Heel Toe Cross Parallel', family: 'F5 - Laterales', baseScore: 51 },
            { id: 'f5-a3', name: 'Heel Supercross Parallel', family: 'F5 - Laterales', baseScore: 52 },
            { id: 'f5-a5', name: '2W Torque', family: 'F5 - Laterales', baseScore: 53 },
            { id: 'f5-a6', name: 'Heel Heel Cross Parallel', family: 'F5 - Laterales', baseScore: 54 },
            { id: 'f5-a7', name: 'Toe Toe Cross Parallel', family: 'F5 - Laterales', baseScore: 55 },
            { id: 'f5-a1', name: 'Heel Heel Supercross Parallel', family: 'F5 - Laterales', baseScore: 56 },
            { id: 'f5-a2', name: 'Toe Toe Supercross Parallel', family: 'F5 - Laterales', baseScore: 57 }
        ];
    }

    saveTrick(battleId, skaterId, trickId, adjustment, slotIndex, isFail = false, distance = 2.5, stopLevel = 0, isCombo = false, trickId2 = '') {
        if (!this.currentRole) return false;

        const allTricks = this.getTricks();
        const trick = allTricks.find(t => t.id === trickId);
        const trick2 = isCombo ? allTricks.find(t => t.id === trickId2) : null;

        if (!trick && !isFail) return false;

        let trickName = isFail ? 'Falla' : trick.name;
        if (isCombo && trick2) {
            trickName = `${trick.name} + ${trick2.name}`;
        }

        const trickPerformed = {
            trickId,
            name: trickName,
            family: trick ? trick.family : '',
            baseScore: trick ? trick.baseScore : 0,
            adjustment: parseFloat(adjustment) || 0,
            distance: parseFloat(distance) || 2.5,
            stopLevel: parseInt(stopLevel) || 0,
            isFail: isFail,
            isCombo: isCombo,
            trickId2: trickId2,
            baseScore2: trick2 ? trick2.baseScore : 0
        };

        this.socket.emit('save-trick', {
            battleId,
            skaterId,
            trickPerformed,
            role: this.currentRole,
            slotIndex
        });

        return true;
    }

    deleteTrick(battleId, skaterId, slotIndex) {
        if (!this.currentRole) return false;
        this.socket.emit('delete-trick', { battleId, skaterId, slotIndex, role: this.currentRole });
        return true;
    }

    finishBattle(battleId, callback) {
        this.socket.emit('finish-battle', battleId, (res) => {
            if (callback) callback(res);
        });
    }

    generateNextPhase(categoryId) {
        const battles = this.getBattlesByCategory(categoryId);

        // Detectar fase actual (soporta español e inglés)
        let currentPhase = 'Preliminar';
        if (battles.some(b => b.phase === 'Final')) return false;
        if (battles.some(b => b.phase === 'Semifinal' || b.phase === 'Semi-Final')) currentPhase = 'Semifinal';
        else if (battles.some(b => b.phase === 'Cuartos' || b.phase === 'Quarter-Final')) currentPhase = 'Cuartos';
        else if (battles.some(b => b.phase === 'Preliminar')) currentPhase = 'Preliminar';

        const phaseBattles = battles.filter(b => b.phase === currentPhase);
        if (phaseBattles.length === 0 || phaseBattles.some(b => b.status !== 'completed')) return false;

        let advancedSkaterIds = [];
        phaseBattles.forEach(b => {
            const qualified = b.skaters.filter(s => s.qualified).map(s => s.skaterId);
            advancedSkaterIds.push(...qualified);
        });

        // Determinar siguiente fase
        let nextPhase = 'Final';
        if (advancedSkaterIds.length > 8) {
            if (currentPhase === 'Preliminar') nextPhase = 'Cuartos';
            else if (currentPhase === 'Cuartos') nextPhase = 'Semifinal';
            else nextPhase = 'Final';
        } else if (advancedSkaterIds.length > 4) {
            if (currentPhase === 'Preliminar' || currentPhase === 'Cuartos') nextPhase = 'Semifinal';
            else nextPhase = 'Final';
        } else if (advancedSkaterIds.length > 2) {
            nextPhase = 'Final';
        } else {
            return false; // No hay suficientes para otra fase
        }

        const sizes = this._calculateHeatSizes(advancedSkaterIds.length);
        let groups = sizes.map(size => ({ maxSize: size, members: [] }));

        let currentGroup = 0;
        advancedSkaterIds.forEach(id => {
            if (groups[currentGroup].members.length >= groups[currentGroup].maxSize) {
                if (currentGroup < groups.length - 1) currentGroup++;
            }
            groups[currentGroup].members.push(id);
        });

        let newBattles = [];
        groups.forEach((grp, idx) => {
            newBattles.push({
                id: Date.now() + idx,
                categoryId: categoryId,
                phase: nextPhase,
                heatNumber: idx + 1,
                status: 'pending',
                skaters: grp.members.map(skId => ({
                    skaterId: skId,
                    slides: [],
                    totalScore: 0,
                    qualified: false,
                    judging: {
                        'Juez 1': nextPhase === 'Final' ? new Array(5).fill(null) : new Array(4).fill(null),
                        'Juez 2': nextPhase === 'Final' ? new Array(5).fill(null) : new Array(4).fill(null),
                        'Juez 3': nextPhase === 'Final' ? new Array(5).fill(null) : new Array(4).fill(null)
                    }
                }))
            });
        });

        this.socket.emit('generate-next-phase', newBattles);
        return true;
    }

    // --- BACKUP ---
    export() {
        return JSON.stringify(this.localData, null, 2);
    }

    saveDB(jsonStringOrObject) {
        this.socket.emit('restore-db', jsonStringOrObject);
    }

    resetDB() {
        this.socket.emit('reset-db');
    }

    getDB() {
        return this.localData;
    }
}

window.db = new SlideStorage();
