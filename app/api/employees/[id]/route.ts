import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        workShifts: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Error al obtener empleado' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, hourlyRate } = body

    const updateData: any = {}
    
    if (name !== undefined) {
      updateData.name = name
    }
    
    if (hourlyRate !== undefined) {
      updateData.hourlyRate = hourlyRate && hourlyRate !== '' ? parseFloat(hourlyRate) : null
    }

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: updateData,
    })

    await logActivity('UPDATE_EMPLOYEE', employee.id, `Empleado actualizado: ${name || employee.name}`)

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Error al actualizar empleado' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    await prisma.employee.delete({
      where: { id: params.id },
    })

    await logActivity('DELETE_EMPLOYEE', null, `Empleado ${employee.name} eliminado`)

    return NextResponse.json({ message: 'Empleado eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Error al eliminar empleado' },
      { status: 500 }
    )
  }
}

