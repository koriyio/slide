# 🛼 Slide Battle - Sistema de Jueceo para Inline Freestyle

[![Deploy to Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)

Sistema de gestión y jueceo en tiempo real para competiciones de **Inline Freestyle Slalom**. Diseñado para la **Liga Chilena de Inline Freestyle**.

## 🌐 Demo en Vivo

Prueba el sistema en: **https://slide-3b76.onrender.com/**

> ⚠️ **Nota:** La primera carga puede tardar ~30 segundos ya que Render pone en hibernación los servicios gratuitos.

---

## 🚀 Características

- ✅ **Autenticación multi-rol** - Juez 1 (Admin), Juez 2, Juez 3
- ✅ **Sincronización en tiempo real** - Todos los jueces ven los cambios instantáneamente
- ✅ **Gestión de patinadores** - Inscripción individual o masiva desde Excel
- ✅ **Generación automática de grupos** - Algoritmo tipo "serpentine" para distribución justa
- ✅ **Sistema de puntuación** - Trucos con base, distancia, y ajustes
- ✅ **Llaves de torneo** - Preliminares, Semifinal, Final
- ✅ **Exportación de reportes** - CSV y PDF
- ✅ **Respaldo y restauración** - Backup completo de la base de datos

---

## 📋 Requisitos

- **Node.js** >= 18.0.0
- **npm** o **yarn**
- Navegador moderno (Chrome, Firefox, Edge)

---

## 🛠️ Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/koriyio/slide.git
cd slide
```

### 2. Instalar dependencias

```bash
cd server
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `server/`:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
# Autenticación
JUEZ1_USER=Slide
JUEZ1_PASS=slide2026
JUEZ2_USER=juez2
JUEZ2_PASS=slide
JUEZ3_USER=juez3
JUEZ3_PASS=slide

# Configuración
NODE_ENV=development
PORT=3005
CORS_ORIGIN=http://localhost:3005
```

### 4. Iniciar el servidor

**Desarrollo (con auto-reload):**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

### 5. Abrir la aplicación

Navega a: **http://localhost:3005**

---

## 🔐 Credenciales por Defecto

| Rol | Usuario | Contraseña | Permisos |
|-----|---------|------------|----------|
| **Juez 1** (Admin) | `Slide` | `slide2026` | Todos (gestionar patinadores, generar grupos, finalizar batallas) |
| **Juez 2** | `juez2` | `slide` | Solo registrar trucos |
| **Juez 3** | `juez3` | `slide` | Solo registrar trucos |

> ⚠️ **IMPORTANTE:** Cambia estas credenciales en producción editando el archivo `.env` o las variables de entorno en Render.

---

## 📊 Uso del Sistema

### Flujo de Competencia

1. **Inscribir Patinadores**
   - Ve a "Competidores" → "Inscribir Patinador"
   - O usa "Importar Masivo" para pegar datos desde Excel

2. **Generar Grupos (Heats)**
   - Ve a "Batallas"
   - Selecciona una categoría
   - Presiona "Generar Grupos"
   - El sistema distribuye automáticamente según ranking

3. **Jueceo de Batallas**
   - Haz clic en una batalla para abrir la mesa de jueceo
   - Cada juez se conecta desde su dispositivo
   - Registra trucos: busca, selecciona distancia, ajusta puntaje
   - El sistema calcula promedios en tiempo real

4. **Finalizar Batalla**
   - Solo Juez 1 puede finalizar
   - Los 2 mejores clasifican a la siguiente fase

5. **Generar Siguiente Fase**
   - El sistema crea automáticamente Semifinal o Final
   - Los clasificados avanzan

6. **Exportar Resultados**
   - Ve a "Exportar Reporte" para descargar PDF/CSV

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  index.html + CSS + Vanilla JS (sin framework)      │
└─────────────────────────────────────────────────────┘
                         ↕ WebSocket (Socket.IO)
┌─────────────────────────────────────────────────────┐
│                    Backend                           │
│  Node.js + Express + Socket.IO                      │
│  - Autenticación con variables de entorno           │
│  - Autorización por roles                           │
│  - Logging de auditoría                             │
└─────────────────────────────────────────────────────┘
                         ↕ File System
┌─────────────────────────────────────────────────────┐
│                  Base de Datos                       │
│  JSON file (server/db.json)                         │
│  - skaters, battles, categories                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Seguridad

### Implementado

- ✅ **Autenticación con credenciales** desde variables de entorno
- ✅ **Autorización por roles** - Solo Juez 1 puede administrar
- ✅ **CORS configurado** para dominios específicos
- ✅ **Validación de inputs** en todos los endpoints
- ✅ **Logging de auditoría** - Todas las acciones críticas se registran
- ✅ **Límite de tamaño** en requests (1MB)
- ✅ **Escritura asíncrona** de DB con debounce

### Recomendaciones para Producción

1. **Cambia las credenciales por defecto** en `.env`
2. **Configura `CORS_ORIGIN`** con tu dominio real
3. **Usa HTTPS** (Render lo provee automáticamente)
4. **Haz backup regular** de `server/db.json`

---

## 🌍 Despliegue en Render

### Pasos para Deploy

1. **Crea una cuenta en [Render](https://render.com)**

2. **Conecta tu repositorio de GitHub**

3. **Crea un nuevo servicio "Web Service"**

4. **Configura:**
   - **Name:** `slide-battle`
   - **Environment:** `Node`
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && node server.js`

5. **Agrega Variables de Entorno:**
   ```
   NODE_ENV=production
   JUEZ1_USER=TuUsuarioAdmin
   JUEZ1_PASS=TuContraseñaSegura123
   CORS_ORIGIN=https://slide-battle.onrender.com
   ```

6. **Deploy** - Render construirá y desplegará automáticamente

### render.yaml

El proyecto incluye `render.yaml` para Infrastructure as Code:

```yaml
services:
  - type: web
    name: slide-battle-live
    env: node
    buildCommand: "cd server && npm install"
    startCommand: "cd server && node server.js"
    envVars:
      - key: NODE_ENV
        value: production
```

---

## 📁 Estructura del Proyecto

```
slide/
├── server/
│   ├── server.js          # Servidor Express + Socket.IO
│   ├── db.json            # Base de datos (no trackear en git)
│   ├── package.json       # Dependencias
│   └── .env.example       # Plantilla de variables de entorno
├── index.html             # Frontend principal
├── css/
│   └── style.css          # Estilos con tema chileno
├── js/
│   ├── app.js             # Lógica de UI y renderizado
│   └── storage.js         # Cliente Socket.IO + gestión de datos
├── img/
│   └── logo.png           # Logo de la liga
├── render.yaml            # Configuración de Render
├── .env.example           # Plantilla de .env
├── .gitignore             # Archivos ignorados
└── README.md              # Este archivo
```

---

## 🎯 Sistema de Puntuación

### Cálculo de Puntaje

```
Puntaje Final = Base del Truco + Ajuste del Juez + Bono por Distancia
```

- **Base del Truco:** 10-57 puntos según dificultad (E=A, A=50+)
- **Ajuste:** -1.0 a +1.0 (el juez puede modificar)
- **Distancia:** +1 punto por cada 0.5m sobre 2.5m (máx 15 pts)

### Reglas de Conteo

| Fase | Slots por Juez | Mejores a Contar |
|------|----------------|------------------|
| Preliminar | 4 | 3 mejores |
| Semifinal | 4 | 3 mejores |
| Final | 5 | 4 mejores |

### Familias de Trucos

- **F1 - Interior:** Soul, Magic, Fast Wheel, Fast Slide
- **F2 - Exterior:** Acid, Barrow, Cowboy, Backslide
- **F3 - De Frente:** Snowplow, UFO, Eagle, 8 Cross
- **F4 - De Espaldas:** P-Star, Soyale, Ernsui, Butterfly
- **F5 - Laterales:** Unity, Parallel, Torque, Supercross

---

## 🐛 Solución de Problemas

### "El servidor no responde"
- Espera 30-60 segundos (Render está despertando el servicio)
- Revisa los logs en el dashboard de Render

### "Las credenciales no funcionan"
- Verifica las variables de entorno en Render
- Asegúrate de que no haya espacios en blanco

### "Los cambios no se sincronizan"
- Verifica que todos los jueces estén conectados
- Revisa la consola del navegador (F12) para errores

### "La base de datos se resetea"
- En Render, los archivos son efímeros
- Usa el botón "Respaldar" para descargar backup
- Para persistencia real, migra a PostgreSQL

---

## 🔄 Migración a PostgreSQL (Futuro)

Para persistencia real de datos en producción:

```bash
npm install pg sequelize
```

Configura `DATABASE_URL` en Render y actualiza `server.js` para usar Sequelize en vez de JSON file.

---

## 📝 Licencia

ISC © 2026 Rodrigo Aburto Pereira

---

## 👨‍💻 Desarrollador

**Rodrigo Aburto Pereira**  
Técnico de Nivel Superior en Informática  
[GitHub](https://github.com/koriyio)

---

## 🙏 Agradecimientos

- **World Skate** - Por las reglas oficiales de Inline Freestyle
- **Liga Chilena de Inline Freestyle** - Por inspirar este proyecto
- **Socket.IO** - Por la librería de WebSockets

---

<div align="center">

### 🇨🇱 Hecho con ❤️ para el Inline Freestyle Chilile

**Versión 1.0** | 2026

</div>
