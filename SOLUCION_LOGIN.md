# 🔧 Solución: Problema de Inicio de Sesión

## Problema Reportado
No puedes iniciar sesión en la aplicación.

---

## ✅ Soluciones

### Opción 1: Probar Localmente (Recomendado para debugging)

#### Paso 1: Instalar dependencias
```bash
cd "c:\Users\rodrigo.aburto\OneDrive - SAG\IA\slide-master\server"
npm install
```

#### Paso 2: Iniciar el servidor
**Opción A:** Usar el script automático
```bash
# Doble clic en:
INICIAR_SERVIDOR.bat
```

**Opción B:** Manual
```bash
cd server
node server.js
```

#### Paso 3: Abrir la aplicación
Navega a: **http://localhost:3005**

#### Paso 4: Iniciar sesión
Usa las credenciales por defecto:

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| **Juez 1** (Admin) | `Slide` | `slide2026` |
| **Juez 2** | `juez2` | `slide` |
| **Juez 3** | `juez3` | `slide` |

---

### Opción 2: Render (Producción)

Si el problema es en **https://slide-3b76.onrender.com/**:

#### El problema en Render
Render **NO tiene las variables de entorno configuradas**. Debes agregarlas manualmente.

#### Pasos para configurar en Render:

1. **Ve al dashboard de Render**
   - https://dashboard.render.com
   - Inicia sesión con GitHub

2. **Selecciona tu servicio**
   - Busca `slide-battle-live` o el nombre que le hayas puesto

3. **Ve a la pestaña "Environment"**
   - Haz clic en "Environment" en el menú lateral

4. **Agrega las variables de entorno**
   Haz clic en "Add Variable" y agrega:

   ```
   JUEZ1_USER=Slide
   JUEZ1_PASS=slide2026
   
   JUEZ2_USER=juez2
   JUEZ2_PASS=slide
   
   JUEZ3_USER=juez3
   JUEZ3_PASS=slide
   
   NODE_ENV=production
   CORS_ORIGIN=https://slide-3b76.onrender.com
   ```

5. **Guarda los cambios**
   - Haz clic en "Save Changes"
   - Render reiniciará automáticamente (~1-2 minutos)

6. **Prueba el login**
   - Espera a que el servicio se reinicie
   - Ve a https://slide-3b76.onrender.com/
   - Intenta iniciar sesión con las credenciales de arriba

---

## 🐛 Posibles Errores y Soluciones

### Error: "Credenciales incorrectas"

**Causa:** Las variables de entorno no están cargadas

**Solución:**
1. Verifica que el archivo `.env` existe en `server/.env` (local)
2. O que las variables están configuradas en Render (producción)
3. Reinicia el servidor

### Error: "Rol inválido"

**Causa:** El código del rol no es exacto

**Solución:**
- Usa exactamente: `Juez 1`, `Juez 2`, o `Juez 3` (con espacio y número)
- Respeta mayúsculas/minúsculas

### Error: "El rol ya está en uso"

**Causa:** Otro usuario ya inició sesión con ese rol

**Solución:**
- Espera a que el otro usuario cierre sesión
- O usa un rol diferente
- El sistema automáticamente hace "takeover" si es necesario

### La página no carga (Render)

**Causa:** El servicio está en hibernación (plan gratuito)

**Solución:**
- Espera 30-60 segundos
- La primera carga siempre es más lenta
- Considera usar UptimeRobot para mantenerlo activo

---

## 🧪 Verificación del Servidor

### Localmente

Abre la consola del servidor y verifica que veas:

```
[CONFIG] AUTH_CONFIG cargada: [ 'Juez 1', 'Juez 2', 'Juez 3' ]
Servidor de Slide Battle corriendo en http://localhost:3005
```

### En Render

1. Ve al dashboard de Render
2. Selecciona tu servicio
3. Pestaña "Logs"
4. Busca mensajes como:
   ```
   [CONFIG] AUTH_CONFIG cargada
   [AUDIT] Nueva conexión desde IP
   [AUDIT] Login exitoso para Juez 1
   ```

---

## 📞 ¿Sigues con problemas?

### Revisa los logs

**Local:**
- La consola donde ejecutaste `node server.js`

**Render:**
- Dashboard → Logs

### Verifica la consola del navegador

1. Abre DevTools (F12)
2. Ve a "Console"
3. Busca errores en rojo

### Comandos útiles

```bash
# Ver si el servidor está corriendo
netstat -ano | findstr :3005

# Matar proceso en puerto 3005 (Windows)
taskkill /F /IM node.exe
```

---

## 🎯 Resumen Rápido

### Para probar localmente:
```bash
cd "c:\Users\rodrigo.aburto\OneDrive - SAG\IA\slide-master\server"
npm install
node server.js
# Abre http://localhost:3005
# Login: Slide / slide2026
```

### Para Render:
1. Dashboard → Environment
2. Agrega variables de entorno
3. Guarda y espera reinicio
4. Prueba login

---

<div align="center">

### ¿Necesitas ayuda?

Revisa los logs o contacta al desarrollador.

</div>
