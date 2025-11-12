# Sistema de Gestión de Horarios

Aplicación web moderna para gestionar horarios, turnos y sueldos de empleados. Desarrollada con Next.js 14, TypeScript, Prisma y PostgreSQL.

## Características

- ✅ Gestión completa de empleados (CRUD)
- ✅ Registro de horarios con hasta 2 turnos por día
- ✅ Dashboard con estadísticas (horas trabajadas, tardanzas)
- ✅ Cálculo de sueldos (diario, semanal, mensual)
- ✅ Sistema de logs de actividad
- ✅ Marcado de días como pagados/no pagados
- ✅ UI moderna y minimalista con Tailwind CSS y shadcn/ui
- ✅ Responsive design

## Tecnologías

- **Frontend/Backend:** Next.js 14 (App Router) con TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL con Prisma ORM
- **Gráficos:** Recharts
- **Validación:** Zod + React Hook Form

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar base de datos

Crear un archivo `.env` en la raíz del proyecto (ver `.env.example`):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/horarios_db"
```

**Opciones de base de datos:**
- **PostgreSQL local:** Instalar PostgreSQL y usar la URL de conexión local
- **Supabase:** Crear proyecto y usar el connection string proporcionado
- **Railway/Neon:** Crear base de datos y usar el connection string

### 3. Inicializar base de datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Crear las tablas en la base de datos
npx prisma db push

# (Opcional) Abrir Prisma Studio para ver los datos
npx prisma studio
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
/app
  /api              # API Routes (Next.js)
    /employees      # CRUD de empleados
    /shifts         # CRUD de turnos
    /dashboard      # Estadísticas del dashboard
    /salaries       # Cálculo de sueldos
    /logs           # Logs de actividad
  /dashboard        # Página del dashboard
  /employees        # Gestión de empleados
  /shifts           # Registro de turnos
  /salaries         # Cálculo de sueldos
  /logs             # Vista de logs

/components
  /ui               # Componentes de shadcn/ui
  /employees        # Componentes de empleados
  /shifts           # Componentes de turnos
  /layout           # Layout y navegación

/prisma
  schema.prisma     # Schema de la base de datos
```

## Funcionalidades Principales

### Gestión de Empleados
- Crear, editar y eliminar empleados
- Establecer valor por hora único para cada empleado
- Ver lista completa de empleados

### Registro de Turnos
- Registrar entrada y salida (hasta 2 turnos por día)
- Selector de fecha con calendario
- Validaciones de horarios
- Marcar días como pagados/no pagados

### Dashboard
- Ranking de empleados por horas trabajadas
- Ranking de empleados con más tardanzas
- Estadísticas generales (total empleados, horas del mes, sueldos pendientes)
- Gráficos interactivos con Recharts

### Cálculo de Sueldos
- Visualización de sueldos diarios, semanales y mensuales
- Filtros por empleado y rango de fechas
- Solo considera días marcados como "pagados"
- Desglose detallado por período

### Logs de Actividad
- Registro automático de todas las acciones
- Filtros por empleado, tipo de acción y fecha
- Historial completo de cambios

## Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Iniciar servidor de producción
- `npm run lint` - Ejecutar linter
- `npm run db:generate` - Generar cliente de Prisma
- `npm run db:push` - Sincronizar schema con la BD
- `npm run db:migrate` - Crear migración
- `npm run db:studio` - Abrir Prisma Studio

## Despliegue

### Vercel (Recomendado)

1. **Conectar repositorio:**
   - Ve a [vercel.com](https://vercel.com) y conecta tu repositorio de GitHub/GitLab/Bitbucket
   - Vercel detectará automáticamente Next.js

2. **Configurar variables de entorno:**
   - En la configuración del proyecto en Vercel, ve a "Environment Variables"
   - Agrega: `DATABASE_URL` con tu connection string de PostgreSQL
   - **Importante para Supabase:** Usa el connection string con puerto `6543` para pooler o `5432` para direct connection

3. **Build Command (ya configurado):**
   - El proyecto ya incluye `prisma generate` en el script `build` y `postinstall`
   - Vercel ejecutará automáticamente `npm run build`

4. **Inicializar base de datos:**
   - Después del primer deploy, ejecuta localmente o en un entorno con acceso a la BD:
   ```bash
   npx prisma db push
   ```
   - O usa Prisma Migrate para producción:
   ```bash
   npx prisma migrate deploy
   ```

5. **Verificar deploy:**
   - Una vez completado, tu aplicación estará disponible en la URL proporcionada por Vercel

### Otros proveedores

El proyecto es compatible con cualquier proveedor que soporte Next.js (Railway, Render, etc.). Asegúrate de:
- Configurar `DATABASE_URL` como variable de entorno
- Ejecutar `prisma generate` antes del build
- Ejecutar `prisma db push` o `prisma migrate deploy` después del primer deploy

## Notas

- El sistema de autenticación está configurado de forma básica. Para producción, se recomienda implementar NextAuth.js o similar.
- El horario esperado para calcular tardanzas está configurado en 09:00. Puede ajustarse en `/app/api/dashboard/route.ts`
- La moneda por defecto en los cálculos es ARS (peso argentino). Puede modificarse en los componentes de visualización.

