# Guía de Configuración de Supabase

## Paso 1: Crear Proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta o inicia sesión
2. Haz clic en "New Project"
3. Completa la información:
   - **Nombre del proyecto**: Elige un nombre (ej: "gestion-horarios")
   - **Database Password**: Crea una contraseña segura y **GUÁRDALA** (la necesitarás)
   - **Region**: Elige la región más cercana
4. Espera unos minutos mientras se crea el proyecto

## Paso 2: Obtener el Connection String

1. En tu proyecto de Supabase, ve a **Settings** (Configuración) en el menú lateral
2. Haz clic en **Database**
3. Desplázate hasta la sección **Connection string**
4. Selecciona la pestaña **URI**
5. Copia el connection string que aparece (será algo como):
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   
   **IMPORTANTE**: Reemplaza `[PASSWORD]` con la contraseña que creaste en el paso 1

## Paso 3: Configurar el archivo .env

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza la línea `DATABASE_URL` con tu connection string de Supabase
3. Guarda el archivo

Ejemplo:
```env
DATABASE_URL="postgresql://postgres.abc123xyz:TuPasswordSegura@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

## Paso 4: Verificar la conexión

Una vez configurado, ejecuta:
```bash
npx prisma db push
```

Esto creará todas las tablas necesarias en tu base de datos de Supabase.

## Solución de Problemas

### Error de conexión
- Verifica que el connection string esté correcto
- Asegúrate de haber reemplazado `[PASSWORD]` con tu contraseña real
- Verifica que el proyecto esté activo en Supabase

### Puerto 6543 vs 5432
- Supabase usa el puerto 6543 para conexiones pooler (recomendado)
- Si prefieres usar el puerto 5432 directo, puedes usar el connection string de la pestaña "Direct connection"

