const io = require("socket.io-client");
const fs = require('fs');
const path = require('path');

const URL = "http://localhost:3005";
console.log("================================══════════════════════");
console.log("   INJECTOR DE DERRAPES EN TIEMPO REAL - FINAL 1");
console.log("================================══════════════════════");
console.log("Conectando a " + URL + "...");

const socket = io(URL);

// Datos limpios iniciales de la batalla
const cleanDB = {
  "skaters": [
    {
      "id": "1779209586689",
      "firstName": "Avila",
      "lastName": "Moreira Javier Ignacio",
      "categoryId": "sen-m",
      "seedNumber": 17,
      "externalId": "12003CHI5734671318",
      "nationality": "CHI"
    },
    {
      "id": "1779209296318",
      "firstName": "Espinoza",
      "lastName": "Carrillo Herbert Ignacio",
      "categoryId": "sen-m",
      "seedNumber": 19,
      "externalId": "11993CHI4095401041",
      "nationality": "CHI"
    },
    {
      "id": "1779207772272",
      "firstName": "Pacheco",
      "lastName": "Sandoval Hugo Eneique",
      "categoryId": "sen-m",
      "seedNumber": 25,
      "externalId": "12009CHI9521646509",
      "nationality": "CHI"
    },
    {
      "id": "1779207643378",
      "firstName": "Cornejo",
      "lastName": "Jara Benjamin",
      "categoryId": "sen-m",
      "seedNumber": 28,
      "externalId": "12011CHI2834600458",
      "nationality": "CHI"
    }
  ],
  "battles": [
    {
      "id": "1779206031825",
      "categoryId": "sen-m",
      "phase": "Final",
      "heatNumber": 1,
      "status": "progress",
      "skaters": [
        { "skaterId": "1779207772272", "slides": [], "totalScore": 0, "qualified": false },
        { "skaterId": "1779209586689", "slides": [], "totalScore": 0, "qualified": false },
        { "skaterId": "1779207643378", "slides": [], "totalScore": 0, "qualified": false },
        { "skaterId": "1779209296318", "slides": [], "totalScore": 0, "qualified": false }
      ]
    }
  ],
  "categories": [
    { "id": "jun-f", "name": "Junior Femenino" },
    { "id": "jun-m", "name": "Junior Masculino" },
    { "id": "sen-f", "name": "Senior Femenino" },
    { "id": "sen-m", "name": "Senior Masculino" },
    { "id": "mini", "name": "Mini" }
  ]
};

// Trucos de los patinadores para inyectar
const skaterTricks = {
  // HUGO PACHECO: repite el Heel/Toe Backslide + Toe Toe Cowboy (F1+F2) en slots 3, 4 y 5.
  "1779207772272": [
    { trickId: "f3-a7", name: "8 Cross", family: "F3 - De Frente", baseScore: 50, isFail: false, isCombo: false, distance: 7, distance2: 2, stopLevel: 0, adjustment: 0 },
    { trickId: "f5-c1", name: "2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: false, distance: 8, distance2: 2, stopLevel: 0, adjustment: -10 },
    { trickId: "f1-a4", name: "Heel/Toe Backslide + Toe Toe Cowboy", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f2-a2", baseScore2: 55, distance: 2, distance2: 2, stopLevel: 0, adjustment: -10 },
    { trickId: "f1-a4", name: "Heel/Toe Backslide + Toe Toe Cowboy", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f2-a2", baseScore2: 55, distance: 3, distance2: 4, stopLevel: 0, adjustment: 0 },
    { trickId: "f1-a4", name: "Heel/Toe Backslide + Toe Toe Cowboy", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f2-a2", baseScore2: 55, distance: 2, distance2: 2, stopLevel: 0, adjustment: -10 }
  ],
  // JAVIER AVILA: Excelente consistencia y variedad.
  "1779209586689": [
    { trickId: "f1-b1", name: "Fast Slide + Toe Toe Magic", family: "F1 - Interior", baseScore: 40, isFail: false, isCombo: true, trickId2: "f1-c3", baseScore2: 34, distance: 3, distance2: 3, stopLevel: 0, adjustment: -5 },
    { trickId: "f2-a2", name: "Toe Toe Cowboy", family: "F2 - Exterior", baseScore: 55, isFail: false, isCombo: false, distance: 6, distance2: 2, stopLevel: 0, adjustment: -5 },
    { trickId: "f1-a4", name: "Heel/Toe Backslide + 2W Unity / Savannah", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f5-c1", baseScore2: 32, distance: 2, distance2: 3, stopLevel: 0, adjustment: 0 },
    { trickId: "f5-c1", name: "2W Unity / Savannah + 2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: true, trickId2: "f5-c1", baseScore2: 32, distance: 3, distance2: 3, stopLevel: 1, adjustment: 0 },
    { trickId: "f5-a5", name: "2W Torque", family: "F5 - Laterales", baseScore: 53, isFail: false, isCombo: false, distance: 2, distance2: 2, stopLevel: 0, adjustment: 0 }
  ],
  // BENJAMIN CORNEJO: Ganador con gran variedad de familias.
  "1779207643378": [
    { trickId: "f1-b1", name: "Fast Slide + Toe Toe Magic", family: "F1 - Interior", baseScore: 40, isFail: false, isCombo: true, trickId2: "f1-c3", baseScore2: 34, distance: 2, distance2: 4, stopLevel: 2, adjustment: 0 },
    { trickId: "f5-c1", name: "2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: false, distance: 6, distance2: 2, stopLevel: 0, adjustment: 0 },
    { trickId: "f2-a2", name: "Toe Toe Cowboy", family: "F2 - Exterior", baseScore: 55, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 0, adjustment: 0 },
    { trickId: "f3-b2", name: "Cross UFO + 2W Unity / Savannah", family: "F3 - De Frente", baseScore: 40, isFail: false, isCombo: true, trickId2: "f5-c1", baseScore2: 32, distance: 4, distance2: 2, stopLevel: 0, adjustment: 0 },
    { trickId: "f5-c1", name: "2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 0, adjustment: 0 }
  ],
  // HERBERT ESPINOZA: Una falla en ronda 2.
  "1779209296318": [
    { trickId: "f3-b2", name: "Cross UFO", family: "F3 - De Frente", baseScore: 40, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 1, adjustment: 0 },
    { trickId: "", name: "Falla", family: "", baseScore: 0, isFail: true, isCombo: false, distance: 2, distance2: 2, stopLevel: 0, adjustment: 0 },
    { trickId: "f2-a2", name: "Toe Toe Cowboy", family: "F2 - Exterior", baseScore: 55, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 0, adjustment: -5 },
    { trickId: "f3-a7", name: "8 Cross", family: "F3 - De Frente", baseScore: 50, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 1, adjustment: 0 },
    { trickId: "f1-b1", name: "Fast Slide + Cross Ernsui", family: "F1 - Interior", baseScore: 40, isFail: false, isCombo: true, trickId2: "f4-b1", baseScore2: 40, distance: 2, distance2: 2, stopLevel: 0, adjustment: -20 }
  ]
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

socket.on('connect', async () => {
  console.log("¡Conexión establecida con éxito! ✓");
  
  // 1. Login como Administrador (Juez 1)
  console.log("Iniciando sesión como Administrador...");
  socket.emit('login', { role: 'Juez 1', user: 'Slide', pass: 'slide2026' }, async (response) => {
    if (!response || !response.success) {
      console.error("❌ Error de login:", response?.message);
      process.exit(1);
    }
    console.log("¡Login exitoso! ✓");

    // 2. Resetear base de datos para limpiar cualquier resultado previo
    console.log("Reiniciando base de datos a estado limpio...");
    socket.emit('restore-db', cleanDB);
    await delay(1000);
    console.log("¡Base de datos limpia y lista! ✓");

    // 3. Comenzar la inyección paso a paso
    console.log("\n================ PAGE REBOOTED ==================");
    console.log("¡Revisa tu pantalla! Verás cómo ingresan los trucos...");
    console.log("=================================================");

    const roles = ["Juez 1", "Juez 2", "Juez 3"];
    const skaterIds = Object.keys(skaterTricks);

    // Iteramos por los 5 slots (una ronda de trucos a la vez para todos los patinadores)
    for (let slotIndex = 0; slotIndex < 5; slotIndex++) {
      console.log(`\n--- RONDA ${slotIndex + 1} DE TRUCOS ---`);
      
      for (const skaterId of skaterIds) {
        const skater = cleanDB.skaters.find(s => s.id === skaterId);
        const name = `${skater.firstName} ${skater.lastName}`;
        const trick = skaterTricks[skaterId][slotIndex];

        console.log(`Inyectando truco para ${name}: ${trick.name || 'Falla'}`);

        // Cada Juez guarda su versión (con variaciones leves)
        for (let jIndex = 0; jIndex < roles.length; jIndex++) {
          const role = roles[jIndex];
          const judgeVariance = (jIndex === 1) ? -2 : ((jIndex === 2) ? 2 : 0);

          const trickPerformed = {
            ...trick,
            adjustment: trick.isFail ? 0 : (trick.adjustment + judgeVariance)
          };

          socket.emit('save-trick', {
            battleId: "1779206031825",
            skaterId,
            trickPerformed,
            role,
            slotIndex
          });
        }
        
        // Esperar 400ms para crear el efecto de digitación real
        await delay(400);
      }
      
      // Esperar 800ms entre rondas
      await delay(800);
    }

    // 4. Finalizar la batalla para mostrar el podio automáticamente
    console.log("\nFinalizando batalla...");
    socket.emit('finish-battle', "1779206031825", (res) => {
      if (res && res.success) {
        console.log("¡Batalla finalizada con éxito!");
        console.log("🏆 ¡Podio y medallas desplegadas!");
      } else {
        console.warn("Advertencia al finalizar batalla:", res?.message);
      }
    });

    await delay(1500);
    console.log("\n=================================================");
    console.log(" ¡Inyección en tiempo real finalizada con éxito! ✓");
    console.log("=================================================");
    socket.disconnect();
    process.exit(0);
  });
});
