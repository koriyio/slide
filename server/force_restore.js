const io = require("socket.io-client");
const URL = "http://localhost:3005";
const socket = io(URL);

const fullDB = {
  "skaters": [
    { "id": "1", "firstName": "MATÍAS", "lastName": "GONZÁLEZ", "categoryId": "sen-m", "seedNumber": 1, "externalId": "WSSA-202601", "nationality": "CL" },
    { "id": "2", "firstName": "BENJAMÍN", "lastName": "MUÑOZ", "categoryId": "sen-m", "seedNumber": 2, "externalId": "WSSA-202602", "nationality": "CL" },
    { "id": "3", "firstName": "JOAQUÍN", "lastName": "ROJAS", "categoryId": "sen-m", "seedNumber": 3, "externalId": "WSSA-202603", "nationality": "CL" },
    { "id": "4", "firstName": "NICOLÁS", "lastName": "DÍAZ", "categoryId": "sen-m", "seedNumber": 4, "externalId": "WSSA-202604", "nationality": "CL" },
    { "id": "5", "firstName": "CRISTÓBAL", "lastName": "PÉREZ", "categoryId": "sen-m", "seedNumber": 5, "externalId": "WSSA-202605", "nationality": "CL" },
    { "id": "6", "firstName": "FELIPE", "lastName": "SOTO", "categoryId": "sen-m", "seedNumber": 6, "externalId": "WSSA-202606", "nationality": "CL" },
    { "id": "7", "firstName": "SEBASTIÁN", "lastName": "CONTRERAS", "categoryId": "sen-m", "seedNumber": 7, "externalId": "WSSA-202607", "nationality": "CL" },
    { "id": "8", "firstName": "DIEGO", "lastName": "SILVA", "categoryId": "sen-m", "seedNumber": 8, "externalId": "WSSA-202608", "nationality": "CL" },
    { "id": "9", "firstName": "TOMÁS", "lastName": "MARTÍNEZ", "categoryId": "sen-m", "seedNumber": 9, "externalId": "WSSA-202609", "nationality": "CL" },
    { "id": "10", "firstName": "LUCAS", "lastName": "SEPÚLVEDA", "categoryId": "sen-m", "seedNumber": 10, "externalId": "WSSA-202610", "nationality": "CL" },
    { "id": "11", "firstName": "MARTÍN", "lastName": "MORALES", "categoryId": "sen-m", "seedNumber": 11, "externalId": "WSSA-202611", "nationality": "CL" },
    { "id": "12", "firstName": "VICENTE", "lastName": "RODRÍGUEZ", "categoryId": "sen-m", "seedNumber": 12, "externalId": "WSSA-202612", "nationality": "CL" },
    { "id": "13", "firstName": "RODRIGO", "lastName": "LÓPEZ", "categoryId": "sen-m", "seedNumber": 13, "externalId": "WSSA-202613", "nationality": "CL" },
    { "id": "14", "firstName": "ALEJANDRO", "lastName": "FUENTES", "categoryId": "sen-m", "seedNumber": 14, "externalId": "WSSA-202614", "nationality": "CL" },
    { "id": "15", "firstName": "GONZALO", "lastName": "HERNÁNDEZ", "categoryId": "sen-m", "seedNumber": 15, "externalId": "WSSA-202615", "nationality": "CL" },
    { "id": "16", "firstName": "IGNACIO", "lastName": "VÁSQUEZ", "categoryId": "sen-m", "seedNumber": 16, "externalId": "WSSA-202616", "nationality": "CL" },
    { "id": "17", "firstName": "JAVIER", "lastName": "GARCÍA", "categoryId": "sen-m", "seedNumber": 17, "externalId": "WSSA-202617", "nationality": "CL" },
    { "id": "18", "firstName": "GABRIEL", "lastName": "REYES", "categoryId": "sen-m", "seedNumber": 18, "externalId": "WSSA-202618", "nationality": "CL" }
  ],
  "battles": [],
  "categories": [
    { "id": "jun-f", "name": "Junior Femenino" },
    { "id": "jun-m", "name": "Junior Masculino" },
    { "id": "sen-f", "name": "Senior Femenino" },
    { "id": "sen-m", "name": "Senior Masculino" },
    { "id": "mini", "name": "Mini" }
  ]
};

socket.on('connect', () => {
    console.log("Conectado. Logueando como Admin...");
    socket.emit('login', { role: 'Juez 1', user: 'Slide', pass: 'slide2026' }, (response) => {
        if (response && response.success) {
            console.log("Login exitoso. Restaurando DB...");
            socket.emit('restore-db', fullDB);
            console.log("Patinadores actualizados en memoria y disco.");
            setTimeout(() => {
                socket.disconnect();
                process.exit(0);
            }, 1000);
        } else {
            console.error("Error de login:", response?.message);
            // Si el login falla porque ya está en uso, intentaremos resetear de todas formas por si acaso
            socket.emit('restore-db', fullDB);
             setTimeout(() => {
                socket.disconnect();
                process.exit(0);
            }, 1000);
        }
    });
});
