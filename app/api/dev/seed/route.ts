import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint de desarrollo para cargar datos de ejemplo
export async function GET() {
  try {
    // Limpieza básica (solo datos de ejemplo)
    await prisma.activityLog.deleteMany({})
    await prisma.workShift.deleteMany({})
    await prisma.employee.deleteMany({})

    // Empleados
    const [ana, bruno, carla] = await prisma.$transaction([
      prisma.employee.create({ data: { name: 'Ana Pérez', hourlyRate: 10 } }),
      prisma.employee.create({ data: { name: 'Bruno Díaz', hourlyRate: 12.5 } }),
      prisma.employee.create({ data: { name: 'Carla Gómez', hourlyRate: 9.75 } }),
    ])

    // Logs de creación de empleados
    await prisma.activityLog.createMany({
      data: [
        { action: 'CREATE_EMPLOYEE', employeeId: ana.id, details: 'Empleado de ejemplo creado (seed)' },
        { action: 'CREATE_EMPLOYEE', employeeId: bruno.id, details: 'Empleado de ejemplo creado (seed)' },
        { action: 'CREATE_EMPLOYEE', employeeId: carla.id, details: 'Empleado de ejemplo creado (seed)' },
      ],
    })

    // Helper fechas
    const today = new Date()
    const mkDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const d = (offset: number) => {
      const nd = new Date(today)
      nd.setDate(nd.getDate() - offset)
      return mkDate(nd)
    }

    // Crea turno utilitario
    const createShift = async (
      employeeId: string,
      date: Date,
      t1in?: string,
      t1out?: string,
      t2in?: string,
      t2out?: string,
      isPaid?: boolean
    ) => {
      const dateStr = date.toISOString().slice(0, 10)
      const toDT = (time?: string) => (time ? new Date(`${dateStr}T${time}:00`) : null)
      const shift = await prisma.workShift.create({
        data: {
          employeeId,
          date,
          entryTime1: toDT(t1in),
          exitTime1: toDT(t1out),
          entryTime2: toDT(t2in),
          exitTime2: toDT(t2out),
          isPaid: !!isPaid,
        },
      })
      await prisma.activityLog.create({
        data: {
          action: 'CREATE_SHIFT',
          employeeId,
          details: `Turno de ejemplo creado (seed) para ${dateStr}${isPaid ? ' (pagado)' : ''}`,
        },
      })
      return shift
    }

    // Ana: varios días, algunos con tardanza (entra 09:20)
    await createShift(ana.id, d(1), '09:20', '13:00', '14:00', '18:00', true)
    await createShift(ana.id, d(2), '09:05', '12:30', undefined, undefined, true)
    await createShift(ana.id, d(3), '08:50', '13:00', '14:00', '17:30', false)

    // Bruno: más horas totales
    await createShift(bruno.id, d(1), '08:45', '13:15', '14:15', '19:00', true)
    await createShift(bruno.id, d(2), '09:10', '12:50', '13:50', '18:10', true)
    await createShift(bruno.id, d(4), '09:00', '13:00', '14:00', '18:00', false)

    // Carla: días esporádicos y no siempre pagados
    await createShift(carla.id, d(1), '09:30', '12:30', undefined, undefined, true)
    await createShift(carla.id, d(5), '10:00', '14:00', undefined, undefined, false)

    return NextResponse.json({ ok: true, message: 'Datos de ejemplo cargados.' })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ ok: false, error: 'No se pudo cargar el seed' }, { status: 500 })
  }
}


