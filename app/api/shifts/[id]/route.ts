import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      entryTime1,
      exitTime1,
      entryTime2,
      exitTime2,
      isPaid,
      date,
    } = body

    const shift = await prisma.workShift.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      )
    }

    // Validar horarios si se proporcionan
    const shiftDate = date || shift.date.toISOString().split('T')[0]
    
    // Parsear la fecha en zona horaria local para evitar problemas de UTC
    const [year, month, day] = shiftDate.split('-').map(Number)

    // Helper para crear fecha considerando turnos que cruzan medianoche
    // Usar zona horaria local para evitar problemas de UTC
    const createDateTime = (dateStr: string, timeStr: string, isExit: boolean = false, previousEntryTime?: string) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      const [hours, minutes] = timeStr.split(':').map(Number)
      const baseDate = new Date(y, m - 1, d, hours, minutes, 0)
      
      // Si es una hora de salida y es menor que la entrada, asumimos que cruza medianoche
      if (isExit && previousEntryTime) {
        const [entryHours, entryMinutes] = previousEntryTime.split(':').map(Number)
        const entryTime = new Date(y, m - 1, d, entryHours, entryMinutes, 0)
        if (baseDate <= entryTime) {
          // Agregar un día si la salida es menor que la entrada
          baseDate.setDate(baseDate.getDate() + 1)
        }
      }
      
      return baseDate
    }

    // Validar horarios usando zona horaria local
    let exit1Date: Date | null = null
    if (entryTime1 && exitTime1) {
      const [entryHours, entryMinutes] = entryTime1.split(':').map(Number)
      const entry1 = new Date(year, month - 1, day, entryHours, entryMinutes, 0)
      exit1Date = createDateTime(shiftDate, exitTime1, true, entryTime1)
      
      const diff = exit1Date.getTime() - entry1.getTime()
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
      const entry2 = new Date(year, month - 1, day, entry2Hours, entry2Minutes, 0)
      exit2Date = createDateTime(shiftDate, exitTime2, true, entryTime2)
      
      const diff = exit2Date.getTime() - entry2.getTime()
      if (diff <= 0) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada (Turno 2)' },
          { status: 400 }
        )
      }

      if (exitTime1 && entryTime1) {
        if (exit1Date && entry2 <= exit1Date) {
          return NextResponse.json(
            { error: 'El turno 2 debe comenzar después del turno 1' },
            { status: 400 }
          )
        }
      }
    }

    // Preparar fechas considerando medianoche usando zona horaria local
    const entry1Date = entryTime1 !== undefined 
      ? (entryTime1 ? (() => {
          const [hours, minutes] = entryTime1.split(':').map(Number)
          return new Date(year, month - 1, day, hours, minutes, 0)
        })() : null)
      : undefined
    const exit1DateFinal = exitTime1 !== undefined
      ? (exitTime1 ? createDateTime(shiftDate, exitTime1, true, entryTime1 || shift.entryTime1?.toISOString().split('T')[1]?.slice(0, 5)) : null)
      : undefined
    const entry2Date = entryTime2 !== undefined
      ? (entryTime2 ? (() => {
          const [hours, minutes] = entryTime2.split(':').map(Number)
          return new Date(year, month - 1, day, hours, minutes, 0)
        })() : null)
      : undefined
    const exit2DateFinal = exitTime2 !== undefined
      ? (exitTime2 ? createDateTime(shiftDate, exitTime2, true, entryTime2 || shift.entryTime2?.toISOString().split('T')[1]?.slice(0, 5)) : null)
      : undefined

    // Preparar fecha actualizada si se proporciona (usando zona horaria local)
    const dateOnly = date ? (() => {
      const dateObj = new Date(year, month - 1, day)
      dateObj.setHours(0, 0, 0, 0)
      return dateObj
    })() : undefined

    const updatedShift = await prisma.workShift.update({
      where: { id: params.id },
      data: {
        ...(dateOnly ? { date: dateOnly } : {}),
        ...(entryTime1 !== undefined ? { entryTime1: entry1Date } : {}),
        ...(exitTime1 !== undefined ? { exitTime1: exit1DateFinal } : {}),
        ...(entryTime2 !== undefined ? { entryTime2: entry2Date } : {}),
        ...(exitTime2 !== undefined ? { exitTime2: exit2DateFinal } : {}),
        ...(isPaid !== undefined ? { isPaid } : {}),
      },
    })

    if (isPaid !== undefined) {
      await logActivity(
        'TOGGLE_PAYMENT',
        shift.employeeId,
        `Pago ${isPaid ? 'marcado' : 'desmarcado'} para ${shiftDate}`
      )
    } else {
      await logActivity(
        'UPDATE_SHIFT',
        shift.employeeId,
        `Turno actualizado para ${shiftDate}`
      )
    }

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json(
      { error: 'Error al actualizar turno' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shift = await prisma.workShift.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      )
    }

    await prisma.workShift.delete({
      where: { id: params.id },
    })

    await logActivity(
      'DELETE_SHIFT',
      shift.employeeId,
      `Turno eliminado para ${shift.date.toISOString().split('T')[0]}`
    )

    return NextResponse.json({ message: 'Turno eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json(
      { error: 'Error al eliminar turno' },
      { status: 500 }
    )
  }
}

