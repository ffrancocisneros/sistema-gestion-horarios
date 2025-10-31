# Ayuda para Configurar Connection String de Supabase

## Paso a Paso para Obtener el Connection String Correcto

### Opción 1: Connection String Directo (Puerto 5432)

1. En Supabase, ve a tu proyecto
2. Click en **Settings** (⚙️) en el menú lateral izquierdo
3. Click en **Database** en el submenú
4. Desplázate hasta la sección **Connection string**
5. Selecciona la pestaña **URI** (NO Transaction ni Session)
6. Verás algo como:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   
   **O** podría ser:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

7. **IMPORTANTE**: Reemplaza `[YOUR-PASSWORD]` con tu contraseña: `manchigali`
8. Copia el string completo y pégamelo

### Opción 2: Connection Pooling (Puerto 6543) - Recomendado

1. En Supabase, ve a **Settings > Database**
2. Desplázate hasta **Connection pooling**
3. Busca **Session mode**
4. Copia el **URI** que aparece ahí
5. Reemplaza `[YOUR-PASSWORD]` con `manchigali`
6. Pégame el string completo

### Formato Esperado

El connection string debería verse así:

**Opción A (Directo):**
```
postgresql://postgres:manchigali@db.kwzxwebssxnbptmgpvzw.supabase.co:5432/postgres
```

**Opción B (Pooler):**
```
postgresql://postgres.kwzxwebssxnbptmgpvzw:manchigali@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Verificaciones Importantes

- ✅ El proyecto debe estar en estado "Active" (círculo verde)
- ✅ No debe haber restricciones de IP bloqueando tu conexión
- ✅ La contraseña debe estar correctamente reemplazada (sin corchetes)
- ✅ El string debe empezar con `postgresql://`

## Si Aún No Funciona

1. Espera 2-3 minutos más si acabas de crear el proyecto
2. Verifica que no haya caracteres extraños o espacios en el connection string
3. Prueba con el connection string del pooler en lugar del directo
4. Verifica tu región en Supabase (Settings > General > Region)

