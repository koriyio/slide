const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

const restoredCleanDB = {
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
        {
          "skaterId": "1779207772272",
          "slides": [],
          "totalScore": 0,
          "qualified": false,
          "judging": {
            "Juez 1": [],
            "Juez 2": [],
            "Juez 3": []
          }
        },
        {
          "skaterId": "1779209586689",
          "slides": [],
          "totalScore": 0,
          "qualified": false,
          "judging": {
            "Juez 1": [],
            "Juez 2": [],
            "Juez 3": []
          }
        },
        {
          "skaterId": "1779207643378",
          "slides": [],
          "totalScore": 0,
          "qualified": false,
          "judging": {
            "Juez 1": [],
            "Juez 2": [],
            "Juez 3": []
          }
        },
        {
          "skaterId": "1779209296318",
          "slides": [],
          "totalScore": 0,
          "qualified": false,
          "judging": {
            "Juez 1": [],
            "Juez 2": [],
            "Juez 3": []
          }
        }
      ]
    }
  ],
  "categories": [
    {
      "id": "jun-f",
      "name": "Junior Femenino"
    },
    {
      "id": "jun-m",
      "name": "Junior Masculino"
    },
    {
      "id": "sen-f",
      "name": "Senior Femenino"
    },
    {
      "id": "sen-m",
      "name": "Senior Masculino"
    },
    {
      "id": "mini",
      "name": "Mini"
    }
  ]
};

fs.writeFileSync(dbPath, JSON.stringify(restoredCleanDB, null, 2), 'utf8');
console.log("¡Base de datos restaurada y reseteada! La batalla de Final 1 ahora está lista y en progreso.");
