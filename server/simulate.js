const io = require("socket.io-client");
const crypto = require("crypto");

const URL = process.argv[2] || "http://localhost:3005";
console.log("Conectando a " + URL);
const socket = io(URL);

function uuid() { return crypto.randomUUID(); }

socket.on('connect', () => {
    console.log("Conectado. Generando competencia...");
    
    const skaters = [];
    for(let i=1; i<=12; i++) {
        skaters.push({
            id: uuid(),
            firstName: "Patinador",
            lastName: i.toString(),
            nationality: "AR",
            instagram: "@patinador" + i,
            sponsors: "Ninguno",
            stance: "Regular",
            category: "sen-m"
        });
    }

    const battles = [];
    let bCount = 1;

    function createBattle(phase, groupName, skatersList, isFinal) {
        const battleId = uuid();
        const maxSlots = isFinal ? 5 : 4;
        const bSkaters = skatersList.map(s => {
            const judging = { 'Juez 1': [], 'Juez 2': [], 'Juez 3': [] };
            let j1Total = 0, j2Total = 0, j3Total = 0;
            const roles = ['Juez 1', 'Juez 2', 'Juez 3'];
            
            roles.forEach(role => {
                let scores = [];
                for(let k=0; k<maxSlots; k++) {
                    const sc = parseFloat((Math.random() * (10 - 5) + 5).toFixed(1));
                    scores.push(sc);
                    judging[role].push({
                        trickName: "Trick " + (k+1),
                        score: sc,
                        isSliding: false,
                        finalScore: sc,
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
            
            return {
                skaterId: s.id,
                totalScore: (j1Total + j2Total + j3Total) / 3,
                qualified: false,
                judging: judging
            };
        });

        bSkaters.sort((a,b) => b.totalScore - a.totalScore);
        if(bSkaters.length > 0) bSkaters[0].qualified = true;
        if(bSkaters.length > 1) bSkaters[1].qualified = true;

        return {
            id: battleId,
            categoryId: "sen-m",
            phase: phase,
            groupName: groupName,
            status: "completed",
            skaters: bSkaters,
            order: bCount++
        };
    }

    const g1 = skaters.slice(0, 4);
    const g2 = skaters.slice(4, 8);
    const g3 = skaters.slice(8, 12);
    
    const b1 = createBattle("Cuartos de Final", "Grupo 1", g1, false);
    const b2 = createBattle("Cuartos de Final", "Grupo 2", g2, false);
    const b3 = createBattle("Cuartos de Final", "Grupo 3", g3, false);
    battles.push(b1, b2, b3);

    const qSkaters = [];
    b1.skaters.filter(s=>s.qualified).forEach(s => qSkaters.push(skaters.find(sk=>sk.id===s.skaterId)));
    b2.skaters.filter(s=>s.qualified).forEach(s => qSkaters.push(skaters.find(sk=>sk.id===s.skaterId)));
    b3.skaters.filter(s=>s.qualified).forEach(s => qSkaters.push(skaters.find(sk=>sk.id===s.skaterId)));
    
    const s1 = createBattle("Semifinales", "Grupo 1", qSkaters.slice(0, 3), false);
    const s2 = createBattle("Semifinales", "Grupo 2", qSkaters.slice(3, 6), false);
    battles.push(s1, s2);

    const fSkaters = [];
    s1.skaters.filter(s=>s.qualified).forEach(s => fSkaters.push(skaters.find(sk=>sk.id===s.skaterId)));
    s2.skaters.filter(s=>s.qualified).forEach(s => fSkaters.push(skaters.find(sk=>sk.id===s.skaterId)));

    const finalBattle = createBattle("Final", "Único", fSkaters, true);
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
    console.log("Competencia simulada (12 skaters, 3 jueces) enviada!");
    setTimeout(() => { process.exit(0); }, 1000);
});
