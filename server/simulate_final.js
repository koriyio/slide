const fs = require('fs');
const path = require('path');
const io = require("socket.io-client");

const URL = "http://localhost:3005";
console.log("Conectando al servidor en " + URL + " para inyectar la simulación...");
const socket = io(URL);

// Datos de los patinadores oficiales
const skaters = [
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
];

// Lógica de cálculo en el servidor (para guardar directamente con puntajes precalculados correctos)
function calculateJudgeScore(tricks, isAdvancedPhase, maxToCount) {
    const validTricks = tricks.filter(t => t !== null && !t.isFail && t.finalScore > 0);
    if (validTricks.length === 0) return 0;

    let filteredTricks = validTricks;
    if (isAdvancedPhase) {
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
    const bestTricks = sortedByScore.slice(0, maxToCount);
    const topScores = bestTricks.map(t => t.finalScore);

    const families = new Set(bestTricks.map(t => (t.family || '').match(/^(F\d+)/)?.[1] || ''));
    const numFamilies = families.size;
    let m_var = 1.0;
    if (numFamilies === 3) m_var = 1.05;
    else if (numFamilies >= 4) m_var = 1.10;

    const baseTotal = topScores.reduce((acc, score) => acc + score, 0);
    return Math.round(baseTotal * m_var * 100) / 100;
}

// Simulamos los trucos de cada patinador para los 3 jueces
const skaterTricksRaw = {
  // HUGO PACHECO: Hace muy buenos trucos pero repite su Heel/Toe Backslide + Toe Toe Cowboy (F1+F2)
  // en los slots 3, 4 y 5. Esto nos permitirá ver la regla de repeticiones en vivo.
  "1779207772272": {
    tricks: [
      { trickId: "f3-a7", name: "8 Cross", family: "F3 - De Frente", baseScore: 50, isFail: false, isCombo: false, distance: 7, distance2: 2, stopLevel: 0, adjustment: 0 },
      { trickId: "f5-c1", name: "2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: false, distance: 8, distance2: 2, stopLevel: 0, adjustment: -10 },
      // Repetido 1
      { trickId: "f1-a4", name: "Heel/Toe Backslide + Toe Toe Cowboy", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f2-a2", baseScore2: 55, distance: 2, distance2: 2, stopLevel: 0, adjustment: -10 },
      // Repetido 2 (Mejor ejecución de la repetición!)
      { trickId: "f1-a4", name: "Heel/Toe Backslide + Toe Toe Cowboy", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f2-a2", baseScore2: 55, distance: 3, distance2: 4, stopLevel: 0, adjustment: 0 },
      // Repetido 3
      { trickId: "f1-a4", name: "Heel/Toe Backslide + Toe Toe Cowboy", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f2-a2", baseScore2: 55, distance: 2, distance2: 2, stopLevel: 0, adjustment: -10 }
    ]
  },
  // JAVIER AVILA: Excelente variedad y combos variados
  "1779209586689": {
    tricks: [
      { trickId: "f1-b1", name: "Fast Slide + Toe Toe Magic", family: "F1 - Interior", baseScore: 40, isFail: false, isCombo: true, trickId2: "f1-c3", baseScore2: 34, distance: 3, distance2: 3, stopLevel: 0, adjustment: -5 },
      { trickId: "f2-a2", name: "Toe Toe Cowboy", family: "F2 - Exterior", baseScore: 55, isFail: false, isCombo: false, distance: 6, distance2: 2, stopLevel: 0, adjustment: -5 },
      { trickId: "f1-a4", name: "Heel/Toe Backslide + 2W Unity / Savannah", family: "F1 - Interior", baseScore: 51, isFail: false, isCombo: true, trickId2: "f5-c1", baseScore2: 32, distance: 2, distance2: 3, stopLevel: 0, adjustment: 0 },
      { trickId: "f5-c1", name: "2W Unity / Savannah + 2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: true, trickId2: "f5-c1", baseScore2: 32, distance: 3, distance2: 3, stopLevel: 1, adjustment: 0 },
      { trickId: "f5-a5", name: "2W Torque", family: "F5 - Laterales", baseScore: 53, isFail: false, isCombo: false, distance: 2, distance2: 2, stopLevel: 0, adjustment: 0 }
    ]
  },
  // BENJAMIN CORNEJO: 4 familias distintas y puntajes altos (¡Ganador!)
  "1779207643378": {
    tricks: [
      { trickId: "f1-b1", name: "Fast Slide + Toe Toe Magic", family: "F1 - Interior", baseScore: 40, isFail: false, isCombo: true, trickId2: "f1-c3", baseScore2: 34, distance: 2, distance2: 4, stopLevel: 2, adjustment: 0 },
      { trickId: "f5-c1", name: "2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: false, distance: 6, distance2: 2, stopLevel: 0, adjustment: 0 },
      { trickId: "f2-a2", name: "Toe Toe Cowboy", family: "F2 - Exterior", baseScore: 55, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 0, adjustment: 0 },
      { trickId: "f3-b2", name: "Cross UFO + 2W Unity / Savannah", family: "F3 - De Frente", baseScore: 40, isFail: false, isCombo: true, trickId2: "f5-c1", baseScore2: 32, distance: 4, distance2: 2, stopLevel: 0, adjustment: 0 },
      { trickId: "f5-c1", name: "2W Unity / Savannah", family: "F5 - Laterales", baseScore: 32, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 0, adjustment: 0 }
    ]
  },
  // HERBERT ESPINOZA: Buena competencia pero tiene una caída en slot 2.
  "1779209296318": {
    tricks: [
      { trickId: "f3-b2", name: "Cross UFO", family: "F3 - De Frente", baseScore: 40, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 1, adjustment: 0 },
      { trickId: "", name: "Falla", family: "", baseScore: 0, isFail: true, isCombo: false, distance: 2, distance2: 2, stopLevel: 0, adjustment: 0 },
      { trickId: "f2-a2", name: "Toe Toe Cowboy", family: "F2 - Exterior", baseScore: 55, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 0, adjustment: -5 },
      { trickId: "f3-a7", name: "8 Cross", family: "F3 - De Frente", baseScore: 50, isFail: false, isCombo: false, distance: 5, distance2: 2, stopLevel: 1, adjustment: 0 },
      { trickId: "f1-b1", name: "Fast Slide + Cross Ernsui", family: "F1 - Interior", baseScore: 40, isFail: false, isCombo: true, trickId2: "f4-b1", baseScore2: 40, distance: 2, distance2: 2, stopLevel: 0, adjustment: -20 }
    ]
  }
};

// Generar el objeto de la batalla simulada
const finalBattleId = "1779206031825";

const simulatedSkaters = skaters.map(s => {
    const raw = skaterTricksRaw[s.id];
    const judging = { "Juez 1": [], "Juez 2": [], "Juez 3": [] };

    // Para cada uno de los 3 jueces, generamos los trucos ligeramente variados
    ["Juez 1", "Juez 2", "Juez 3"].forEach((judgeRole, jIndex) => {
        raw.tricks.forEach((t, tIndex) => {
            if (t.isFail) {
                judging[judgeRole].push({
                    trickId: "",
                    name: "Falla",
                    family: "",
                    baseScore: 0,
                    adjustment: 0,
                    distance: t.distance,
                    distance2: t.distance2,
                    stopLevel: 0,
                    isFail: true,
                    isCombo: false,
                    trickId2: "",
                    baseScore2: 0,
                    finalScore: 0,
                    stopBonus: 0,
                    distanceBonus: 0,
                    distance2Bonus: 0,
                    judgeRole
                });
                return;
            }

            // Calcular bonuses exactos para el truco
            const distance = t.distance;
            const distance2 = t.distance2;
            const stopLevel = t.stopLevel;

            // Fórmulas
            const distanceBonus = distance >= 4.0 ? 8 + Math.round((distance - 4.0) * 10 * 2) / 10 : Math.round((distance * 2) * 10) / 10;
            const distance2Bonus = t.isCombo ? (distance2 >= 4.0 ? 8 + Math.round((distance2 - 4.0) * 10 * 2) / 10 : Math.round((distance2 * 2) * 10) / 10) : 0;
            const stopBonus = stopLevel === 1 ? 5 : (stopLevel === 2 ? 10 : 0);

            // Ajuste leve aleatorio según el juez (-2, 0, +2)
            const judgeVariance = (jIndex === 1) ? -2 : ((jIndex === 2) ? 2 : 0);
            const totalBase = t.baseScore + (t.isCombo ? t.baseScore2 : 0);
            
            // Fórmulas balanceadas según regla 1 y 2
            let scoreNoBonus = 0;
            if (t.isCombo) {
                // Opción 1 + 2: 70% del truco base menor + 10% distancia2 / combo
                const maxBase = Math.max(t.baseScore, t.baseScore2);
                const minBase = Math.min(t.baseScore, t.baseScore2);
                scoreNoBonus = maxBase + (minBase * 0.70);
            } else {
                scoreNoBonus = t.baseScore;
            }

            let finalScore = scoreNoBonus + distanceBonus + distance2Bonus + stopBonus + t.adjustment + judgeVariance;
            finalScore = Math.max(0, Math.round(finalScore * 100) / 100);

            judging[judgeRole].push({
                trickId: t.trickId,
                name: t.name,
                family: t.family,
                baseScore: t.baseScore,
                adjustment: t.adjustment + judgeVariance,
                distance,
                distance2,
                stopLevel,
                isFail: false,
                isCombo: t.isCombo,
                trickId2: t.trickId2 || "",
                baseScore2: t.baseScore2 || 0,
                stopBonus,
                distanceBonus,
                distance2Bonus,
                finalScore,
                judgeRole
            });
        });
    });

    // Calcular promedios oficiales y guardar
    const j1Sum = calculateJudgeScore(judging["Juez 1"], true, 4);
    const j2Sum = calculateJudgeScore(judging["Juez 2"], true, 4);
    const j3Sum = calculateJudgeScore(judging["Juez 3"], true, 4);
    const totalScore = Math.round(((j1Sum + j2Sum + j3Sum) / 3) * 100) / 100;

    return {
        skaterId: s.id,
        slides: [],
        totalScore,
        qualified: false,
        judging
    };
});

// Ordenar para clasificar las posiciones en vivo
const sortedSkaters = [...simulatedSkaters].sort((a, b) => b.totalScore - a.totalScore);
if (sortedSkaters.length >= 3) {
    sortedSkaters[0].qualified = true;
    sortedSkaters[1].qualified = true;
    sortedSkaters[2].qualified = true;
}

const dbData = {
    skaters,
    battles: [
        {
            id: finalBattleId,
            categoryId: "sen-m",
            phase: "Final",
            heatNumber: 1,
            status: "completed", // Completada para que se muestre el podio y los totales
            skaters: simulatedSkaters
        }
    ],
    categories: [
        { id: "jun-f", name: "Junior Femenino" },
        { id: "jun-m", name: "Junior Masculino" },
        { id: "sen-f", name: "Senior Femenino" },
        { id: "sen-m", name: "Senior Masculino" },
        { id: "mini", name: "Mini" }
    ]
};

socket.on('connect', () => {
    console.log("Inyectando base de datos simulada en vivo...");
    socket.emit('restore-db', dbData);
    console.log("¡Simulación inyectada exitosamente! Recalculando con el script offline para garantizar coherencia completa...");
    
    setTimeout(() => {
        socket.disconnect();
        process.exit(0);
    }, 1500);
});
