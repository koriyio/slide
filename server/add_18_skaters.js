const io = require("socket.io-client");
const URL = "http://localhost:3005";
const socket = io(URL);

const skaters = [
    { rank: 1, name: "MATÍAS GONZÁLEZ", nat: "CL", id: "WSSA-202601" },
    { rank: 2, name: "BENJAMÍN MUÑOZ", nat: "CL", id: "WSSA-202602" },
    { rank: 3, name: "JOAQUÍN ROJAS", nat: "CL", id: "WSSA-202603" },
    { rank: 4, name: "NICOLÁS DÍAZ", nat: "CL", id: "WSSA-202604" },
    { rank: 5, name: "CRISTÓBAL PÉREZ", nat: "CL", id: "WSSA-202605" },
    { rank: 6, name: "FELIPE SOTO", nat: "CL", id: "WSSA-202606" },
    { rank: 7, name: "SEBASTIÁN CONTRERAS", nat: "CL", id: "WSSA-202607" },
    { rank: 8, name: "DIEGO SILVA", nat: "CL", id: "WSSA-202608" },
    { rank: 9, name: "TOMÁS MARTÍNEZ", nat: "CL", id: "WSSA-202609" },
    { rank: 10, name: "LUCAS SEPÚLVEDA", nat: "CL", id: "WSSA-202610" },
    { rank: 11, name: "MARTÍN MORALES", nat: "CL", id: "WSSA-202611" },
    { rank: 12, name: "VICENTE RODRÍGUEZ", nat: "CL", id: "WSSA-202612" },
    { rank: 13, name: "RODRIGO LÓPEZ", nat: "CL", id: "WSSA-202613" },
    { rank: 14, name: "ALEJANDRO FUENTES", nat: "CL", id: "WSSA-202614" },
    { rank: 15, name: "GONZALO HERNÁNDEZ", nat: "CL", id: "WSSA-202615" },
    { rank: 16, name: "IGNACIO VÁSQUEZ", nat: "CL", id: "WSSA-202616" },
    { rank: 17, name: "JAVIER GARCÍA", nat: "CL", id: "WSSA-202617" },
    { rank: 18, name: "GABRIEL REYES", nat: "CL", id: "WSSA-202618" }
];

socket.on('connect', () => {
    console.log("Conectado al servidor. Agregando 18 patinadores...");
    
    skaters.forEach((s, i) => {
        const nameParts = s.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        const skater = {
            id: Date.now() + i,
            firstName: firstName,
            lastName: lastName,
            categoryId: 'sen-m',
            seedNumber: s.rank,
            externalId: s.id,
            nationality: s.nat
        };
        
        socket.emit('add-skater', skater);
    });
    
    console.log("Patinadores enviados.");
    setTimeout(() => {
        socket.disconnect();
        process.exit(0);
    }, 1000);
});
