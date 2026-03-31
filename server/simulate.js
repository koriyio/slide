const io = require("socket.io-client");
const crypto = require("crypto");

const URL = process.argv[2] || "http://localhost:3005";
console.log("Conectando a " + URL);
const socket = io(URL);

function uuid() { return crypto.randomUUID(); }

socket.on('connect', () => {
    console.log("Conectado. Generando competencia de 18 Senior Masculino...");
    
    const names = [
        ["Matías", "González"], ["Benjamín", "Muñoz"], ["Joaquín", "Rojas"],
        ["Nicolás", "Díaz"], ["Cristóbal", "Pérez"], ["Felipe", "Soto"],
        ["Sebastián", "Contreras"], ["Diego", "Silva"], ["Tomás", "Martínez"],
        ["Lucas", "Sepúlveda"], ["Martín", "Morales"], ["Vicente", "Rodríguez"],
        ["Rodrigo", "López"], ["Alejandro", "Fuentes"], ["Gonzalo", "Hernández"],
        ["Ignacio", "Vásquez"], ["Javier", "García"], ["Gabriel", "Reyes"]
    ];

    const skaters = names.map((n, i) => ({
        id: uuid(),
        firstName: n[0],
        lastName: n[1],
        nationality: "CL",
        instagram: "@" + n[0].toLowerCase(),
        sponsors: "Slide Chile",
        stance: i % 2 === 0 ? "Regular" : "Goofy",
        category: "sen-m",
        seedNumber: i + 1,
        externalId: "WSSA-" + (200000 + i)
    }));

    const battles = [];
    let bCount = 1;

    function createBattle(phase, groupName, skatersList, isFinal) {
        const maxSlots = isFinal ? 5 : 4;
        const roles = ['Juez 1', 'Juez 2', 'Juez 3'];
        const judging = { 'Juez 1': [], 'Juez 2': [], 'Juez 3': [] };

        const bSkaters = skatersList.map(s => {
            let j1Total = 0, j2Total = 0, j3Total = 0;
            roles.forEach(role => {
                let scores = [];
                for(let k=0; k<maxSlots; k++) {
                    const baseS = parseFloat((Math.random() * (10 - 5) + 5).toFixed(1));
                    const distM = parseFloat((Math.random() * 3 + 2).toFixed(1));
                    const execL = Math.floor(Math.random() * 3) + 1;
                    const stopL = Math.floor(Math.random() * 2) + 1;
                    
                    const m_dist = distM < 4.0 ? distM / 4.0 : 1.0 + (distM - 4.0) * 0.1;
                    const m_exec = { 1: 1.0, 2: 0.8, 3: 0.6 }[execL];
                    const m_stop = { 1: 1.0, 2: 0.5 }[stopL];

                    const scoreBeforeStop = baseS * m_dist * m_exec;
                    const finalS = scoreBeforeStop * m_stop;

                    scores.push(finalS);
                    judging[role].push({
                        trickId: "f1-e1",
                        name: "Slide Test " + (k+1),
                        family: "F" + (Math.floor(Math.random() * 4) + 1),
                        baseScore: baseS,
                        distanceMeters: distM,
                        executionLevel: execL,
                        stopLevel: stopL,
                        stopBonus: Math.round((finalS - scoreBeforeStop) * 10) / 10,
                        isFail: false,
                        finalScore: Math.round(finalS * 100) / 100,
                        judgeRole: role
                    });
                }
                let sCopy = [...scores].sort((a,b)=>b-a);
                const maxCount = isFinal ? 4 : 3;
                let sum = sCopy.slice(0, maxCount).reduce((a,b)=>a+b, 0);
                if(role === 'Juez 1') j1Total = sum;
                if(role === 'Juez 2') j2Total = sum;
                if(role === 'Juez 3') j3Total = sum;
            });

            const totalSum = (j1Total + j2Total + j3Total);
            return {
                skaterId: s.id,
                totalScore: Math.round(totalSum * 100) / 100,
                qualified: false,
                judging: JSON.parse(JSON.stringify(judging))
            };
        });

        // Clasificar los 2 mejores
        bSkaters.sort((a, b) => b.totalScore - a.totalScore);
        if (bSkaters.length >= 2) {
            bSkaters[0].qualified = true;
            bSkaters[1].qualified = true;
        }

        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            categoryId: "sen-m",
            phase: phase,
            groupName: groupName,
            status: "completed",
            skaters: bSkaters,
            order: bCount++
        };
    }

    // 18 skaters: 5 heats (4,4,4,3,3)
    const h1 = skaters.slice(0, 4);
    const h2 = skaters.slice(4, 8);
    const h3 = skaters.slice(8, 12);
    const h4 = skaters.slice(12, 15);
    const h5 = skaters.slice(15, 18);
    
    const b1 = createBattle("Preliminar", "Heat 1", h1, false);
    const b2 = createBattle("Preliminar", "Heat 2", h2, false);
    const b3 = createBattle("Preliminar", "Heat 3", h3, false);
    const b4 = createBattle("Preliminar", "Heat 4", h4, false);
    const b5 = createBattle("Preliminar", "Heat 5", h5, false);
    battles.push(b1, b2, b3, b4, b5);

    // Semifinales (10 clasificados -> 2 grupos de 5)
    const qualifiedFromHeats = [];
    [b1, b2, b3, b4, b5].forEach(b => {
        b.skaters.filter(s => s.qualified).forEach(s => {
            qualifiedFromHeats.push(skaters.find(sk => sk.id === s.skaterId));
        });
    });

    const s1 = createBattle("Semifinales", "Grupo 1", qualifiedFromHeats.slice(0, 5), false);
    const s2 = createBattle("Semifinales", "Grupo 2", qualifiedFromHeats.slice(5, 10), false);
    battles.push(s1, s2);

    // Final (4 clasificados)
    const finalSkaters = [];
    [s1, s2].forEach(s => {
        s.skaters.filter(sk => sk.qualified).forEach(sk => {
            finalSkaters.push(skaters.find(sktr => sktr.id === sk.skaterId));
        });
    });

    const finalBattle = createBattle("Final", "Único", finalSkaters, true);
    battles.push(finalBattle);

    let db = {
        skaters: skaters,
        battles: battles,
        categories: [
            { id: 'jun-f', name: 'Junior Femenino' },
            { id: 'jun-m', name: 'Junior Masculino' },
            { id: 'sen-f', name: 'Senior Femenino' },
            { id: 'sen-m', name: 'Senior Masculino' },
            { id: 'mini', name: 'Mini' }
        ]
    };

    socket.emit('restore-db', db);
    console.log("¡Simulación completada! 18 participantes, Heats, Semis y Final generados.");
    
    setTimeout(() => {
        socket.disconnect();
        process.exit(0);
    }, 2000);
});
