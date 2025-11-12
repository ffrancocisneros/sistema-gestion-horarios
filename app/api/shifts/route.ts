import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}
    if (employeeId) {
      where.employeeId = employeeId
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    // Validar parámetros de ordenamiento
    const validSortFields = ['date', 'createdAt', 'isPaid']
    const validSortOrder = ['asc', 'desc']
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'date'
    const order = validSortOrder.includes(sortOrder) ? sortOrder : 'desc'
    
    const skip = (page - 1) * limit

    // Obtener total de registros con los mismos filtros
    const total = await prisma.workShift.count({ where })

    // Obtener turnos con paginación y ordenamiento
    const shifts = await prisma.workShift.findMany({
      where,
      skip,
      take: limit,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortField]: order,
      },
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: shifts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { error: 'Error al obtener turnos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      date,
      entryTime1,
      exitTime1,
      entryTime2,
      exitTime2,
      isPaid,
    } = body

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'Empleado y fecha son requeridos' },
        { status: 400 }
      )
    }

    // Validar que la fecha no sea futura
    // Parsear la fecha en zona horaria local para evitar problemas de UTC
    const [year, month, day] = date.split('-').map(Number)
    const shiftDate = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (shiftDate > today) {
      return NextResponse.json(
        { error: 'No se pueden registrar turnos en fechas futuras' },
        { status: 400 }
      )
    }

    // Validar que existe el empleado
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })
    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    // Helper para crear fecha considerando turnos que cruzan medianoche
    // Usar zona horaria local para evitar problemas de UTC
    const createDateTime = (dateStr: string, timeStr: string, isExit: boolean = false, previousEntryTime?: string) => {
      const [year, month, day] = dateStr.split('-').map(Number)
      const [hours, minutes] = timeStr.split(':').map(Number)
      const baseDate = new Date(year, month - 1, day, hours, minutes, 0)
      
      // Si es una hora de salida y es menor que la entrada, asumimos que cruza medianoche
      if (isExit && previousEntryTime) {
        const [entryHours, entryMinutes] = previousEntryTime.split(':').map(Number)
        const entryTime = new Date(year, month - 1, day, entryHours, entryMinutes, 0)
        if (baseDate <= entryTime) {
          // Agregar un día si la salida es menor que la entrada
          baseDate.setDate(baseDate.getDate() + 1)
        }
      }
      
      return baseDate
    }

    // Validar horarios (permitir turnos que cruzan medianoche)
    // Usar zona horaria local para crear fechas
    let exit1Date: Date | null = null
    if (entryTime1 && exitTime1) {
      const [entryHours, entryMinutes] = entryTime1.split(':').map(Number)
      const entry1Date = new Date(year, month - 1, day, entryHours, entryMinutes, 0)
      exit1Date = createDateTime(date, exitTime1, true, entryTime1)
      
      // Validar que la diferencia no sea negativa (ya manejamos medianoche arriba)
      const diff = exit1Date.getTime() - entry1Date.getTime()
      if (diff <= 0) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada (Turno 1)' },
          { status: 400 }
        )
      }
    }

    let exit2Date: Date | null = null
    if (entryTime2 && exitTime2) {
      const [entry2Hours, entry2Minutes] = entryTime2.split(':').map(Number)
      const entry2Date = new Date(year, month - 1, day, entry2Hours, entry2Minutes, 0)
      exit2Date = createDateTime(date, exitTime2, true, entryTime2)
      
      const diff = exit2Date.getTime() - entry2Date.getTime()
      if (diff <= 0) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada (Turno 2)' },
          { status: 400 }
        )
      }
      
      // Validar que turno 2 sea después de turno 1
      if (exitTime1 && entryTime1) {
        // Si el turno 1 cruza medianoche, la salida ya está en el día siguiente
        if (exit1Date && entry2Date <= exit1Date) {
          return NextResponse.json(
            { error: 'El turno 2 debe comenzar después del turno 1' },
            { status: 400 }
          )
        }
      }
    }

    // Normalizar fecha para que sea solo la fecha (sin hora)
    // Usar la fecha ya parseada en zona horaria local
    const dateOnly = new Date(year, month - 1, day)
    dateOnly.setHours(0, 0, 0, 0)

    // Verificar si ya existe un turno para este empleado en esta fecha
    const existingShift = await prisma.workShift.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateOnly,
        },
      },
    })

    // Determinar qué turno estamos agregando (entryTime1 o entryTime2)
    // Si solo se proporciona entryTime1, es el primer turno
    // Si solo se proporciona entryTime2, es el segundo turno
    const newEntryTime = entryTime1 || entryTime2
    const newExitTime = exitTime1 || exitTime2

    if (!newEntryTime) {
      return NextResponse.json(
        { error: 'Se debe proporcionar al menos una hora de entrada' },
        { status: 400 }
      )
    }

    // Preparar el nuevo turno
    const [newEntryHours, newEntryMinutes] = newEntryTime.split(':').map(Number)
    const newEntryDate = new Date(year, month - 1, day, newEntryHours, newEntryMinutes, 0)
    const newExitDate = newExitTime ? createDateTime(date, newExitTime, true, newEntryTime) : null

    if (existingShift) {
      // Ya existe un turno, verificar si podemos agregar este como segundo turno
      const existingEntry1 = existingShift.entryTime1
      const existingExit1 = existingShift.exitTime1
      const existingEntry2 = existingShift.entryTime2
      const existingExit2 = existingShift.exitTime2

      // Si ya hay dos turnos completos, no podemos agregar más
      if (existingEntry1 && existingExit1 && existingEntry2 && existingExit2) {
        return NextResponse.json(
          { error: 'Ya existen dos turnos completos para este empleado en esta fecha. Edita el turno existente para modificarlo.' },
          { status: 400 }
        )
      }

      // Verificar si el nuevo turno se solapa con los existentes
      if (existingEntry1 && existingExit1) {
        const existingEntry1Time = new Date(existingEntry1).getTime()
        const existingExit1Time = new Date(existingExit1).getTime()
        const newEntryTimeValue = newEntryDate.getTime()
        const newExitTimeValue = newExitDate?.getTime() || newEntryTimeValue

        // Verificar solapamiento con turno 1
        if (
          (newEntryTimeValue >= existingEntry1Time && newEntryTimeValue < existingExit1Time) ||
          (newExitTimeValue > existingEntry1Time && newExitTimeValue <= existingExit1Time) ||
          (newEntryTimeValue <= existingEntry1Time && newExitTimeValue >= existingExit1Time)
        ) {
          return NextResponse.json(
            { error: 'El nuevo turno se solapa con el turno existente. Por favor, verifica la fecha y los horarios.' },
            { status: 400 }
          )
        }
      }

      if (existingEntry2 && existingExit2) {
        const existingEntry2Time = new Date(existingEntry2).getTime()
        const existingExit2Time = new Date(existingExit2).getTime()
        const newEntryTimeValue = newEntryDate.getTime()
        const newExitTimeValue = newExitDate?.getTime() || newEntryTimeValue

        // Verificar solapamiento con turno 2
        if (
          (newEntryTimeValue >= existingEntry2Time && newEntryTimeValue < existingExit2Time) ||
          (newExitTimeValue > existingEntry2Time && newExitTimeValue <= existingExit2Time) ||
          (newEntryTimeValue <= existingEntry2Time && newExitTimeValue >= existingExit2Time)
        ) {
          return NextResponse.json(
            { error: 'El nuevo turno se solapa con el turno 2 existente. Por favor, verifica la fecha y los horarios.' },
            { status: 400 }
          )
        }
      }

      // Determinar si el nuevo turno debe ser turno 1 o 2
      let finalEntry1: Date | null = null
      let finalExit1: Date | null = null
      let finalEntry2: Date | null = null
      let finalExit2: Date | null = null

      if (existingEntry1) {
        const existingEntry1Time = new Date(existingEntry1).getTime()
        const newEntryTimeValue = newEntryDate.getTime()

        if (newEntryTimeValue < existingEntry1Time) {
          // El nuevo turno comienza antes, debe ser turno 1
          // El existente se mueve a turno 2 (si no hay turno 2 ya)
          if (existingEntry2) {
            return NextResponse.json(
              { error: 'Ya existe un turno 2. El nuevo turno debe comenzar después del turno 1 existente.' },
              { status: 400 }
            )
          }
          finalEntry1 = newEntryDate
          finalExit1 = newExitDate
          finalEntry2 = existingEntry1
          finalExit2 = existingExit1
        } else {
          // El nuevo turno comienza después, debe ser turno 2
          finalEntry1 = existingEntry1
          finalExit1 = existingExit1
          finalEntry2 = newEntryDate
          finalExit2 = newExitDate
        }
      } else {
        // No hay turno 1, el nuevo es turno 1
        finalEntry1 = newEntryDate
        finalExit1 = newExitDate
        finalEntry2 = existingEntry2
        finalExit2 = existingExit2
      }

      // Actualizar el turno existente
      const shift = await prisma.workShift.update({
        where: {
          employeeId_date: {
            employeeId,
            date: dateOnly,
          },
        },
        data: {
          entryTime1: finalEntry1,
          exitTime1: finalExit1,
          entryTime2: finalEntry2,
          exitTime2: finalExit2,
          ...(isPaid !== undefined ? { isPaid } : {}),
        },
      })

      await logActivity(
        'UPDATE_SHIFT',
        employeeId,
        `Turno agregado para ${date}`
      )

      return NextResponse.json(shift, { status: 200 })
    } else {
      // No existe turno, crear uno nuevo
      const entry1Date = entryTime1 ? (() => {
        const [hours, minutes] = entryTime1.split(':').map(Number)
        return new Date(year, month - 1, day, hours, minutes, 0)
      })() : null
      const exit1DateFinal = exitTime1 ? createDateTime(date, exitTime1, true, entryTime1) : null
      const entry2Date = entryTime2 ? (() => {
        const [hours, minutes] = entryTime2.split(':').map(Number)
        return new Date(year, month - 1, day, hours, minutes, 0)
      })() : null
      const exit2DateFinal = exitTime2 ? createDateTime(date, exitTime2, true, entryTime2) : null

      const shift = await prisma.workShift.create({
        data: {
          employeeId,
          date: dateOnly,
          entryTime1: entry1Date,
          exitTime1: exit1DateFinal,
          entryTime2: entry2Date,
          exitTime2: exit2DateFinal,
          isPaid: isPaid ?? false,
        },
      })

      await logActivity(
        'CREATE_SHIFT',
        employeeId,
        `Turno registrado para ${date}`
      )

      return NextResponse.json(shift, { status: 201 })
    }
  } catch (error: any) {
    console.error('Error creating shift:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un turno para este empleado en esta fecha' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al crear turno' },
      { status: 500 }
    )
  }
}

