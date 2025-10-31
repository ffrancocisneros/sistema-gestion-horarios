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

    if (entryTime1 && exitTime1) {
      const entry1 = new Date(`${shiftDate}T${entryTime1}:00`)
      const exit1 = new Date(`${shiftDate}T${exitTime1}:00`)
      if (exit1 <= entry1) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada (Turno 1)' },
          { status: 400 }
        )
      }
    }

    if (entryTime2 && exitTime2) {
      const entry2 = new Date(`${shiftDate}T${entryTime2}:00`)
      const exit2 = new Date(`${shiftDate}T${exitTime2}:00`)
      if (exit2 <= entry2) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada (Turno 2)' },
          { status: 400 }
        )
      }

      if (exitTime1) {
        const exit1 = new Date(`${shiftDate}T${exitTime1}:00`)
        if (entry2 <= exit1) {
          return NextResponse.json(
            { error: 'El turno 2 debe comenzar después del turno 1' },
            { status: 400 }
          )
        }
      }
    }

    const updatedShift = await prisma.workShift.update({
      where: { id: params.id },
      data: {
        ...(entryTime1 !== undefined
          ? { entryTime1: entryTime1 ? new Date(`${shiftDate}T${entryTime1}:00`) : null }
          : {}),
        ...(exitTime1 !== undefined
          ? { exitTime1: exitTime1 ? new Date(`${shiftDate}T${exitTime1}:00`) : null }
          : {}),
        ...(entryTime2 !== undefined
          ? { entryTime2: entryTime2 ? new Date(`${shiftDate}T${entryTime2}:00`) : null }
          : {}),
        ...(exitTime2 !== undefined
          ? { exitTime2: exitTime2 ? new Date(`${shiftDate}T${exitTime2}:00`) : null }
          : {}),
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

