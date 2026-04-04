/* =========================================
   APP CONTROLLER
   Handles UI interations and rendering
========================================= */

// DOM Elements
const ui = {
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view'),

    // Stats
    statSkaters: document.getElementById('stat-total-skaters'),
    statBattles: document.getElementById('stat-total-battles'),

    // Skaters Table
    skatersTbody: document.getElementById('skaters-tbody'),
    btnAddSkater: document.getElementById('btn-add-skater'),

    // Modals & Forms
    modalSkater: document.getElementById('modal-skater'),
    formSkater: document.getElementById('form-skater'),
    categorySelect: document.getElementById('skater-category'),

    // Battles View
    battlesCategorySelect: document.getElementById('battles-category-filter'),
    btnGenerateHeats: document.getElementById('btn-generate-heats'),
    battlesContainer: document.getElementById('battles-container'),

    // Brackets View
    bracketsCategorySelect: document.getElementById('brackets-category-filter'),
    bracketContainer: document.getElementById('bracket-container'),

    // Active Battle & Judge
    viewActiveBattle: document.getElementById('view-active-battle'),
    activeBattleGrid: document.getElementById('active-battle-grid'),
    btnBackBattles: document.getElementById('btn-back-battles'),
    btnFinishBattle: document.getElementById('btn-finish-battle'),
    modalJudge: document.getElementById('modal-judge'),
    formJudge: document.getElementById('form-judge'),
    judgeTrickSelect: document.getElementById('judge-trick-select'),
    judgeTrickSearch: document.getElementById('judge-trick-search'),

    // Sidebar DB Actions
    btnExportDB: document.getElementById('btn-export-db'),
    inputImportDB: document.getElementById('input-import-db'),
    btnResetDB: document.getElementById('btn-reset-db'),
    btnExportReport: document.getElementById('btn-export-report'),
    btnRestartServer: document.getElementById('btn-restart-server'),

    // Bulk Import
    btnImportBulk: document.getElementById('btn-import-bulk'),
    modalBulk: document.getElementById('modal-bulk'),
    formBulk: document.getElementById('form-bulk'),
    bulkData: document.getElementById('bulk-data'),
    bulkCategory: document.getElementById('bulk-category'),

    // Auth
    authScreen: document.getElementById('auth-screen'),
    formAuth: document.getElementById('form-auth'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password'),
    authError: document.getElementById('auth-error'),

    // Login
    loginScreen: document.getElementById('login-screen'),
    mainApp: document.getElementById('main-app'),
    roleBtns: document.querySelectorAll('.role-btn'),
    loginError: document.getElementById('login-error'),

    // User Profile
    currentUserRole: document.getElementById('current-user-role'),
    btnLogout: document.getElementById('btn-logout')
};

let currentBattleId = null;
let currentJudgeSkaterId = null;

function init() {
    setupAuth();
    setupLogin();
    setupNavigation();
    setupEventListeners();
    // Forzar que el navegador no restaure opciones cacheadas al reiniciar la app (F5)
    ui.battlesCategorySelect.value = '';
    ui.bracketsCategorySelect.value = '';
    populateCategories();
    populateTricks();
    setupTrickSearch();
    // Render initially if data is loaded, otherwise storage.js calls these later
    if (window.db && window.db.localData && window.db.localData.categories) {
        renderDashboard();
        renderSkaters();
    }
}

function setupAuth() {
    if (ui.formAuth) {
        ui.formAuth.onsubmit = (e) => {
            e.preventDefault();
            const u = ui.authUsername.value.trim();
            const p = ui.authPassword.value.trim();

            // Determinar rol basado en el nombre de usuario
            let targetRole = null;
            const userLower = u.toLowerCase();

            if (userLower === 'slide' || userLower === 'admin' || userLower === 'juez1') {
                targetRole = 'Juez 1';
            } else if (userLower === 'juez2') {
                targetRole = 'Juez 2';
            } else if (userLower === 'juez3') {
                targetRole = 'Juez 3';
            }

            if (targetRole) {
                // Iniciar sesión con credenciales completas
                window.db.login(targetRole, u, p, (success, msg) => {
                    if (success) {
                        ui.authScreen.style.display = 'none';
                        ui.loginScreen.style.display = 'none';
                        ui.mainApp.style.display = 'flex';
                        ui.currentUserRole.innerText = window.db.currentRole;
                        applyRoleRestrictions();
                    } else {
                        ui.authError.innerText = msg || 'Credenciales incorrectas o rol ya en uso';
                        ui.authError.style.display = 'block';
                    }
                });
            } else {
                ui.authError.innerText = 'Credenciales incorrectas';
                ui.authError.style.display = 'block';
            }
        };
    }
}

function setupLogin() {
    ui.roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role;

            // Credenciales por defecto según el rol
            const defaultCredentials = {
                'Juez 1': { user: 'Slide', pass: 'slide2026' },
                'Juez 2': { user: 'juez2', pass: 'slide' },
                'Juez 3': { user: 'juez3', pass: 'slide' }
            };

            const creds = defaultCredentials[role] || { user: role.toLowerCase().replace(' ', ''), pass: 'slide' };

            window.db.login(role, creds.user, creds.pass, (success, msg) => {
                if (success) {
                    ui.loginScreen.style.display = 'none';
                    ui.mainApp.style.display = 'flex';
                    ui.currentUserRole.innerText = window.db.currentRole;
                    applyRoleRestrictions();
                } else {
                    ui.loginError.innerText = msg || 'Error al conectar';
                    ui.loginError.style.display = 'block';
                }
            });
        });
    });

    if (window.db && window.db.socket) {
        window.db.socket.on('roles-update', (connectedRoles) => {
            ui.roleBtns.forEach(btn => {
                const r = btn.dataset.role;
                if (connectedRoles[r]) {
                    btn.disabled = true;
                    btn.querySelector('span').innerText = r + ' (Ocupado)';
                } else {
                    btn.disabled = false;
                    btn.querySelector('span').innerText = r;
                }
            });
        });
    }

    if (ui.btnLogout) {
        ui.btnLogout.addEventListener('click', () => {
            if (confirm('¿Seguro que deseas salir?')) {
                if (window.db && window.db.socket) {
                    window.db.socket.emit('logout');
                    // Give server a tiny bit of time to process the logout event before reloading
                    setTimeout(() => {
                        location.reload();
                    }, 200);
                } else {
                    location.reload();
                }
            }
        });
    }
}

function applyRoleRestrictions() {
    const role = window.db.currentRole;
    if (role !== 'Juez 1') {
        // Ocultar opciones de admin (skaters, brackets y configuracion)
        ui.navItems.forEach(nav => {
            if (nav.dataset.view === 'skaters' || nav.dataset.view === 'brackets') {
                nav.style.display = 'none';
            }
        });
        document.querySelector('.sidebar-footer').style.display = 'none';
        ui.btnGenerateHeats.style.display = 'none';
    }
}

// Global helper for simple direct navigation
window.navigateTo = function (viewName) {
    const targetNav = Array.from(ui.navItems).find(n => n.dataset.view === viewName);
    // If nav doesn't exist or is explicitly hidden due to role restrictions, abort
    if (!targetNav || targetNav.style.display === 'none') return;

    // Remove active classes
    ui.navItems.forEach(nav => nav.classList.remove('active'));
    ui.views.forEach(view => view.classList.remove('active'));

    // Add active class
    targetNav.classList.add('active');
    const targetViewId = 'view-' + viewName;
    const targetView = document.getElementById(targetViewId);
    if (targetView) targetView.classList.add('active');

    // Call render
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'skaters') renderSkaters();
    if (viewName === 'battles') renderBattles();
    if (viewName === 'brackets') renderBrackets();
};

// Mobile Menu Toggle
const btnMenuToggle = document.getElementById('btn-menu-toggle');
const sidebar = document.getElementById('app-sidebar');

if (btnMenuToggle && sidebar) {
    btnMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });
}

// Navigation Logic
function setupNavigation() {
    // Sidebar items
    ui.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            window.navigateTo(item.dataset.view);
            // Cerrar sidebar en móviles tras navegar
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('show');
            }
        });
    });

    // Dashboard shortcuts (and any other element with data-navigate) using Event Delegation
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-navigate]');
        if (target) {
            e.preventDefault();
            window.navigateTo(target.dataset.navigate);
            // Cerrar sidebar en móviles tras navegar
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('show');
            }
        }
    });
}



// Event Listeners
function setupEventListeners() {
    // Modal Toggles
    ui.btnAddSkater.onclick = () => {
        ui.formSkater.reset();
        ui.modalSkater.classList.remove('hidden');
    };

    document.getElementById('btn-close-skater').onclick = () => ui.modalSkater.classList.add('hidden');
    document.getElementById('btn-cancel-skater').onclick = () => ui.modalSkater.classList.add('hidden');

    // Form Submit
    ui.formSkater.onsubmit = (e) => {
        e.preventDefault();
        const fName = document.getElementById('skater-firstname').value.trim();
        const lName = document.getElementById('skater-lastname').value.trim();
        const catId = ui.categorySelect.value;
        const seed = document.getElementById('skater-seed').value;
        const idCode = document.getElementById('skater-id-code').value.trim();
        const nat = document.getElementById('skater-nationality') ? document.getElementById('skater-nationality').value : '';

        // Validaciones
        if (!fName) {
            showToast('El nombre es obligatorio', true);
            return;
        }
        if (!lName) {
            showToast('El apellido es obligatorio', true);
            return;
        }
        if (!catId) {
            showToast('Debes seleccionar una categoría', true);
            return;
        }

        // Mostrar loading
        showToast('Inscribiendo patinador...');

        window.db.addSkater(fName, lName, catId, seed, idCode, nat, (response) => {
            if (response && response.success) {
                ui.modalSkater.classList.add('hidden');
                ui.formSkater.reset();
                renderSkaters();
                renderDashboard();
                showToast('✓ Patinador inscrito con éxito');
            } else {
                showToast('Error: ' + (response?.message || 'No se pudo inscribir el patinador'), true);
            }
        });
    };

    // Battles Logic
    ui.battlesCategorySelect.onchange = () => {
        renderBattles();
    };

    ui.btnGenerateHeats.onclick = () => {
        const catId = ui.battlesCategorySelect.value;

        if (catId) {
            const skatersCount = window.db.getSkaters().filter(s => s.categoryId === catId).length;
            if (skatersCount < 3) return showToast('Se necesitan al menos 3 patinadores para hacer grupos', true);

            if (confirm(`Se van a recargar todos los grupos para la categoría seleccionada. ¿Estás seguro?`)) {
                window.db.generateHeats(catId);
                showToast('Generando grupos en el servidor...');
            }
        } else {
            const categories = window.db.getCategories();
            let generatedAny = false;
            let insufficientAny = false;

            if (confirm(`Se van a generar los grupos para TODAS las categorías. ¿Estás seguro?`)) {
                categories.forEach(cat => {
                    const skatersCount = window.db.getSkaters().filter(s => s.categoryId === cat.id).length;
                    if (skatersCount >= 3) {
                        window.db.generateHeats(cat.id);
                        generatedAny = true;
                    } else if (skatersCount > 0) {
                        insufficientAny = true;
                    }
                });

                if (generatedAny) {
                    showToast('Generando grupos para todas las categorías...');
                } else {
                    if (insufficientAny) showToast('No hay suficientes patinadores (min 3) en ninguna categoría con inscritos', true);
                    else showToast('No hay patinadores inscritos en ninguna categoría', true);
                }
            }
        }
    };

    // Active Battle / Judge
    ui.btnBackBattles.onclick = () => {
        ui.viewActiveBattle.classList.remove('active');
        document.getElementById('view-battles').classList.add('active');
        renderBattles();
    };

    ui.btnFinishBattle.onclick = () => {
        if (!confirm('¿Estás seguro de finalizar esta batalla? Esto calculará los ganadores y bloqueará la edición.')) return;

        window.db.finishBattle(currentBattleId, (res) => {
            if (res && res.success) {
                // Obtener datos de la batalla para verificar si es Final
                const db = window.db.getDB();
                const battle = db.battles.find(b => b.id === currentBattleId);

                ui.viewActiveBattle.classList.remove('active');
                document.getElementById('view-battles').classList.add('active');
                renderBattles();

                // Si es una Final, lanzar confetti
                if (battle && battle.phase === 'Final') {
                    setTimeout(() => {
                        launchConfetti();
                        showToast('¡Batalla finalizada! 🎉 ¡Tenemos un ganador!');
                    }, 500);
                } else {
                    showToast('Batalla finalizada, ganadores calculados');
                }
            } else {
                showToast(res?.message || 'Error al finalizar batalla', true);
            }
        });
    };

    document.getElementById('btn-close-judge').onclick = () => ui.modalJudge.classList.add('hidden');
    document.getElementById('btn-cancel-judge').onclick = () => ui.modalJudge.classList.add('hidden');

    ui.formJudge.onsubmit = (e) => {
        e.preventDefault();
        const trickId = ui.judgeTrickSelect.value;
        const isFail = document.getElementById('judge-is-fail').checked;

        if (!trickId && !isFail) {
            return showToast('Selecciona un truco o marca como falla', true);
        }

        const adjustment = document.getElementById('judge-adjustment').value;
        const distance = document.getElementById('judge-distance').value;
        const slotIdx = parseInt(document.getElementById('judge-slot-index').value);

        // Obtener nivel de stop seleccionado
        const stopLevel = parseInt(document.querySelector('input[name="judge-stop-level"]:checked')?.value || 0);

        if (window.db.saveTrick(currentBattleId, currentJudgeSkaterId, trickId, adjustment, slotIdx, isFail, distance, stopLevel)) {
            ui.modalJudge.classList.add('hidden');
            renderActiveBattle();
            showToast('Truco registrado' + (stopLevel > 0 ? ` con Stop Nivel ${stopLevel}` : ''));
        } else {
            showToast('Error al registrar', true);
        }
    };

    const distanceSlider = document.getElementById('judge-distance');
    const distanceVal = document.getElementById('judge-distance-val');
    if (distanceSlider && distanceVal) {
        distanceSlider.oninput = (e) => {
            distanceVal.innerText = e.target.value + 'm';
        };
    }

    // Brackets Logic
    ui.bracketsCategorySelect.onchange = () => {
        renderBrackets();
    };

    // DB Actions
    ui.btnExportDB.onclick = () => {
        const data = window.db.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slide_battle_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Base de datos respaldada con éxito.');
    };

    ui.inputImportDB.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (json.skaters && json.categories && json.battles) {
                    window.db.saveDB(json);
                    showToast('Base de datos restaurada con éxito. Recargando...');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showToast('Formato de archivo inválido.', true);
                }
            } catch (err) {
                showToast('Error al leer el archivo JSON.', true);
            }
        };
        reader.readAsText(file);
    };

    ui.btnResetDB.onclick = () => {
        const password = prompt('⚠️ PELIGRO: Esto ELIMINARÁ TODOS los datos de la competencia.\nPara confirmar, escribe "ELIMINAR":');
        if (password === 'ELIMINAR') {
            window.db.resetDB();
            showToast('Base de datos eliminada. Recargando...', true);
            setTimeout(() => location.reload(), 1500);
        } else if (password !== null) {
            showToast('Confirmación incorrecta. Acción cancelada.', true);
        }
    };

    ui.btnExportReport.onclick = () => {
        exportTournamentCSV();
    };

    ui.btnRestartServer.onclick = () => {
        if (confirm('¿Reiniciar el servidor? La conexión se perderá por unos segundos.')) {
            window.db.socket.emit('restart-server');
            showToast('Enviando señal de reinicio...', true);
        }
    };


    // Bulk Import Logic
    ui.btnImportBulk.onclick = () => {
        ui.formBulk.reset();
        const cats = window.db.getCategories();
        ui.bulkCategory.innerHTML = '<option value="">Seleccionar categoría...</option>';
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.name;
            ui.bulkCategory.appendChild(opt);
        });
        ui.modalBulk.classList.remove('hidden');
    };

    document.getElementById('btn-close-bulk').onclick = () => ui.modalBulk.classList.add('hidden');
    document.getElementById('btn-cancel-bulk').onclick = () => ui.modalBulk.classList.add('hidden');

    ui.formBulk.onsubmit = (e) => {
        e.preventDefault();
        const raw = ui.bulkData.value.trim();
        const catId = ui.bulkCategory.value;
        if (!raw || !catId) return showToast('Completa todos los campos', true);

        const lines = raw.split('\n');
        let count = 0;

        lines.forEach(line => {
            if (!line.trim()) return;

            // Soporta Tab, Coma o Punto y coma como separadores
            const cols = line.split(/\t|;|,(?![^"]*")/).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) return;

            // Formato esperado: 0:Rank | 1:Nombre Completo | 2:Nacionalidad | 3:ID/WSSA
            let rank = parseInt(cols[0]);
            let fullName = cols[1];
            let nationality = cols[2] || 'CL'; // Default to CL if not provided
            let idCode = cols[3] || '';

            if (fullName) {
                // Limpieza de nombre (quitar Rank si se coló en el nombre)
                if (!isNaN(parseInt(fullName.split(' ')[0]))) {
                    fullName = fullName.split(' ').slice(1).join(' ');
                }

                const nameParts = fullName.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || ' ';

                // Si el rank no es válido, intentar usar el índice o 0
                if (isNaN(rank)) rank = count + 1;

                window.db.addSkater(firstName, lastName, catId, rank, idCode, nationality);
                count++;
            }
        });

        if (count > 0) {
            ui.modalBulk.classList.add('hidden');
            renderSkaters();
            renderDashboard();
            showToast(`${count} patinadores importados con éxito.`);
        } else {
            showToast('No se pudieron procesar los datos. Revisa el formato (Rank; Nombre; Nat; ID)', true);
        }
    };
}

function populateCategories() {
    const cats = window.db.getCategories();

    // Guardar selección actual para no perderla al actualizar
    const currentBattlesCat = ui.battlesCategorySelect.value;
    const currentBracketsCat = ui.bracketsCategorySelect.value;

    ui.categorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
    ui.battlesCategorySelect.innerHTML = '<option value="">Todas las categorías</option>';
    ui.bracketsCategorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';

    cats.forEach(c => {
        // Form Modal
        const opt1 = document.createElement('option');
        opt1.value = c.id;
        opt1.innerText = c.name;
        ui.categorySelect.appendChild(opt1);

        // Battles Filter
        const opt2 = document.createElement('option');
        opt2.value = c.id;
        opt2.innerText = c.name;
        ui.battlesCategorySelect.appendChild(opt2);

        // Brackets Filter
        const opt3 = document.createElement('option');
        opt3.value = c.id;
        opt3.innerText = c.name;
        ui.bracketsCategorySelect.appendChild(opt3);
    });

    // Restaurar selección si existía y sigue siendo válida
    if (currentBattlesCat) ui.battlesCategorySelect.value = currentBattlesCat;
    if (currentBracketsCat) ui.bracketsCategorySelect.value = currentBracketsCat;
}

function populateTricks(filterText = '') {
    const tricks = window.db.getTricks();
    const select = ui.judgeTrickSelect;
    select.innerHTML = '<option value="">Selecciona un Slide...</option>';

    // Filtrar trucos si hay texto de búsqueda
    const filteredTricks = filterText.trim()
        ? tricks.filter(t => t.name.toLowerCase().includes(filterText.toLowerCase()))
        : tricks;

    if (filterText.trim() && filteredTricks.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.innerText = 'No se encontraron trucos';
        opt.disabled = true;
        select.appendChild(opt);
        return;
    }

    // Si hay filtro, mostrar sin grupos
    if (filterText.trim()) {
        filteredTricks.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            const diffLevel = t.id.split('-')[1].charAt(0).toUpperCase();
            opt.innerText = `${t.name} (Base: ${t.baseScore.toFixed(1)} - Nivel ${diffLevel})`;
            select.appendChild(opt);
        });
    } else {
        // Sin filtro, mostrar por familias
        const families = [...new Set(filteredTricks.map(t => t.family))];
        families.forEach(f => {
            const og = document.createElement('optgroup');
            og.label = f;
            filteredTricks.filter(t => t.family === f).forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                const diffLevel = t.id.split('-')[1].charAt(0).toUpperCase();
                opt.innerText = `${t.name} (Base: ${t.baseScore.toFixed(1)} - Nivel ${diffLevel})`;
                og.appendChild(opt);
            });
            select.appendChild(og);
        });
    }
}

// Buscador de trucos en tiempo real con sugerencias visuales
function setupTrickSearch() {
    const searchInput = document.getElementById('judge-trick-search');
    const suggestionsBox = document.getElementById('trick-suggestions');

    if (searchInput && suggestionsBox) {
        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value.trim().toLowerCase();
            const tricks = window.db.getTricks();

            // Filtrar trucos
            const filteredTricks = searchText
                ? tricks.filter(t => t.name.toLowerCase().includes(searchText))
                : [];

            // Mostrar/ocultar sugerencias
            if (searchText && filteredTricks.length > 0) {
                suggestionsBox.innerHTML = filteredTricks.slice(0, 10).map(t => {
                    const diffLevel = t.id.split('-')[1].charAt(0).toUpperCase();
                    const highlight = t.name.replace(
                        new RegExp(searchText, 'gi'),
                        match => `<span style="color:var(--primary); font-weight:700;">${match}</span>`
                    );
                    return `
                        <div class="trick-suggestion-item"
                             data-trick-id="${t.id}"
                             data-trick-name="${t.name}"
                             style="padding:0.8rem 1rem; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; transition:background 0.2s;">
                            <span style="font-size:0.9rem;">${highlight}</span>
                            <span style="font-size:0.75rem; background:var(--bg-app); padding:0.2rem 0.5rem; border-radius:12px; color:var(--text-muted);">
                                ${t.baseScore} pts - Nivel ${diffLevel}
                            </span>
                        </div>
                    `;
                }).join('');

                // Agregar evento click a cada sugerencia
                suggestionsBox.querySelectorAll('.trick-suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const trickId = item.dataset.trickId;
                        const trickName = item.dataset.trickName;

                        // Seleccionar en el dropdown original
                        const select = ui.judgeTrickSelect;
                        for (let i = 0; i < select.options.length; i++) {
                            if (select.options[i].value === trickId) {
                                select.selectedIndex = i;
                                break;
                            }
                        }

                        // Limpiar y ocultar
                        searchInput.value = trickName;
                        suggestionsBox.style.display = 'none';
                        suggestionsBox.innerHTML = '';
                    });

                    // Hover effect
                    item.addEventListener('mouseenter', () => {
                        item.style.background = 'rgba(245, 158, 11, 0.1)';
                    });
                    item.addEventListener('mouseleave', () => {
                        item.style.background = 'transparent';
                    });
                });

                suggestionsBox.style.display = 'block';
            } else {
                suggestionsBox.style.display = 'none';
                suggestionsBox.innerHTML = '';
            }

            // También filtrar el dropdown original
            populateTricks(e.target.value);
        });

        // Al presionar Enter, seleccionar el primer truco filtrado
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstSuggestion = suggestionsBox.querySelector('.trick-suggestion-item');
                if (firstSuggestion) {
                    firstSuggestion.click();
                } else {
                    const select = ui.judgeTrickSelect;
                    if (select.options.length > 1) {
                        select.selectedIndex = 1;
                        select.focus();
                    }
                }
            }
            if (e.key === 'Escape') {
                suggestionsBox.style.display = 'none';
                suggestionsBox.innerHTML = '';
            }
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });

        // Limpiar búsqueda al abrir el modal
        searchInput.value = '';
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
    }
}

// Actions
// Actions
function deleteSkater(id) {
    if (!confirm('¿Seguro que deseas eliminar a este patinador?')) return;
    console.log('[DELETE] Eliminando ID:', id);
    window.db.socket.emit('delete-skater', String(id));
    if (window.db.localData && window.db.localData.skaters) {
        window.db.localData.skaters = window.db.localData.skaters.filter(s => String(s.id) !== String(id));
    }
    renderSkaters();
    renderDashboard();
    showToast('Patinador eliminado.', false);
}

// Rendering
function renderDashboard() {
    const stats = window.db.getStats();
    ui.statSkaters.innerText = stats.totalSkaters;
    ui.statBattles.innerText = stats.pendingBattles;
}

function renderSkaters() {
    const skaters = window.db.getSkaters();
    const categories = window.db.getCategories();

    ui.skatersTbody.innerHTML = '';

    if (skaters.length === 0) {
        ui.skatersTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No hay patinadores inscritos aún.</td></tr>';
        return;
    }

    // Sort by Category, then by Seed
    const sorted = [...skaters].sort((a, b) => {
        if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId);
        return a.seedNumber - b.seedNumber;
    });

    sorted.forEach(s => {
        const cat = categories.find(c => c.id == s.categoryId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code style="background:var(--bg-app); padding:0.2rem 0.4rem; border-radius:4px; font-size:0.75rem; color:var(--text-muted);">${s.externalId || '-'}</code></td>
            <td><strong>${s.firstName}</strong></td>
            <td>${s.lastName}</td>
            <td><span style="font-size:0.8rem; color:var(--text-muted);">${s.nationality || '-'}</span></td>
            <td><span style="background:var(--bg-app); padding:0.2rem 0.6rem; border-radius:12px; font-size:0.8rem; border:1px solid var(--border);">${cat ? cat.name : '-'}</span></td>
            <td>${s.seedNumber > 0 ? '#' + s.seedNumber : 'S/R'}</td>
            <td>
                <button class="btn-secondary" onclick="deleteSkater('${s.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; color: #ef4444;"><i class="ph ph-trash"></i></button>
            </td>
        `;
        ui.skatersTbody.appendChild(tr);
    });
}

function renderBattles() {
    const catId = ui.battlesCategorySelect.value;
    ui.battlesContainer.innerHTML = '';

    const allSkaters = window.db.getSkaters();
    let battles = [];

    // Si hay categoría seleccionada, filtrar por ella. Si no, mostrar TODAS las batallas
    if (catId) {
        battles = window.db.getBattlesByCategory(catId);

        // Si no hay batallas pero hay competidores, podriamos ofrecer generar (mejora de main)
        if (battles.length === 0) {
            const skatersInCat = window.db.getSkaters().filter(s => s.categoryId === catId);
            if (skatersInCat.length >= 3) {
                // Generación automática si hay suficientes
                ui.battlesContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; padding:3rem; text-align:center; color:var(--text-muted); background:var(--bg-surface); border-radius:var(--radius-md); border:1px dashed var(--orange-500);">
                        <p>No hay batallas generadas para esta categoría, pero hay ${skatersInCat.length} competidores listos.</p>
                        <button class="btn-primary" onclick="generateHeats('${catId}')" style="margin-top:1rem;">Generar Grupos Ahora</button>
                    </div>`;
                return;
            } else if (skatersInCat.length > 0) {
                ui.battlesContainer.innerHTML = '<div style="grid-column: 1 / -1; padding:3rem; text-align:center; color:var(--text-muted); background:var(--bg-surface); border-radius:var(--radius-md); border:1px dashed var(--orange-500);">No hay suficientes competidores para hacer grupos. Se necesitan al menos 3.</div>';
                return;
            }
        }
    } else {
        // Obtener todas las batallas de todas las categorías (mejora de master)
        battles = window.db.getBattles() || [];
    }

    if (battles.length === 0) {
        ui.battlesContainer.innerHTML = '<div style="grid-column: 1 / -1; padding:3rem; text-align:center; color:var(--text-muted); background:var(--bg-surface); border-radius:var(--radius-md); border:1px dashed var(--border);">No hay batallas generadas aún. Selecciona una categoría para empezar.</div>';
        return;
    }

    // Agrupar batallas por categoría para mostrar cuando se muestran todas
    const battlesByCategory = {};
    battles.forEach(battle => {
        if (!battlesByCategory[battle.categoryId]) {
            battlesByCategory[battle.categoryId] = [];
        }
        battlesByCategory[battle.categoryId].push(battle);
    });

    // Si hay categoría seleccionada, renderizar normalmente
    if (catId) {
        renderBattlesByCategory(battles, allSkaters);
        checkAndShowNextPhaseButton(catId);
    } else {
        // Renderizar todas las batallas agrupadas por categoría
        const categories = window.db.getCategories();
        Object.keys(battlesByCategory).forEach(categoryId => {
            const category = categories.find(c => c.id === categoryId);
            const categoryName = category ? category.name : categoryId;

            // Category separator
            const categoryTitle = document.createElement('h3');
            categoryTitle.style.cssText = 'grid-column: 1 / -1; color: var(--accent); margin-top: 1.5rem; margin-bottom: 0.8rem; font-size: 1.2rem; text-transform: uppercase; border-bottom: 2px solid var(--accent); padding-bottom: 0.5rem;';
            categoryTitle.innerHTML = `<i class="ph ph-award"></i> ${categoryName}`;
            ui.battlesContainer.appendChild(categoryTitle);

            renderBattlesByCategory(battlesByCategory[categoryId], allSkaters);
        });
    }
}

function renderBattlesByCategory(battles, allSkaters) {
    const phases = ['Preliminar', 'Cuartos', 'Semifinal', 'Final'];
    const altPhases = {
        'Preliminar': ['Preliminar', 'Heat'],
        'Cuartos': ['Cuartos', 'Quarter-Final'],
        'Semifinal': ['Semifinal', 'Semi-Final'],
        'Final': ['Final']
    };

    phases.forEach(phase => {
        const phaseBattles = battles.filter(b => altPhases[phase].includes(b.phase));
        if (phaseBattles.length === 0) return;

        // Visual separator for phases
        const phaseTitle = document.createElement('h3');
        phaseTitle.style.cssText = 'grid-column: 1 / -1; color: var(--primary); margin-top: 1rem; margin-bottom: 0.5rem; text-transform: uppercase; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem;';
        phaseTitle.innerHTML = `<i class="ph ph-git-branch"></i> ${phase}`;
        ui.battlesContainer.appendChild(phaseTitle);

        phaseBattles.forEach(battle => {
            const card = document.createElement('div');
            card.className = 'battle-card';
            card.style.cssText = 'background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;';

            // Determinar estado para badge
            let statusBadge;
            if (battle.status === 'completed') {
                statusBadge = '<span class="status-badge status-completed"><i class="ph-fill ph-check-circle"></i> Finalizada</span>';
            } else {
                // Verificar si hay trucos registrados (parcial) o está vacía (pendiente)
                const hasTricks = battle.skaters.some(bs => bs.judging && Object.values(bs.judging).some(role => role.some(t => t !== null)));
                statusBadge = `<span class="status-badge ${hasTricks ? 'status-partial' : 'status-pending'}">
                    <i class="ph ph-${hasTricks ? 'clock' : 'circle'}"></i>
                    ${hasTricks ? 'En Progreso' : 'Pendiente'}
                </span>`;
            }

            const dbCategories = window.db.getDB().categories || [];
            const catInfo = dbCategories.find(c => c.id == battle.categoryId);
            const catName = catInfo ? catInfo.name : '';

            let header = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:0.8rem;">
                    <div style="display:flex; flex-direction:column; gap:0.2rem;">
                        <h3 style="font-size:1.1rem; color:var(--primary); margin:0;">${battle.phase} ${battle.heatNumber}</h3>
                        <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">${catName}</span>
                    </div>
                    ${statusBadge}
                </div>
            `;

            let listHtml = '<ul style="list-style:none; padding:0; flex:1; display:flex; flex-direction:column; gap:0.5rem;">';
            battle.skaters.forEach(bs => {
                const sInfo = allSkaters.find(s => s.id == bs.skaterId);
                if (sInfo) {
                    let statusHtml = '';
                    let progressHtml = '';

                    if (battle.status === 'completed') {
                        // Badge de clasificado/eliminado
                        if (bs.qualified) {
                            statusHtml = '<span class="status-badge status-qualified"><i class="ph-fill ph-star"></i> Clasifica</span>';
                        } else if (battle.phase && (battle.phase.toLowerCase().includes('final')) && !battle.phase.toLowerCase().includes('semi') && !battle.phase.toLowerCase().includes('cuartos')) {
                            // En la Final mostrar puestos en vez de "Eliminado"
                            const sorted = [...battle.skaters].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
                            const pos = sorted.findIndex(s => s.skaterId === bs.skaterId) + 1;
                            const medals = ['🥇', '🥈', '🥉', '🏅'];
                            const medal = medals[pos - 1] || '🏅';
                            const posLabels = ['1° Lugar', '2° Lugar', '3° Lugar', '4° Lugar'];
                            const label = posLabels[pos - 1] || `${pos}° Lugar`;
                            statusHtml = `<span style="font-size:0.75rem; font-weight:700; color:var(--primary);">${medal} ${label}</span>`;
                        } else {
                            statusHtml = '<span style="font-size:0.7rem; color:var(--text-muted);">Eliminado</span>';
                        }
                    } else {
                        // Progress Indicator (Dots)
                        const maxSlots = battle.phase === 'Final' ? 5 : 4;
                        let filledSlots = 0;
                        if (bs.judging) {
                            for (let i = 0; i < maxSlots; i++) {
                                // Check if Juez 1 has recorded something, or any judge
                                const hasTrick = ['Juez 1', 'Juez 2', 'Juez 3'].some(role => bs.judging[role] && bs.judging[role][i]);
                                if (hasTrick) filledSlots++;
                            }
                        }

                        let dots = '';
                        for (let i = 0; i < maxSlots; i++) {
                            if (i < filledSlots) {
                                dots += `<div style="width:8px; height:8px; border-radius:50%; background:var(--primary); box-shadow:0 0 5px rgba(0, 57, 166, 0.5);"></div>`;
                            } else {
                                dots += `<div style="width:8px; height:8px; border-radius:50%; background:var(--border);"></div>`;
                            }
                        }

                        // Show seed number or progress
                        progressHtml = `<div style="display:flex; gap:3px; margin-right:0.5rem;" title="Derrapes registrados">${dots}</div>`;

                        statusHtml = sInfo.seedNumber > 0
                            ? `<span style="font-size:0.7rem; background:var(--bg-app); padding:0.2rem 0.5rem; border-radius:12px; color:var(--text-muted);">Seed #${sInfo.seedNumber}</span>`
                            : '';
                    }

                    let highlight = bs.qualified && battle.status === 'completed'
                        ? 'border-left:3px solid var(--accent); background:rgba(16, 185, 129, 0.1);'
                        : 'border-left:3px solid var(--border); background:rgba(0,0,0,0.2);';

                    listHtml += `<li style="padding:0.6rem; border-radius:var(--radius-sm); font-size:0.95rem; display:flex; justify-content:space-between; align-items:center; ${highlight}">
                        <div style="display:flex; flex-direction:column;">
                            <span>${sInfo.firstName.toUpperCase()} <strong>${sInfo.lastName.toUpperCase()}</strong></span>
                            <small style="font-size:0.7rem; opacity:0.6; font-family:monospace;">${sInfo.externalId || '-'}</small>
                        </div>
                        <div style="display:flex; align-items:center;">
                            ${progressHtml}
                            ${statusHtml ? `<span>${statusHtml}</span>` : ''}
                        </div>
                    </li>`;
                }
            });
            listHtml += '</ul>';

            let actionBtn = battle.status === 'completed'
                ? `<button class="btn-secondary btn-full" onclick="openBattle('${battle.id}')" style="margin-top:auto;"><i class="ph ph-eye"></i> Ver Resultados</button>`
                : `<button class="btn-primary btn-full" onclick="openBattle('${battle.id}')" style="margin-top:auto;"><i class="ph ph-exam"></i> Jueceo de Ronda</button>`;

            card.innerHTML = header + listHtml + actionBtn;
            ui.battlesContainer.appendChild(card);
        });
    });
}

// Check if we can generate next phase directly from Battles view
function checkAndShowNextPhaseButton(catId) {
    if (!catId) return; // No mostrar botón cuando se ven todas las categorías

    const battles = window.db.getBattlesByCategory(catId);
    const currentBattles = battles.filter(b => b.phase === battles[battles.length - 1].phase);
    const uncompleted = currentBattles.some(b => b.status !== 'completed');
    const isFinal = currentBattles.some(b => b.phase === 'Final');

    if (!uncompleted && !isFinal) {
        const nextPhaseDiv = document.createElement('div');
        nextPhaseDiv.style.cssText = 'grid-column: 1 / -1; text-align:center; padding: 2rem 0; border-top: 1px dashed var(--border); margin-top: 1rem;';
        nextPhaseDiv.innerHTML = `<button class="btn-primary" onclick="triggerNextPhase('${catId}')" style="font-size: 1.1rem; padding: 0.8rem 2rem;"><i class="ph ph-fast-forward"></i> Generar Siguiente Ronda de Clasificados</button>`;
        ui.battlesContainer.appendChild(nextPhaseDiv);
    }
}

// --- ACTIVE BATTLE ---
function openBattle(battleId, fromServer = false) {
    currentBattleId = battleId;
    ui.views.forEach(v => v.classList.remove('active'));
    ui.viewActiveBattle.classList.add('active');

    // De-select nav items to show we are in deep view
    ui.navItems.forEach(nav => nav.classList.remove('active'));

    renderActiveBattle();

    // Si es el administrador (Juez 1) y no viene del servidor, forzar a los demás a ir a esta batalla
    if (window.db && window.db.currentRole === 'Juez 1' && !fromServer) {
        if (window.db.socket) {
            window.db.socket.emit('admin-focus-battle', battleId);
        }
    }
}

function openJudgeModal(skaterId, skaterName, slotIndex) {
    currentJudgeSkaterId = skaterId;
    document.getElementById('judge-skater-name').innerText = skaterName.toUpperCase();
    document.getElementById('judge-slot-index').value = slotIndex;
    ui.formJudge.reset();
    document.getElementById('judge-is-fail').checked = false;
    document.getElementById('judge-adjustment').value = 0;

    const slider = document.getElementById('judge-distance');
    const sliderVal = document.getElementById('judge-distance-val');
    if (slider) slider.value = 2.5;
    if (sliderVal) sliderVal.innerText = '2.5m';

    // Resetear selector de Stop
    document.querySelectorAll('input[name="judge-stop-level"]').forEach(radio => {
        radio.checked = radio.value === '0';
    });

    // Limpiar el buscador y recargar la lista completa de trucos
    const searchInput = document.getElementById('judge-trick-search');
    if (searchInput) {
        searchInput.value = '';
        populateTricks('');
    }

    // Ocultar info de combo inicialmente
    document.getElementById('judge-combo-info').style.display = 'none';

    // Actualizar contador de familias y combo preview
    updateFamilyCounterAndCombo(skaterId, slotIndex);

    ui.modalJudge.classList.remove('hidden');
}

// Actualizar contador de familias y vista previa de combo
function updateFamilyCounterAndCombo(skaterId, currentSlotIndex) {
    const db = window.db.getDB();
    const battle = db.battles.find(b => b.id == currentBattleId);
    if (!battle) return;

    const skater = battle.skaters.find(s => s.skaterId == skaterId);
    if (!skater) return;

    // Obtener trucos actuales del juez actual en otros slots
    const role = window.db.currentRole;
    const judging = skater.judging || {};
    const currentJudgeTricks = judging[role] || [];

    // Contar familias únicas
    const families = new Set();
    const familyNames = [];

    currentJudgeTricks.forEach((trick, idx) => {
        if (trick && trick.trickId !== 'fail' && idx !== currentSlotIndex) {
            const familyShort = trick.family ? trick.family.match(/^(F\d+)/)?.[1] : null;
            if (familyShort && !families.has(familyShort)) {
                families.add(familyShort);
                familyNames.push(familyShort);
            }
        }
    });

    // Actualizar contador de familias en el modal
    const comboInfoDiv = document.getElementById('judge-combo-info');
    const comboFamiliesDisplay = document.getElementById('combo-families-display');
    const comboBonusValue = document.getElementById('combo-bonus-value');

    // Escuchar cambios en el selector de trucos para mostrar combo preview
    const trickSelect = document.getElementById('judge-trick-select');
    const trickSearch = document.getElementById('judge-trick-search');

    function checkCombo() {
        const selectedTrickId = trickSelect.value;
        const isFail = document.getElementById('judge-is-fail').checked;

        if (isFail || !selectedTrickId) {
            comboInfoDiv.style.display = 'none';
            return;
        }

        // Obtener familia del truco seleccionado
        const allTricks = window.db.getTricks();
        const selectedTrick = allTricks.find(t => t.id === selectedTrickId);
        if (!selectedTrick) return;

        const selectedFamily = selectedTrick.family.match(/^(F\d+)/)?.[1];

        // Verificar si hay combo
        const hasDifferentFamily = selectedFamily && familyNames.some(f => f !== selectedFamily);

        if (hasDifferentFamily && familyNames.length > 0) {
            // Calcular bonus estimado
            const baseScore1 = currentJudgeTricks.reduce((sum, t) => t && !t.isFail ? sum + (t.baseScore || 0) : sum, 0);
            const baseScore2 = selectedTrick.baseScore || 0;
            const totalBase = baseScore1 + baseScore2;
            const bonus = Math.round(totalBase * 0.5);

            comboFamiliesDisplay.innerText = `${familyNames.join(' + ')} + ${selectedFamily}`;
            comboBonusValue.innerText = `+${bonus} pts`;
            comboInfoDiv.style.display = 'block';
            comboInfoDiv.classList.add('combo-active');
            setTimeout(() => comboInfoDiv.classList.remove('combo-active'), 500);
        } else {
            comboInfoDiv.style.display = 'none';
        }
    }

    // Remover listeners previos para evitar duplicados
    trickSelect?.removeEventListener('change', checkCombo);
    trickSearch?.removeEventListener('input', checkCombo);
    document.getElementById('judge-is-fail')?.removeEventListener('change', checkCombo);

    // Agregar listeners
    trickSelect?.addEventListener('change', checkCombo);
    trickSearch?.addEventListener('input', checkCombo);
    document.getElementById('judge-is-fail')?.addEventListener('change', checkCombo);
}

function renderActiveBattle() {
    const db = window.db.getDB();
    // Usar == para permitir comparación entre string (de la UI) y number (de la DB)
    const battle = db.battles.find(b => b.id == currentBattleId);
    if (!battle) {
        console.error("Batalla no encontrada:", currentBattleId);
        return;
    }

    const catInfo = db.categories.find(c => c.id == battle.categoryId);
    document.getElementById('active-battle-title').innerText = `${battle.phase} ${battle.heatNumber}`;
    document.getElementById('active-battle-subtitle').innerText = catInfo ? catInfo.name : '';

    if (battle.status === 'completed') {
        ui.btnFinishBattle.style.display = 'none';
        document.getElementById('active-battle-title').innerText = `RESULTADOS FINALES - ${battle.phase} ${battle.heatNumber}`;

        // Lanzar confetti si es una Final
        if (battle.phase === 'Final') {
            launchConfetti();
        }
    } else {
        // Solo el Juez 1 (Admin) puede ver el botón de finalizar
        const role = window.db.currentRole;
        ui.btnFinishBattle.style.display = (role === 'Juez 1') ? 'inline-flex' : 'none';
    }

    ui.activeBattleGrid.innerHTML = '';

    // Si la batalla está completada, mostrar PODIUM en lugar de columnas individuales
    if (battle.status === 'completed') {
        try {
            const podium = showPodium(currentBattleId);
            const podiumHTML = renderPodiumHTML(podium);

            if (podiumHTML) {
                const podiumContainer = document.createElement('div');
                podiumContainer.style.cssText = 'grid-column: 1 / -1; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem;';
                podiumContainer.innerHTML = `
                    <h3 style="text-align:center; color:var(--primary); margin-bottom:1rem; font-size:1.3rem;">
                        <i class="ph ph-trophy"></i> Podio - ${battle.phase} ${battle.heatNumber}
                    </h3>
                    ${podiumHTML}
                `;
                ui.activeBattleGrid.appendChild(podiumContainer);
            }
        } catch (e) {
            console.error("Error al renderizar podio:", e);
        }

        // También mostrar lista completa de resultados
        const resultsContainer = document.createElement('div');
        resultsContainer.style.cssText = 'grid-column: 1 / -1; margin-top:1rem;';
        resultsContainer.innerHTML = '<h3 style="color:var(--text-muted); margin-bottom:1rem; font-size:1rem;"><i class="ph ph-list"></i> Resultados Completos</h3>';
        ui.activeBattleGrid.appendChild(resultsContainer);

        // Continuar con el renderizado normal para mostrar todos los resultados...
    }

    battle.skaters.forEach(bs => {
        const sInfo = db.skaters.find(s => s.id == bs.skaterId);
        if (!sInfo) return;

        // Dinámico: 5 slots en la Final, 4 en el resto
        const maxSlots = battle.phase === 'Final' ? 5 : 4;
        const myRole = window.db.currentRole;
        const judging = bs.judging || { 'Juez 1': [], 'Juez 2': [], 'Juez 3': [] };

        // Verificar si el juez actual ya completó sus slots
        const mySlotsCount = (judging[myRole] || []).filter(s => s !== null && s !== undefined).length;
        const isDoneByMe = mySlotsCount >= maxSlots;

        const col = document.createElement('div');
        let cardStyle = 'background:var(--bg-surface); border:1px solid var(--border);';
        if (isDoneByMe && battle.status !== 'completed') {
            cardStyle = 'background:linear-gradient(to bottom, rgba(16, 185, 129, 0.08), var(--bg-surface)); border:1px solid rgba(16, 185, 129, 0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.1);';
        }
        col.style.cssText = cardStyle + ' border-radius:var(--radius-md); display:flex; flex-direction:column; overflow:hidden; transition: all 0.3s ease;';

        // Header con resultados globales
        const getSum = (r) => {
            let scores = (judging[r] || []).map(t => t ? t.finalScore : 0);
            scores.sort((a, b) => b - a);
            const maxToCount = battle.phase === 'Final' ? 4 : 3;
            return scores.slice(0, maxToCount).reduce((acc, score) => acc + score, 0);
        };

        const j1Sum = getSum('Juez 1');
        const j2Sum = getSum('Juez 2');
        const j3Sum = getSum('Juez 3');

        // Solo mostrar el Total Global si el Admin cerró la batalla o si los 3 jueces ya completaron todos los slots
        const isAllReady = Object.keys(judging).every(roleKey => {
            const slots = judging[roleKey] || [];
            // Verificar que hayamos llenado hasta maxSlots
            for (let i = 0; i < maxSlots; i++) if (slots[i] === null || slots[i] === undefined) return false;
            return true;
        });
        const showGlobal = battle.status === 'completed' || isAllReady;

        const headHtml = `
            <div style="padding:1.2rem; background:rgba(0,0,0,0.2); border-bottom:1px solid var(--border);">
                <h3 style="font-size:1.2rem; margin-bottom:0.1rem; text-align:center;">${sInfo.firstName.toUpperCase()} <strong>${sInfo.lastName.toUpperCase()}</strong></h3>
                <code style="display:block; font-size:0.7rem; opacity:0.5; margin-bottom:0.8rem; text-align:center;">${sInfo.externalId || '-'}</code>

                <!-- Resultados por Juez (Siempre visibles) -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.4rem; margin-bottom:0.8rem; font-size:0.75rem;">
                    <div style="background:var(--bg-app); padding:0.5rem; border-radius:4px; border-bottom:2px solid ${j1Sum > 0 ? 'var(--primary)' : 'var(--border)'}; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:0.2rem;">JUEZ 1</div>
                        <div style="font-size:1.1rem; font-weight:700; color:${j1Sum > 0 ? 'var(--primary)' : 'var(--text-muted)'}">${j1Sum > 0 ? j1Sum.toFixed(1) : '--'}</div>
                    </div>
                    <div style="background:var(--bg-app); padding:0.5rem; border-radius:4px; border-bottom:2px solid ${j2Sum > 0 ? 'var(--primary)' : 'var(--border)'}; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:0.2rem;">JUEZ 2</div>
                        <div style="font-size:1.1rem; font-weight:700; color:${j2Sum > 0 ? 'var(--primary)' : 'var(--text-muted)'}">${j2Sum > 0 ? j2Sum.toFixed(1) : '--'}</div>
                    </div>
                    <div style="background:var(--bg-app); padding:0.5rem; border-radius:4px; border-bottom:2px solid ${j3Sum > 0 ? 'var(--primary)' : 'var(--border)'}; text-align:center;">
                        <div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:0.2rem;">JUEZ 3</div>
                        <div style="font-size:1.1rem; font-weight:700; color:${j3Sum > 0 ? 'var(--primary)' : 'var(--text-muted)'}">${j3Sum > 0 ? j3Sum.toFixed(1) : '--'}</div>
                    </div>
                </div>

                <!-- Total Global -->
                <div style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05)); padding:0.8rem; border-radius:6px; border:2px solid ${showGlobal ? 'var(--accent)' : 'var(--border)'}; ${(battle.status !== 'completed' && !showGlobal) ? 'filter: blur(3px); opacity:0.4;' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--text-muted); letter-spacing:1px;">TOTAL GLOBAL</span>
                        <strong style="color:var(--accent); font-size:1.5rem;">${(battle.status === 'completed' || showGlobal) ? ((j1Sum + j2Sum + j3Sum) / 3).toFixed(2) : '--.--'}</strong>
                    </div>
                </div>

                ${battle.status === 'completed' ? (() => {
                // Ordenar skaters por puntaje para determinar la posición
                const sortedSkaters = [...battle.skaters].sort((a, b) => b.totalScore - a.totalScore);
                const position = sortedSkaters.findIndex(s => s.skaterId == bs.skaterId) + 1;

                // Determinar sufijo ordinal (1º, 2º, 3º, 4º, etc.)
                const sufijo = 'º';

                // Colores diferentes para top 3
                let colorBg, colorText, borderStyle;
                if (position === 1) {
                    colorBg = '#FEF08A'; colorText = '#854D0E'; borderStyle = '1px solid #F59E0B';
                } // Oro
                else if (position === 2) {
                    colorBg = '#E5E7EB'; colorText = '#374151'; borderStyle = '1px solid #9CA3AF';
                } // Plata
                else if (position === 3) {
                    colorBg = '#FFEDD5'; colorText = '#9A3412'; borderStyle = '1px solid #FB923C';
                } // Bronce
                else {
                    colorBg = 'rgba(239, 68, 68, 0.1)'; colorText = 'var(--danger)'; borderStyle = '1px solid rgba(239, 68, 68, 0.3)';
                }

                return `
                        <div style="margin-top:0.8rem; padding:0.4rem; border-radius:6px; font-weight:900; font-size:0.85rem; background:${colorBg}; color:${colorText}; border:${borderStyle}; text-align:center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); letter-spacing: 0.5px;">
                            ${position}${sufijo} LUGAR
                        </div>
                    `;
            })() : !showGlobal ? '<p style="font-size:0.7rem; color:var(--text-muted); margin-top:0.5rem; letter-spacing:0.5px;">RESULTADO PARCIAL OCULTO</p>' : ''}
            </div>
        `;

        // Slots de Jueceo - Mostrar SOLO los del juez actual (o todos si finalizó)
        let slotsHtml = '<div style="padding:1rem; flex:1; display:flex; flex-direction:column; gap:0.6rem; background:rgba(255,255,255,0.02);">';
        const rolesToShow = (battle.status === 'completed') ? ['Juez 1', 'Juez 2', 'Juez 3'] : [myRole];

        rolesToShow.forEach(role => {
            if (!role) return;
            const roleSlots = judging[role] || [];

            // Si hay datos para este juez, mostrar sección
            if (roleSlots.some(s => s !== null && s !== undefined) || rolesToShow.length === 1) {
                // Título de la sección de este juez
                slotsHtml += `<div style="text-align:left; margin-bottom:0.5rem; padding-bottom:0.3rem; border-bottom:1px solid var(--border); margin-top:0.5rem;">
                    <span style="font-size:0.65rem; text-transform:uppercase; color:var(--primary); letter-spacing:1px; font-weight:700;">
                        <i class="ph-fill ph-${role === 'Juez 1' ? 'shield-star' : 'user'}"></i>
                        Registro de ${role}
                    </span>
                </div>`;

                // --- CONTADORES DE FAMILIAS DE DERRAPES ---
                const familyCounts = { 'INT': 0, 'EXT': 0, 'FR': 0, 'ESP': 0, 'LAT': 0 };
                const allTricks = window.db.getTricks();
                
                roleSlots.forEach(s => {
                    if (s && !s.isFail) {
                        const trk = allTricks.find(t => t.name === s.name);
                        if (trk) {
                            if (trk.family.includes('F1')) familyCounts['INT']++;
                            else if (trk.family.includes('F2')) familyCounts['EXT']++;
                            else if (trk.family.includes('F3')) familyCounts['FR']++;
                            else if (trk.family.includes('F4')) familyCounts['ESP']++;
                            else if (trk.family.includes('F5')) familyCounts['LAT']++;
                        }
                    }
                });

                slotsHtml += '<div class="family-counters">';
                for (const [key, count] of Object.entries(familyCounts)) {
                    const isActive = count > 0;
                    const isHigh = count >= 2;
                    slotsHtml += `
                        <div class="family-badge ${isActive ? 'active' : ''} ${isHigh ? 'highlight' : ''}">
                            <span>${key}</span>
                            <span class="count">${count}</span>
                        </div>
                    `;
                }
                slotsHtml += '</div>';

                // Identificar mejores N para marcar descartes (solo para este juez)
                const slotsWithScores = roleSlots
                    .map((slide, index) => ({ slide, index }))
                    .filter(item => item.slide !== null)
                    .map(item => ({ index: item.index, score: item.slide.finalScore }));
                slotsWithScores.sort((a, b) => b.score - a.score);
                const topIndices = slotsWithScores.slice(0, maxSlots === 5 ? 4 : 3).map(item => item.index);

                for (let i = 0; i < maxSlots; i++) {
                    const slide = roleSlots[i];
                    if (!slide) {
                        // Slot Vacío (Solo habilitar si es el rol actual y NO está completado)
                        if (role === myRole && battle.status !== 'completed') {
                            slotsHtml += `
                                <button class="btn-empty-slot" onclick="openJudgeModal('${sInfo.id}', '${sInfo.firstName.toUpperCase()} ${sInfo.lastName.toUpperCase()}', ${i})"
                                        style="width:100%; border:1px dashed var(--border); background:none; color:var(--text-muted); padding:0.6rem; border-radius:var(--radius-sm); cursor:pointer; font-size:0.75rem; transition:all 0.2s;">
                                    <i class="ph ph-plus-circle" style="font-size:0.9rem; margin-right:0.3rem; vertical-align:middle;"></i>
                                    Slot ${i + 1}: <span style="opacity:0.5;">+ Añadir</span>
                                </button>
                            `;
                        } else if (rolesToShow.length === 1) {
                            // Si solo se muestra uno y está vacío, mostrar placeholder
                            slotsHtml += `<div style="font-size:0.7rem; color:var(--text-muted); font-style:italic; padding-left:0.5rem;">Vacio</div>`;
                        }
                    } else {
                        // Slot Lleno
                        const isFail = slide.isFail;
                        const isCounted = topIndices.includes(i);
                        const isDropped = !isCounted;

                        const adj = slide.adjustment || 0;
                        const dist = slide.distance || 2.5;
                        let badgeColor = isDropped ? 'var(--text-muted)' : (isFail ? 'var(--danger)' : (adj >= 0 ? 'var(--accent)' : 'var(--primary)'));
                        let adjText = isFail ? 'Falla (0.0)' : (adj === 0 ? '' : (adj > 0 ? `+${adj.toFixed(1)}` : adj.toFixed(1)));

                        let opacityStyle = isDropped ? 'opacity: 0.5; filter: grayscale(100%);' : '';
                        let droppedBadge = isDropped ? '<span style="position:absolute; bottom: -8px; right: 5px; background:var(--text-muted); color:var(--bg-app); font-size:0.55rem; font-weight:bold; padding:1px 4px; border-radius:3px; letter-spacing:0.5px; z-index:2;">DESC.</span>' : '';
                        let countedBadge = isCounted && slotsWithScores.length > (maxSlots === 5 ? 4 : 3) ? '<i class="ph-fill ph-check-circle" style="color:var(--accent); font-size:1rem; margin-left:0.3rem;" title="Contabilizado"></i>' : '';

                        // Stop bonus display
                        let stopBonusText = '';
                        if (slide.stopLevel && slide.stopLevel > 0 && !slide.isFail) {
                            const stopLabels = { 1: 'N1', 2: 'N2', 3: 'N3' };
                            stopBonusText = `<span style="color:#F59E0B; font-weight:600;"><i class="ph-fill ph-hand-palm"></i> Stop ${stopLabels[slide.stopLevel]}</span>`;
                        }

                        // El botón de eliminar SOLO si es el rol actual y NO está completado
                        const deleteBtn = (role === myRole && battle.status !== 'completed') ? `<button onclick="event.stopPropagation(); deleteRecordedTrick('${sInfo.id}', ${i})" style="position:absolute; top: -5px; right: -5px; background:var(--danger); color:white; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:5;"><i class="ph ph-x"></i></button>` : '';

                        slotsHtml += `
                            <div style="background:var(--bg-app); border:1px solid var(--border); border-left:3px solid ${badgeColor}; padding:0.6rem; border-radius:var(--radius-sm); position:relative; cursor:${(role === myRole && battle.status !== 'completed') ? 'pointer' : 'default'}; transition:all 0.2s; margin-bottom:0.2rem; ${opacityStyle}"
                                 ${(role === myRole && battle.status !== 'completed') ? `onclick="openJudgeModal('${sInfo.id}', '${sInfo.firstName.toUpperCase()} ${sInfo.lastName.toUpperCase()}', ${i})"` : ''}>
                                ${droppedBadge}
                                ${deleteBtn}
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <strong style="font-size:0.8rem; ${isFail ? 'text-decoration:line-through; color:var(--danger);' : ''}">${slide.name}</strong>
                                    <div style="display:flex; align-items:center;">
                                        <strong style="color:${isDropped ? 'var(--text-muted)' : badgeColor}; font-size:0.95rem;">${slide.finalScore.toFixed(1)}</strong>
                                        ${countedBadge}
                                    </div>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem; color:var(--text-muted); margin-top:0.2rem;">
                                    <span>${dist.toFixed(1)}m | ${stopBonusText || 'No Stop'}</span>
                                    <span>${adjText ? 'Adj: ' + adjText : ''}</span>
                                </div>
                            </div>
                        `;
                    }
                }
            }
        });

        slotsHtml += '</div>';

        slotsHtml += '</div>';

        col.innerHTML = headHtml + slotsHtml;
        ui.activeBattleGrid.appendChild(col);
    });
}

// --- BRACKETS ---
function renderBrackets() {
    const catId = ui.bracketsCategorySelect.value;
    ui.bracketContainer.innerHTML = '';
    if (!catId) return;

    const db = window.db.getDB();
    const battles = window.db.getBattlesByCategory(catId);

    if (battles.length === 0) {
        ui.bracketContainer.innerHTML = '<div style="padding:3rem; text-align:center; color:var(--text-muted); background:var(--bg-surface); border-radius:var(--radius-md); border:1px dashed var(--border);">No hay batallas en esta categoría aún.</div>';
        return;
    }

    // Fases soportadas (español e inglés clásico)
    const phases = ['Preliminar', 'Cuartos', 'Semifinal', 'Final'];
    const altPhases = {
        'Preliminar': ['Preliminar', 'Heat'],
        'Cuartos': ['Cuartos', 'Quarter-Final'],
        'Semifinal': ['Semifinal', 'Semi-Final'],
        'Final': ['Final']
    };
    const getBasePhase = (p) => {
        for (let key in altPhases) {
            if (altPhases[key].includes(p)) return key;
        }
        return 'Preliminar';
    };

    // Verificar si podemos generar siguiente fase
    const lastPhaseBase = battles.reduce((last, b) => {
        const baseP = getBasePhase(b.phase);
        const phaseIndex = phases.indexOf(baseP);
        return phaseIndex > phases.indexOf(last) ? baseP : last;
    }, 'Preliminar');

    const currentBattles = battles.filter(b => getBasePhase(b.phase) === lastPhaseBase);
    const uncompleted = currentBattles.some(b => b.status !== 'completed');
    const isFinal = lastPhaseBase === 'Final';

    // Obtenemos el ID de categoría de la primera batalla en caso de estar viendo "Todas las categorías"
    const targetCatId = catId || (battles.length > 0 ? battles[battles.length - 1].categoryId : '');

    let nextPhaseBtnHtml = '';
    if (!uncompleted && !isFinal && currentBattles.length > 0 && targetCatId) {
        nextPhaseBtnHtml = `<button class="btn-primary" onclick="triggerNextPhase('${targetCatId}')" style="margin-bottom:1rem;"><i class="ph ph-fast-forward"></i> Generar Siguiente Ronda</button>`;
    }

    ui.bracketContainer.innerHTML = nextPhaseBtnHtml;

    phases.forEach(phase => {
        const phaseBattles = battles.filter(b => altPhases[phase].includes(b.phase));
        if (phaseBattles.length === 0) return;

        const phaseSection = document.createElement('div');
        phaseSection.style.cssText = 'background:var(--bg-app); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.5rem; margin-bottom:1rem;';

        const completedCount = phaseBattles.filter(b => b.status === 'completed').length;
        const phaseHeader = `
            <h3 style="color:var(--primary); margin-bottom:1rem; text-transform:uppercase; font-size:1.2rem; display:flex; align-items:center; gap:0.5rem; justify-content:space-between;">
                <span><i class="ph ph-git-branch"></i> ${phase}</span>
                <span style="font-size:0.8rem; background:${completedCount === phaseBattles.length ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color:${completedCount === phaseBattles.length ? '#10B981' : '#F59E0B'}; padding:0.2rem 0.6rem; border-radius:12px; font-weight:normal;">
                    ${completedCount === phaseBattles.length ? 'Completada' : 'En Progreso'}
                </span>
            </h3>
        `;

        let gridHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:1rem;">';

        phaseBattles.forEach(battle => {
            let skatersHtml = '';
            // Ordenar skaters por puntaje si la batalla está completada
            const sortedSkaters = battle.status === 'completed'
                ? [...battle.skaters].sort((a, b) => b.totalScore - a.totalScore)
                : battle.skaters;

            sortedSkaters.forEach((bs, idx) => {
                const sInfo = db.skaters.find(s => s.id == bs.skaterId);
                const isQualified = bs.qualified === true;
                const mark = battle.status === 'completed' && isQualified
                    ? '<i class="ph-fill ph-check-circle" style="color:#10B981;" title="Clasificado"></i>'
                    : '';
                const bg = isQualified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.05)';
                const positionBadge = battle.status === 'completed'
                    ? (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx === 3 ? '4º' : '')
                    : '';

                const finalMark = battle.phase === 'Final' && battle.status === 'completed'
                    ? `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:bold;">Posición: ${idx + 1}º</span>`
                    : mark;

                skatersHtml += `
                    <div style="padding:0.5rem; background:${bg}; border-radius:4px; margin-bottom:0.3rem; font-size:0.85rem; display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
                        <div style="display:flex; align-items:center; gap:0.4rem; flex:1;">
                            <span style="font-size:0.75rem; min-width:16px;">${positionBadge}</span>
                            <span style="flex:1;">${sInfo ? sInfo.firstName + ' ' + sInfo.lastName : 'TBD'}</span>
                            ${finalMark}
                        </div>
                        ${battle.status === 'completed' ? `<span style="font-weight:700; color:var(--primary); font-size:0.8rem;">${bs.totalScore.toFixed(2)}</span>` : ''}
                    </div>
                `;
            });

            gridHtml += `
                <div style="background:var(--bg-surface); border:1px solid var(--border); padding:1rem; border-radius:var(--radius-sm);">
                    <div style="font-weight:700; color:var(--text-muted); font-size:0.85rem; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                        <span>${phase} #${battle.heatNumber}</span>
                        ${battle.status === 'completed'
                    ? '<span style="color:#10B981; font-size:0.75rem;"><i class="ph-fill ph-check-circle"></i> Finalizado</span>'
                    : '<span style="color:#F59E0B; font-size:0.75rem;"><i class="ph ph-clock"></i> Pendiente</span>'}
                    </div>
                    ${skatersHtml}
                </div>
            `;
        });

        gridHtml += '</div>';
        phaseSection.innerHTML = phaseHeader + gridHtml;
        ui.bracketContainer.appendChild(phaseSection);
    });
}

window.triggerNextPhase = (catId) => {
    if (confirm('¿Generar siguiente ronda? Los clasificados pasarán a nuevas llaves.')) {
        if (window.db.generateNextPhase(catId)) {
            showToast('Generando siguiente ronda...');
        } else {
            showToast('No se pudo generar. Asegúrate de que todos los grupos estén finalizados.', true);
        }
    }
}

window.deleteRecordedTrick = (skaterId, slotIdx) => {
    if (confirm('¿Eliminar este truco?')) {
        if (window.db.deleteTrick(currentBattleId, skaterId, slotIdx)) {
            renderActiveBattle();
            showToast('Truco eliminado');
        }
    }
}

window.adjustPoints = (val) => {
    const input = document.getElementById('judge-adjustment');
    input.value = (parseFloat(input.value) + val).toFixed(1);
}

function exportTournamentCSV() {
    const db = window.db.getDB();
    const { skaters, battles, categories } = db;

    if (skaters.length === 0) return showToast('No hay datos para exportar', true);

    // Calcular posición final de cada skater en el campeonato
    const skaterResults = skaters.map(sk => {
        const refCatId = sk.categoryId || sk.category || 'unknown';
        const cat = categories.find(c => c.id == refCatId);
        const categoryName = cat ? cat.name : refCatId;

        // Buscar todas las batallas de este patinador
        const skaterBattles = battles.filter(b => b.skaters.some(s => s.skaterId == sk.id));

        let finalPhase = 'Preliminar';
        let finalPhaseNum = 1;
        let totalScore = 0;
        let finalPosition = null;
        let isQualified = false;
        let j1Score = 0;
        let j2Score = 0;
        let j3Score = 0;

        const phaseMap = {
            'Preliminar': 1, 'Heat': 1,
            'Cuartos': 2, 'Quarter-Final': 2, 'Cuartos de Final': 2,
            'Semifinal': 3, 'Semi-Final': 3, 'Semifinales': 3,
            'Final': 4
        };

        if (skaterBattles.length > 0) {
            // Obtener la fase más avanzada
            const lastBattle = skaterBattles.reduce((last, b) =>
                (phaseMap[b.phase] || 0) > (phaseMap[last.phase] || 0) ? b : last, skaterBattles[0]);
            const result = lastBattle.skaters.find(s => s.skaterId === sk.id);

            let rawPhase = lastBattle.phase;
            if (rawPhase === 'Heat') rawPhase = 'Preliminar';
            if (rawPhase === 'Quarter-Final' || rawPhase === 'Cuartos de Final') rawPhase = 'Cuartos';
            if (rawPhase === 'Semi-Final' || rawPhase === 'Semifinales') rawPhase = 'Semifinal';

            finalPhase = rawPhase;
            finalPhaseNum = phaseMap[lastBattle.phase] || 1;

            if (result) {
                const judging = result.judging || {};
                const getSumExport = (role) => {
                    let tricks = (judging[role] || []);
                    let validTricks = tricks.filter(t => t && !t.isFail && t.finalScore > 0);
                    let scores = validTricks.map(t => t.finalScore);
                    scores.sort((a, b) => b - a);
                    const maxToCount = lastBattle.phase === 'Final' ? 4 : 3;
                    const topScores = scores.slice(0, maxToCount);
                    const baseTotal = topScores.reduce((acc, score) => acc + score, 0);

                    // Variety Multiplier (Sync with db.js)
                    const families = new Set(validTricks.map(t => {
                        if (!t.family) return '';
                        const m = t.family.match(/^(F\d+)/);
                        return m ? m[1] : '';
                    }));
                    const numFamilies = families.size;
                    let m_var = 1.0;
                    if (numFamilies === 3) m_var = 1.05;
                    else if (numFamilies >= 4) m_var = 1.10;
                    // Note: Penalty of 0.70 was removed as per scoring fix

                    return Math.round(baseTotal * m_var * 100) / 100;
                };
                j1Score = getSumExport('Juez 1');
                j2Score = getSumExport('Juez 2');
                j3Score = getSumExport('Juez 3');
                totalScore = result.totalScore;
                isQualified = result.qualified || false;
            }
        }

        return {
            ...sk,
            categoryName,
            finalPhase,
            finalPhaseNum,
            totalScore,
            isQualified,
            j1Score,
            j2Score,
            j3Score
        };
    });

    // Calcular posiciones globales por categoría
    // Primero agrupar por categoría
    const byCategory = {};
    skaterResults.forEach(sk => {
        const refCatId = sk.categoryId || sk.category || 'unknown';
        if (!byCategory[refCatId]) {
            byCategory[refCatId] = [];
        }
        byCategory[refCatId].push(sk);
    });

    // Para cada categoría, calcular posiciones
    Object.keys(byCategory).forEach(catId => {
        const categorySkaters = byCategory[catId];

        // 1. Finalistas (posiciones 1-4)
        const finalistas = categorySkaters.filter(s => s.finalPhase === 'Final');
        if (finalistas.length > 0) {
            // Obtener resultados de la final
            const finalBattle = battles.find(b => b.phase === 'Final' && b.categoryId === catId);
            if (finalBattle && finalBattle.status === 'completed') {
                const sorted = [...finalBattle.skaters].sort((a, b) => b.totalScore - a.totalScore);
                sorted.forEach((s, idx) => {
                    const skater = categorySkaters.find(sk => sk.id === s.skaterId);
                    if (skater) {
                        skater.finalPosition = idx + 1;
                    }
                });
            }
        }

        // 2. Semifinalistas no clasificados a final (posiciones 5-8)
        const semifinalistas = categorySkaters.filter(s => s.finalPhase === 'Semifinal' && !s.isQualified);
        if (semifinalistas.length > 0) {
            // Obtener todas las semifinales
            const semiBattles = battles.filter(b => (b.phase === 'Semifinal' || b.phase === 'Semi-Final' || b.phase === 'Semifinales') && b.categoryId === catId && b.status === 'completed');
            const allSemiResults = [];
            semiBattles.forEach(b => {
                b.skaters.forEach(s => {
                    const skater = categorySkaters.find(sk => sk.id === s.skaterId);
                    if (skater && !skater.isQualified) {
                        allSemiResults.push({ skaterId: s.skaterId, totalScore: s.totalScore });
                    }
                });
            });
            allSemiResults.sort((a, b) => b.totalScore - a.totalScore);
            allSemiResults.forEach((s, idx) => {
                const skater = categorySkaters.find(sk => sk.id === s.skaterId);
                if (skater && skater.finalPosition === null) {
                    skater.finalPosition = idx + 5;
                }
            });
        }

        // 3. Cuartos no clasificados a semifinal (posiciones 9-12)
        const cuartos = categorySkaters.filter(s => s.finalPhase === 'Cuartos' && !s.isQualified);
        if (cuartos.length > 0) {
            const quarterBattles = battles.filter(b => (b.phase === 'Cuartos' || b.phase === 'Quarter-Final' || b.phase === 'Cuartos de Final') && b.categoryId === catId && b.status === 'completed');
            const allQuarterResults = [];
            quarterBattles.forEach(b => {
                b.skaters.forEach(s => {
                    const skater = categorySkaters.find(sk => sk.id === s.skaterId);
                    if (skater && !skater.isQualified) {
                        allQuarterResults.push({ skaterId: s.skaterId, totalScore: s.totalScore });
                    }
                });
            });
            allQuarterResults.sort((a, b) => b.totalScore - a.totalScore);
            allQuarterResults.forEach((s, idx) => {
                const skater = categorySkaters.find(sk => sk.id === s.skaterId);
                if (skater && skater.finalPosition === null) {
                    skater.finalPosition = idx + 9;
                }
            });
        }

        // 4. Preliminar no clasificados a cuartos (posiciones 13+)
        const preliminar = categorySkaters.filter(s => s.finalPhase === 'Preliminar' && !s.isQualified);
        if (preliminar.length > 0) {
            const prelimBattles = battles.filter(b => (b.phase === 'Preliminar' || b.phase === 'Heat') && b.categoryId === catId && b.status === 'completed');
            const allPrelimResults = [];
            prelimBattles.forEach(b => {
                b.skaters.forEach(s => {
                    const skater = categorySkaters.find(sk => sk.id === s.skaterId);
                    if (skater && !skater.isQualified) {
                        allPrelimResults.push({ skaterId: s.skaterId, totalScore: s.totalScore });
                    }
                });
            });
            allPrelimResults.sort((a, b) => b.totalScore - a.totalScore);
            allPrelimResults.forEach((s, idx) => {
                const skater = categorySkaters.find(sk => sk.id === s.skaterId);
                if (skater && skater.finalPosition === null) {
                    skater.finalPosition = idx + 13;
                }
            });
        }

        // 5. Clasificados que no tienen posición (usan posición por fase)
        categorySkaters.forEach(sk => {
            if (sk.finalPosition === null && sk.isQualified) {
                if (sk.finalPhase === 'Final') sk.finalPosition = sk.isQualified ? 4 : 13;
                else if (sk.finalPhase === 'Semifinal') sk.finalPosition = 8;
                else if (sk.finalPhase === 'Cuartos') sk.finalPosition = 12;
            }
        });
    });

    // ORDENAR POR: 1) Categoría, 2) Fase alcanzada (Final primero), 3) Puntaje total, 4) Posición final
    let sortedSkaters = skaterResults.sort((a, b) => {
        // Primero por categoría
        if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId);

        // Luego por fase alcanzada (Final > Semifinal > Cuartos > Preliminar)
        if (b.finalPhaseNum !== a.finalPhaseNum) return b.finalPhaseNum - a.finalPhaseNum;

        // Luego por puntaje total (más alto primero)
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;

        // Luego por posición final del grupo (si existe)
        if (a.finalPosition && b.finalPosition) return a.finalPosition - b.finalPosition;
        if (a.finalPosition && !b.finalPosition) return -1;
        if (!a.finalPosition && b.finalPosition) return 1;

        // Finalmente por seed (más bajo primero)
        return (a.seedNumber || 999) - (b.seedNumber || 999);
    });

    // Crear tabla HTML con formato profesional
    const currentDate = new Date().toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const baseUrl = window.location.href.split('index.html')[0].replace(/\/$/, '');
    const logoUrl = `${baseUrl}/img/logo.png`;

    let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados - Liga Chilena de Inline Freestyle 2026</title>
    <style>
        @page { size: A4 landscape; margin: 15mm; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff;
            color: #222;
            font-size: 11px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .header {
            text-align: center;
            background: linear-gradient(135deg, #0039A6 0%, #FFFFFF 50%, #D52B1E 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(0,57,166,0.8) 0%, rgba(255,255,255,0.6) 50%, rgba(213,43,30,0.8) 100%);
            z-index: 1;
        }
        .header-content {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100px;
        }
        .header-text {
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 26px;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: #000;
        }
        .header p {
            margin: 8px 0 0 0;
            font-size: 13px;
            font-weight: 600;
            color: #111;
        }
        .league-badge {
            display: inline-block;
            background: #0039A6;
            color: #fff;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 10px;
        }
        .league-logo {
            height: 90px;
            object-fit: contain;
            position: absolute;
            left: -15px;
            top: 50%;
            transform: translateY(-50%);
        }
        .date {
            text-align: right;
            font-size: 10px;
            color: #666;
            margin-bottom: 10px;
            font-weight: 600;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background: linear-gradient(135deg, #0039A6 0%, #1e40af 100%);
            color: white;
            padding: 10px 8px;
            text-align: center;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            border: 1px solid #1e3a8a;
        }
        td {
            padding: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
        }
        tr:nth-child(even) {
            background: linear-gradient(90deg, rgba(0,57,166,0.03) 0%, rgba(213,43,30,0.03) 100%);
        }
        tr:hover {
            background: linear-gradient(90deg, rgba(0,57,166,0.08) 0%, rgba(213,43,30,0.08) 100%);
        }
        .category-header {
            background: #0039A6 !important;
            color: white !important;
            font-weight: 700;
            text-align: left;
            padding-left: 15px;
        }
        .skater-name {
            text-align: left;
            font-weight: 600;
            padding-left: 15px;
        }
        .score {
            font-weight: 700;
            color: #D52B1E;
        }
        .score-high {
            color: #0039A6;
            font-size: 12px;
        }
        .score-medium {
            color: #D52B1E;
        }
        .score-low {
            color: #666;
        }
        .position {
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 12px;
            display: inline-block;
            min-width: 30px;
        }
        .pos-1 {
            background: #FFD700;
            color: #000;
        }
        .pos-2 {
            background: #C0C0C0;
            color: #000;
        }
        .pos-3 {
            background: #CD7F32;
            color: #fff;
        }
        .pos-default {
            background: #e2e8f0;
            color: #64748B;
        }
        .qualified {
            background: #0039A6;
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: 600;
        }
        .status-completed {
            color: #10B981;
            font-weight: 600;
            font-size: 9px;
        }
        .status-pending {
            color: #F59E0B;
            font-weight: 600;
            font-size: 9px;
        }
        .footer {
            text-align: center;
            font-size: 9px;
            color: #666;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #0039A6;
            background: linear-gradient(90deg, rgba(0,57,166,0.05) 0%, rgba(213,43,30,0.05) 100%);
            padding: 15px;
            border-radius: 8px;
        }
        .footer-strong {
            font-weight: 700;
            color: #0039A6;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <img src="${logoUrl}" class="league-logo" alt="Logo Liga Chilena">
            <div class="header-text">
                <h1>🏆 LIGA CHILENA DE INLINE FREESTYLE</h1>
                <p>Campeonato Nacional 2026 - Reporte Oficial de Resultados</p>
                <div class="league-badge">⭐ Temporada 2026 ⭐</div>
            </div>
        </div>
    </div>
    <div class="date">📅 Generado: ${currentDate}</div>

    <table>
        <thead>
            <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 80px;">Categoría</th>
                <th style="width: 80px;">ID/WSSA</th>
                <th style="width: 200px;">Patinador</th>
                <th style="width: 50px;">Seed</th>
                <th style="width: 80px;">Fase</th>
                <th style="width: 70px;">Juez 1</th>
                <th style="width: 70px;">Juez 2</th>
                <th style="width: 70px;">Juez 3</th>
                <th style="width: 80px;">TOTAL</th>
                <th style="width: 80px;">Estado</th>
            </tr>
        </thead>
        <tbody>
`;

    let currentCategory = '';
    let categoryPosition = 0;

    sortedSkaters.forEach(sk => {
        const categoryName = sk.categoryName;

        // Si cambia la categoría, agregar separador y resetear posición
        if (categoryName !== currentCategory) {
            currentCategory = categoryName;
            categoryPosition = 1;
            htmlContent += `
            <tr>
                <td colspan="11" class="category-header">
                    <strong>${categoryName}</strong>
                </td>
            </tr>`;
        } else {
            categoryPosition++;
        }

        // Usar los datos ya calculados
        let maxPhase = sk.finalPhase === 'Final' ? '🏆 Final' :
            (sk.finalPhase === 'Semifinal' || sk.finalPhase === 'Semi-Final' || sk.finalPhase === 'Semifinales') ? 'Semifinal' :
                (sk.finalPhase === 'Cuartos' || sk.finalPhase === 'Quarter-Final' || sk.finalPhase === 'Cuartos de Final') ? 'Cuartos' : 'Preliminar';

        let j1Score = sk.j1Score > 0 ? sk.j1Score : '-';
        let j2Score = sk.j2Score > 0 ? sk.j2Score : '-';
        let j3Score = sk.j3Score > 0 ? sk.j3Score : '-';
        let totalScore = sk.totalScore;

        // Determinar clase de puntaje
        let scoreClass = 'score-medium';
        if (totalScore >= 34) scoreClass = 'score-high';
        else if (totalScore < 17) scoreClass = 'score-low';

        // Formatear nombres en MAYÚSCULAS
        const fullName = `${sk.firstName} ${sk.lastName}`.toUpperCase();
        const wssa = sk.externalId || '-';
        const seed = sk.seedNumber > 0 ? `#${sk.seedNumber}` : '-';

        // Estado
        let statusHtml = '-';
        if (categoryPosition === 1 && sk.finalPhaseNum === 4) {
            statusHtml = '<span class="position pos-1">🥇 1º</span>';
        } else if (categoryPosition === 2 && sk.finalPhaseNum === 4) {
            statusHtml = '<span class="position pos-2">🥈 2º</span>';
        } else if (categoryPosition === 3 && sk.finalPhaseNum === 4) {
            statusHtml = '<span class="position pos-3">🥉 3º</span>';
        } else {
            statusHtml = `<span class="position pos-default" style="background: #e2e8f0; color: #64748B;">${categoryPosition}º</span>`;
        }

        htmlContent += `
            <tr>
                <td>${categoryPosition}</td>
                <td>${categoryName.split(' ')[0]}</td>
                <td style="font-family: monospace; font-size: 10px;">${wssa}</td>
                <td class="skater-name">${fullName}</td>
                <td>${seed}</td>
                <td>${maxPhase}</td>
                <td class="${j1Score !== '-' ? 'score-medium' : ''}">${j1Score !== '-' ? j1Score.toFixed(1) : '-'}</td>
                <td class="${j2Score !== '-' ? 'score-medium' : ''}">${j2Score !== '-' ? j2Score.toFixed(1) : '-'}</td>
                <td class="${j3Score !== '-' ? 'score-medium' : ''}">${j3Score !== '-' ? j3Score.toFixed(1) : '-'}</td>
                <td class="score ${scoreClass}">${totalScore > 0 ? totalScore.toFixed(2) : '-'}</td>
                <td>${statusHtml}</td>
            </tr>
        `;
    });

    htmlContent += `
        </tbody>
    </table>

    <div class="footer">
        <p class="footer-strong">🏆 LIGA CHILENA DE INLINE FREESTYLE - TEMPORADA 2026</p>
        <p>Este documento es un reporte oficial de resultados. Para consultas, contactar a la organización.</p>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #0039A6;">
            <p style="font-size: 10px; color: #666;">
                💻 Desarrollado por <strong>Rodrigo Aburto Pereira</strong> - Técnico de Nivel Superior en Informática<br>
                <span style="color: #D52B1E; font-weight: 700;">🚀 VERSIÓN 1.0</span>
            </p>
        </div>
        <img src="${logoUrl}" style="height: 60px; margin-top: 15px;" alt="Logo Liga Chilena">
    </div>
</body>
</html>`;

    showToast('Generando PDF, por favor espera... ⏳');

    if (window.db && window.db.socket) {
        window.db.socket.emit('export-pdf', { html: htmlContent }, (response) => {
            if (response && response.success) {
                // Reconstruir el PDF desde base64 (evita corrupción de Buffer en Socket.IO)
                const binaryStr = atob(response.base64);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `slide_resultados_${new Date().toISOString().split('T')[0]}.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showToast('📄 Reporte PDF exportado exitosamente.');
            } else {
                showToast(response?.message || 'Error al generar el PDF', true);
            }
        });
    } else {
        showToast('No hay conexión con el servidor para generar el PDF', true);
    }
}

// Toast
function showToast(msg, isError = false) {
    let t = document.createElement('div');
    t.className = isError ? 'toast error' : 'toast';
    t.innerHTML = `<i class="ph ph-${isError ? 'warning-circle' : 'check-circle'}" style="color:${isError ? 'var(--danger)' : 'var(--accent)'}; font-size:1.2rem; vertical-align:middle; margin-right:0.4rem;"></i> ${msg}`;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// =========================================
// PODIUM VISUAL & CONFETTI (Propuesta 6)
// =========================================
function showPodium(battleId) {
    const db = window.db.getDB();
    const battle = db.battles.find(b => b.id === battleId);
    if (!battle || battle.status !== 'completed') return null;

    // Ordenar por puntaje
    const sorted = [...battle.skaters].sort((a, b) => b.totalScore - a.totalScore);
    const skaters = db.skaters;

    // Obtener top 3
    const first = sorted[0] ? skaters.find(s => s.id === sorted[0].skaterId) : null;
    const second = sorted[1] ? skaters.find(s => s.id === sorted[1].skaterId) : null;
    const third = sorted[2] ? skaters.find(s => s.id === sorted[2].skaterId) : null;

    return {
        first: first ? {
            name: (first.firstName + ' ' + first.lastName).toUpperCase(),
            score: sorted[0].totalScore,
            initial: first.firstName.charAt(0).toUpperCase()
        } : null,
        second: second ? {
            name: (second.firstName + ' ' + second.lastName).toUpperCase(),
            score: sorted[1].totalScore,
            initial: second.firstName.charAt(0).toUpperCase()
        } : null,
        third: third ? {
            name: (third.firstName + ' ' + third.lastName).toUpperCase(),
            score: sorted[2].totalScore,
            initial: third.firstName.charAt(0).toUpperCase()
        } : null
    };
}

function renderPodiumHTML(podium) {
    if (!podium || (!podium.first && !podium.second && !podium.third)) return '';

    const html = `
        <div class="podium-container">
            ${podium.second ? `
            <div class="podium-place">
                <div class="podium-block second">
                    <div class="podium-avatar" style="border-color:#9CA3AF; font-size:1.8rem;">2º</div>
                    <div class="podium-name">${podium.second.name}</div>
                    <div class="podium-score">${podium.second.score.toFixed(2)}</div>
                </div>
                <div style="font-size:1.5rem; font-weight:900; color:#6B7280; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">2º PLATA</div>
            </div>
            ` : ''}

            ${podium.first ? `
            <div class="podium-place">
                <div class="podium-block first">
                    <div class="podium-crown">👑</div>
                    <div class="podium-avatar" style="border-color:#F59E0B; font-size:1.8rem; box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);">1º</div>
                    <div class="podium-name">${podium.first.name}</div>
                    <div class="podium-score">${podium.first.score.toFixed(2)}</div>
                </div>
                <div style="font-size:1.5rem; font-weight:900; color:#D97706; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">1º ORO</div>
            </div>
            ` : ''}

            ${podium.third ? `
            <div class="podium-place">
                <div class="podium-block third">
                    <div class="podium-avatar" style="border-color:#FB923C; font-size:1.8rem;">3º</div>
                    <div class="podium-name">${podium.third.name}</div>
                    <div class="podium-score">${podium.third.score.toFixed(2)}</div>
                </div>
                <div style="font-size:1.5rem; font-weight:900; color:#C2410C; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">3º BRONCE</div>
            </div>
            ` : ''}
        </div>
    `;

    return html;
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    container.style.display = 'block';
    container.innerHTML = '';

    // Crear 50 confettis
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
        container.appendChild(confetti);
    }

    // Ocultar después de 4 segundos
    setTimeout(() => {
        container.style.display = 'none';
        container.innerHTML = '';
    }, 4000);
}

// Boot up
document.addEventListener('DOMContentLoaded', init);

// Service Worker desactivado para evitar conflictos de caché
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed', err));
    });
}
*/

// Online/Offline detection
window.addEventListener('online', () => {
    showToast('Conexión restaurada', false);
    document.body.classList.remove('is-offline');
});
window.addEventListener('offline', () => {
    showToast('⚠️ CONEXIÓN PERDIDA. Revisa tu internet.', true);
    document.body.classList.add('is-offline');
});
