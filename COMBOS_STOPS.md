# 🔥 Sistema de Combos y Bonificaciones

## Descripción General

El sistema de puntuación ha sido mejorado con **tres nuevas mecánicas** para hacer el jueceo más dinámico y premiar la variedad técnica:

1. **🔥 Combo de Familias** - Multiplicador 1.5x por combinar familias distintas
2. **🛑 Bonificación de Stop** - Hasta +6 pts por parada técnica
3. **📊 Contador de Familias** - Visualización en tiempo real de familias ejecutadas

---

## 1. 🔥 Sistema de Combos

### ¿Cómo funciona?

El **combo** se activa automáticamente cuando un juez registra **dos o más trucos de familias distintas** en el mismo slot de puntuación.

### Multiplicador

| Tipo de Combo | Requisitos | Multiplicador | Ejemplo |
|---------------|------------|---------------|---------|
| **Doble Familia** | 2 familias distintas | × 1.5 | Unite (F1) + Cowboy (F2) |

### Cálculo

```
Puntaje Base Total = Truco 1 + Truco 2
Bonus Combo = (Puntaje Base Total × 1.5) - Puntaje Base Total
Puntaje Final = Puntaje Base Total + Bonus Combo
```

### Ejemplo Práctico

**Deportista registra:**
- Truco 1: **Unite** (F1 - Interior) = 8 pts base
- Truco 2: **Cowboy** (F2 - Exterior) = 40 pts base

**Cálculo:**
```
Base Total = 8 + 40 = 48 pts
Con Multiplicador = 48 × 1.5 = 72 pts
Bonus Combo = 72 - 48 = 24 pts extra
```

**Resultado Final:** 72 pts (antes de otros bonos como distancia o stop)

### Visualización en el Modal

Cuando el juez selecciona un truco que **activa combo**:
- Aparece un panel naranja con ícono de fuego 🔥
- Muestra las familias combinadas: `F1 + F2`
- Muestra el bonus estimado: `+24 pts`
- Animación de flash para destacar el combo

---

## 2. 🛑 Bonificación de Stop

### Niveles de Stop

El juez puede seleccionar **4 opciones** al momento de registrar un truco:

| Nivel | Descripción | Bonus | Ícono |
|-------|-------------|-------|-------|
| **Sin Stop** | Sin bonificación | +0 pts | 🖐️ |
| **Nivel 1** | Parada básica / freno controlado | +2 pts | 🖐️ |
| **Nivel 2** | Parada con equilibrio evidente | +4 pts | 🖐️ |
| **Nivel 3** | Parada perfecta técnica (pose sostenida) | +6 pts | 🖐️ |

### Reglas de Aplicación

✅ El stop **solo aplica** si el truco **NO es falla**  
✅ El stop se aplica **al truco actual**  
✅ El stop es **acumulable** con combo y distancia  

### Cálculo

```
Puntaje Truco = Base + Ajuste + Distancia + Stop
```

### Ejemplo

**Truco registrado:**
- **Magic** (F1-D) = 20 pts base
- Distancia: 5.5m = +6 pts bonus
- Ajuste: +0.5 pts
- Stop Nivel 2 = +4 pts

**Cálculo:**
```
Total = 20 + 0.5 + 6 + 4 = 30.5 pts
```

### UI del Selector

- **4 botones** visuales con íconos de mano
- **Colores diferenciados** por nivel:
  - Sin Stop: Gris
  - Nivel 1: Amarillo suave
  - Nivel 2: Naranja
  - Nivel 3: Rojo chileno
- **Animación de pulso** al seleccionar
- **Feedback visual** inmediato

---

## 3. 📊 Contador de Familias

### ¿Qué muestra?

El contador informa a los jueces **cuántas familias distintas** ha ejecutado la deportista **durante la batalla**.

### Visualización

Se muestra en **tiempo real** en la columna de cada patinador:

```
┌─────────────────────┐
│ FAMILIAS EJECUTADAS │
│  [F1] [F2] [F3]     │
│  3 familias         │
└─────────────────────┘
```

### Familias

| Familia | Color | Código |
|---------|-------|--------|
| **F1 - Interior** | Azul | `#0039A6` |
| **F2 - Exterior** | Rojo | `#D52B1E` |
| **F3 - De Frente** | Verde | `#10B981` |
| **F4 - De Espaldas** | Naranja | `#F59E0B` |
| **F5 - Laterales** | Violeta | `#8B5CF6` |

### Propósito

- **Informativo**: Ayuda a los jueces a evaluar variedad técnica
- **No suma puntos**: Es solo referencia visual
- **Actualización automática**: Se refresca con cada truco registrado

---

## Flujo de Jueceo Mejorado

### Paso a Paso

1. **Juez abre el modal** para registrar truco
2. **Sistema muestra**:
   - Familias ya ejecutadas por la deportista
   - Preview de combo si aplica
3. **Juez selecciona**:
   - Truco (buscador o lista)
   - Distancia (slider 2.5m - 10m)
   - Ajuste (-1.0 a +1.0)
   - **Stop (0 a 3)**
4. **Sistema calcula automáticamente**:
   - Puntaje base
   - Bonus de distancia
   - Bonus de stop
   - **Multiplicador de combo** (si aplica)
5. **Juez confirma** y el sistema guarda

---

## Cambios Técnicos

### Archivos Modificados

#### Backend (`server/server.js`)
- `getFamilyShort()` - Extrae familia corta (F1, F2, etc.)
- `calculateComboBonus()` - Calcula multiplicador 1.5x
- `calculateStopBonus()` - Calcula +2/+4/+6 pts según nivel
- `save-trick` handler - Integración de nuevos cálculos

#### Frontend (`js/app.js`)
- `openJudgeModal()` - Inicializa selector de stop y combo preview
- `updateFamilyCounterAndCombo()` - Actualiza contador y preview en tiempo real
- `ui.formJudge.onsubmit` - Captura nivel de stop

#### Frontend (`js/storage.js`)
- `saveTrick()` - Nuevo parámetro `stopLevel`
- Estructura de `trickPerformed` ahora incluye `stopLevel` y `stopBonus`

#### UI (`index.html`)
- Selector de Stop (4 opciones visuales)
- Panel de información de Combo
- Íconos de Phosphor para feedback visual

#### Estilos (`css/style.css`)
- `.stop-option` - Estilos de selectores de stop
- `.family-badge` - Badges de familias con colores
- `.combo-active` - Animación para combos
- `.family-counter` - Contador de familias

---

## Estrategia para Deportistas

### Maximizar Puntaje

1. **Combinar familias** en cada slot → Multiplicador 1.5x
2. **Ejecutar stops técnicos** → Hasta +6 pts por truco
3. **Maximizar distancia** → Hasta +15 pts bonus
4. **Variedad en preliminares** → Mostrar todas las familias

### Ejemplo de Slot Perfecto

```
Slot 1:
- Truco 1: Magic (F1) = 20 pts
- Truco 2: Cowboy (F2) = 40 pts
- Combo: (20+40) × 1.5 = 90 pts
- Distancia: 8m = +10 pts
- Stop Nivel 3 = +6 pts
- Ajuste: +0.5 pts

TOTAL SLOT: 90 + 10 + 6 + 0.5 = 106.5 pts
```

---

## Reglas Oficiales (Adaptación World Skate)

### Basado en Rulebook 2026

Este sistema es una **adaptación competitiva** que mantiene el espíritu de las reglas oficiales:

- ✅ **Variedad técnica**: Premia uso de múltiples familias
- ✅ **Calidad de ejecución**: Stop bonus por control
- ✅ **Dificultad**: Combos requieren planificación
- ✅ **Espectacularidad**: Más dinámico para audiencia

### Consideraciones para Jueces

1. **Objetividad**: El stop se basa en observación directa
2. **Consistencia**: Todos los jueces usan misma escala
3. **Transparencia**: Deportistas ven cálculo en tiempo real

---

## Preguntas Frecuentes

### ¿Puedo registrar solo un truco por slot?

Sí, pero **pierdes el bonus de combo**. Se recomienda siempre registrar 2 trucos de familias distintas.

### ¿El stop es obligatorio?

No, es **opcional**. Si no se selecciona, se asume "Sin Stop" (+0 pts).

### ¿Qué pasa si registro dos trucos de la misma familia?

No hay combo. El multiplicador 1.5x **solo aplica si las familias son distintas**.

### ¿El contador de familias se resetea entre slots?

No, el contador es **acumulativo durante toda la batalla**.

### ¿Puedo cambiar el stop después de guardar?

Sí, usando el botón de **editar** (solo si eres el juez dueño de ese slot).

---

## Próximas Mejoras (Roadmap)

- [ ] **Historial de combos** - Mostrar últimos combos ejecutados
- [ ] **Estadísticas de familias** - Gráfico de distribución por deportista
- [ ] **Combo Triple** - 3 familias distintas = × 2.0x
- [ ] **Stop con replay** - Revisión en cámara lenta para jueces

---

<div align="center">

### 🎯 ¡A maximizar puntajes con estilo!

**Versión 1.1** | 2026

</div>
