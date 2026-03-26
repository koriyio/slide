# 🚀 Guía de Despliegue en Render

## Paso a Paso para Subir Slide Battle a Render

### 1. Preparar el Repositorio en GitHub

#### a) Si aún no has subido el código:

```bash
# Navega a la carpeta del proyecto
cd "c:\Users\rodrigo.aburto\OneDrive - SAG\IA\slide-master"

# Inicializa git (si no está inicializado)
git init

# Agrega todos los archivos
git add .

# Haz el primer commit
git commit -m "Initial commit - Slide Battle v1.0"

# Agrega el repositorio remoto (reemplaza con tu URL real)
git remote add origin https://github.com/koriyio/slide.git

# Sube el código
git push -u origin master
```

#### b) Si ya tienes el repositorio configurado:

```bash
cd "c:\Users\rodrigo.aburto\OneDrive - SAG\IA\slide-master"
git add .
git commit -m "Update: Security improvements for production"
git push
```

---

### 2. Configurar Render

#### a) Inicia sesión en Render
- Ve a https://render.com
- Inicia sesión con tu cuenta de GitHub

#### b) Crea un nuevo Web Service

1. Haz clic en **"New +"** → **"Web Service"**
2. Selecciona **"Connect a repository"**
3. Busca tu repositorio: `koriyio/slide`
4. Haz clic en **"Connect"**

#### c) Configura el servicio

Completa los siguientes campos:

| Campo | Valor |
|-------|-------|
| **Name** | `slide-battle` (o el nombre que prefieras) |
| **Region** | `São Paulo, Brazil (sa-east-1)` - Más cercano a Chile |
| **Branch** | `master` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` |

#### d) Agrega Variables de Entorno

Haz clic en **"Advanced"** y agrega las siguientes variables:

```
NODE_ENV=production
PORT=3005

# Credenciales Juez 1 (Admin)
JUEZ1_USER=Slide
JUEZ1_PASS=CambiaEstaContraseña123

# Credenciales Juez 2
JUEZ2_USER=juez2
JUEZ2_PASS=CambiaEstaContraseña456

# Credenciales Juez 3
JUEZ3_USER=juez3
JUEZ3_PASS=CambiaEstaContraseña789

# CORS - Reemplaza con tu URL real de Render
CORS_ORIGIN=https://slide-battle.onrender.com
```

> ⚠️ **IMPORTANTE:** 
> - Cambia las contraseñas por defecto
> - La URL de `CORS_ORIGIN` la obtendrás después del primer despliegue

#### e) Haz clic en **"Create Web Service"**

---

### 3. Primer Despliegue

1. Render comenzará a construir automáticamente
2. El proceso tomará 2-5 minutos (la primera vez)
3. Cuando veas **"Live"** en verde, el servicio está activo

#### Para obtener la URL:
- Ve al dashboard de tu servicio en Render
- Copia la URL que aparece arriba (ej: `https://slide-battle.onrender.com`)

---

### 4. Actualizar CORS_ORIGIN

1. Copia la URL de tu servicio
2. En Render, ve a la pestaña **"Environment"**
3. Edita la variable `CORS_ORIGIN` con tu URL real
4. Haz clic en **"Save Changes"**
5. Render reiniciará automáticamente con la nueva configuración

---

### 5. Probar la Aplicación

1. Abre tu navegador en la URL de Render
2. Espera ~30 segundos (el servicio gratuito entra en hibernación)
3. Inicia sesión con las credenciales que configuraste
4. ¡Listo!

---

## 🔧 Comandos Útiles

### Ver logs en Render
```bash
# Desde el dashboard de Render
# Ve a la pestaña "Logs"
```

### Reiniciar el servicio
```bash
# Desde el dashboard de Render
# Ve a la pestaña "Manual Deploy"
# Haz clic en "Deploy Latest Commit"
```

### Conectar SSH (solo planes pagos)
```bash
# En la pestaña "Shell" del dashboard
```

---

## ⚠️ Consideraciones para el Plan Gratuito

### Limitaciones
- **512 MB RAM** - Suficiente para ~50-100 patinadores
- **0.1 CPU** - Puede ser lento con muchos usuarios
- **Hibernación** - El servicio se duerme después de 15 min de inactividad
- **100 horas/mes** - Suficiente para ~3.3 horas diarias de uso continuo

### Recomendaciones
1. **Mantén el servicio activo** durante eventos:
   - Usa un servicio externo como UptimeRobot para hacer ping cada 5 min
   - O considera actualizar a un plan pago ($7/mes)

2. **Backup regular de la DB:**
   - Usa el botón "Respaldar" en la aplicación
   - Descarga el archivo JSON periódicamente

3. **Para eventos importantes:**
   - Considera actualizar temporalmente a un plan profesional

---

## 🔄 Actualizar el Código

Cada vez que hagas cambios:

```bash
cd "c:\Users\rodrigo.aburto\OneDrive - SAG\IA\slide-master"
git add .
git commit -m "Descripción de los cambios"
git push
```

Render detectará el push y desplegará automáticamente en 2-3 minutos.

---

## 🐛 Solución de Problemas

### "Build Failed"
1. Ve a la pestaña **"Logs"** en Render
2. Busca el error específico
3. Errores comunes:
   - `npm install` falla → Verifica que `package.json` esté en `server/`
   - `Cannot find module` → Ejecuta `npm install` localmente y sube `package-lock.json`

### "Service Crashed"
1. Revisa los **Logs** en Render
2. Errores comunes:
   - Puerto ya en uso → Asegúrate de que `PORT=3005` en variables de entorno
   - Error de sintaxis en `server.js` → Revisa la línea mencionada en el log

### "CORS Error" en la consola del navegador
1. Verifica que `CORS_ORIGIN` esté configurado correctamente
2. Asegúrate de que la URL coincida exactamente (con `https://`)
3. Reinicia el servicio después de cambiar la variable

### "Las credenciales no funcionan"
1. Verifica las variables de entorno en Render
2. Asegúrate de que no haya espacios en blanco
3. Reinicia el servicio

---

## 📊 Monitoreo

### Métricas a revisar
- **CPU Usage** - Debería estar < 80%
- **Memory Usage** - Debería estar < 400 MB
- **Request Count** - Número de peticiones
- **Response Time** - Debería ser < 500ms

### Acceder a métricas
1. Ve al dashboard de tu servicio en Render
2. Pestaña **"Metrics"**

---

## 💰 Upgrade a Plan Pago

Si necesitas más recursos:

1. Ve a **Settings** → **Change Plan**
2. Selecciona **Professional** ($7/mes)
   - 2 GB RAM
   - 0.5 CPU
   - Sin hibernación
   - 3000 horas/mes

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs** en Render
2. **Busca en la documentación**: https://render.com/docs
3. **Comunidad**: https://community.render.com

---

<div align="center">

### ¿Necesitas ayuda?

Revisa el [README.md](README.md) principal o contacta al desarrollador.

</div>
