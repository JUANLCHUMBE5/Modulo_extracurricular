# Diagnóstico del Módulo de Caja

## Verificación Paso a Paso

### 1. Verificar que la autenticación funciona
- Abre el navegador (devtools: F12)
- Ve a la pestaña "Application" > "Local Storage"
- Busca la clave `san_rafael_mock_database_v1`
- Verifica que contenga un usuario con `"usuario":"caja"` y `"rol":"Caja"`

### 2. Verificar el mapeo de roles
En la consola del navegador (F12), ejecuta:
```javascript
const rolesSistema = {
  "Administrador": "administrador",
  "Secretaria": "secretaria",
  "Caja": "caja",
  "Coordinacion": "coordinacion",
  "Auxiliar": "auxiliar",
  "Direccion": "direccion",
};
console.log(rolesSistema["Caja"]); // Debe imprimir: "caja"
```

### 3. Verificar que el componente está siendo importado
Comprueba que en `src/App.jsx` línea 8 existe:
```javascript
import Caja from "./modules/caja/Caja";
```

### 4. Verificar el routing
En `src/App.jsx` líneas 33-34 debe existir:
```javascript
case "caja":
  return <Caja onLogout={handleLogout} />;
```

### 5. Prueba Manual del Login
1. Abre la aplicación
2. Selecciona "Acceso Personal"
3. Ingresa:
   - Usuario: **caja**
   - Contraseña: **1234**
4. Presiona "Ingresar"

## Posibles Causas si No Funciona

| Problema | Solución |
|----------|----------|
| Ves "Módulo Jose Caja en construcción" | El rol no está siendo mapeado correctamente. Limpia caché (Ctrl+Shift+Supr) y recarga (Ctrl+F5) |
| Error en consola sobre imports | Asegúrate que `src/modules/caja/Caja.jsx` existe y está bien formado |
| El módulo no carga después del login | Verifica que no haya errores en la consola del navegador |
| Los pagos no se guardan | Verifica que `cajaService.js` tiene todas las funciones exportadas |

## Comandos Útiles

```bash
# Limpia caché e instala dependencias nuevamente
rm node_modules/.vite
npm install

# Reinicia el servidor de desarrollo
npm run dev

# Verifica que no haya errores de linting (si existe)
npm run lint
```

## Logs Esperados en Consola

Cuando ingresas exitosamente como "caja", deberías ver algo así en la consola:
```
[INFO] User logged in: {username: "caja", role: "caja", name: "Jose Caja"}
[INFO] Rendering module: caja
```

Si ves esto en su lugar:
```
[INFO] User logged in: {username: "caja", role: undefined, name: "Jose Caja"}
```

Entonces el problema está en el mapeo de roles en `authService.js`.

## Verificación Final

Después de implementar las soluciones:
1. Cierra el navegador completamente
2. Detén el servidor (Ctrl + C)
3. Ejecuta `npm run dev`
4. Accede a la aplicación con el usuario "caja"
5. Deberías ver la interfaz del módulo de Caja con:
   - Selector de período (escolar/verano)
   - Resumen de caja (3 tarjetas)
   - Botones: "Registrar Pago" y "Descargar Reporte"
   - Tabla de pagos registrados (inicialmente vacía)

Si ves todo esto, ¡el módulo funciona correctamente! ✅
