# 🚨 FIX: Deployment Error en Render

## Problema

El deployment está fallando con el error:
```
Deploy failed for b11516d: Fix final: Conexión directa al Pooler de Supabase
Exited with status 1 while running your code.
```

## Causa

**DATABASE_URL no está configurado en las variables de entorno de Render**

El servidor requiere una conexión a Supabase (PostgreSQL) para funcionar. Sin esta variable, el servidor no puede iniciar.

---

## ✅ Solución: Configurar DATABASE_URL en Render

### Paso 1: Obtener DATABASE_URL de Supabase

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto: `atldendnqoamochzrjuv`
3. En la barra lateral izquierda, haz clic en **Settings** (ícono de engranaje)
4. Haz clic en **Database**
5. Busca la sección **Connection string** (URI)
6. Copia la URL completa. Debería verse así:
   ```
   postgresql://postgres:GyVmorZysISRvq4c@db.atldendnqoamochzrjuv.supabase.co:5432/postgres
   ```

### Paso 2: Agregar DATABASE_URL en Render

1. Ve a: https://dashboard.render.com
2. Selecciona tu servicio **slide**
3. En la barra lateral izquierda, haz clic en **Environment**
4. Haz clic en **Add Environment Variable**
5. Configura la variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `[PEGA AQUÍ LA URL DE SUPABASE]`
6. Haz clic en **Save Changes**
7. Render iniciará un nuevo deployment automáticamente

---

## Otras Variables de Entorno Requeridas

Asegúrate de que también estén configuradas estas variables en Render:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3005` |
| `JUEZ1_USER` | `Slide` |
| `JUEZ1_PASS` | `slide2026` |
| `JUEZ2_USER` | `juez2` |
| `JUEZ2_PASS` | `slide` |
| `JUEZ3_USER` | `juez3` |
| `JUEZ3_PASS` | `slide` |
| `CORS_ORIGIN` | `https://slide-0pc2.onrender.com` |

> **Nota:** Reemplaza la URL en `CORS_ORIGIN` con la URL real de tu servicio en Render.

---

## Verificar que Funciona

### En los Logs de Render

1. Ve a tu servicio en Render
2. Haz clic en **Logs**
3. Deberías ver algo así:
   ```
   [STARTUP] Iniciando servidor...
   [STARTUP] NODE_ENV: production
   [STARTUP] PORT: 3005
   [STARTUP] DATABASE_URL: Configurado ✓
   [DB] Conectando a Supabase...
   [DB] Probando conexión a la base de datos...
   [DB] Conexión a Supabase exitosa ✓
   [DB] Esquema de PostgreSQL inicializado correctamente.
   [STARTUP] Base de datos lista ✓
   ═══════════════════════════════════════════════════════
   Servidor de Slide Battle corriendo en http://localhost:3005
   ═══════════════════════════════════════════════════════
   ```

### Si Falla

Si ves un error como:
- `password authentication failed` → La contraseña en DATABASE_URL es incorrecta
- `connect ECONNREFUSED` → Supabase no está accesible
- `DATABASE_URL no está definida` → La variable no se agregó correctamente

---

## Commit y Push

Después de aplicar los cambios, haz:

```bash
cd "c:\Users\koriyio\OneDrive - SAG\IA\Slide-Competition-Backup-2026-03-26\slide-master"
git add .
git commit -m "Fix: Mejorar manejo de errores y logging para deployment en Render"
git push
```

Render detectará el push y hará un nuevo deployment automáticamente.

---

<div align="center">

### ✅ Una vez configurado DATABASE_URL, el servicio debería funcionar correctamente.

</div>
