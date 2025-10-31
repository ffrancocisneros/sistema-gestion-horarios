# Cómo Actualizar Node.js

## Problema
Tienes Node.js v16.17.0, pero Next.js 14 requiere Node.js >= v18.17.0

## Solución: Actualizar Node.js

### Opción 1: Instalador Oficial (Recomendado)

1. **Ve a https://nodejs.org**
2. **Descarga la versión LTS** (Long Term Support)
   - Busca el botón verde "Download Node.js (LTS)"
   - La versión actual debería ser 20.x o 22.x
3. **Ejecuta el instalador descargado**
4. **Sigue el asistente de instalación**
   - Acepta los valores por defecto
   - Marca las opciones que prefieras
   - Completa la instalación
5. **IMPORTANTE: Cierra y reabre PowerShell/Terminal**
   - Esto es necesario para que cargue la nueva versión de Node.js
6. **Verifica la instalación:**
   ```powershell
   node --version
   ```
   Deberías ver v18.17.0 o superior (v20.x, v22.x, etc.)
7. **Vuelve al proyecto y ejecuta:**
   ```powershell
   cd "C:\Users\Franco\Documents\sistema-gestion-horarios"
   npm run dev
   ```

### Opción 2: Usar NVM (Node Version Manager)

Si tienes nvm-windows instalado:

```powershell
nvm install 20
nvm use 20
node --version  # Verifica que sea v20.x o superior
```

### Verificación

Después de actualizar, ejecuta:
```powershell
node --version
npm --version
```

Deberías ver:
- Node.js: v18.17.0 o superior
- npm: versión actualizada automáticamente

### Si el problema persiste

1. Verifica que el PATH esté actualizado
2. Reinicia completamente tu terminal
3. Verifica con `where node` que apunte a la nueva instalación

