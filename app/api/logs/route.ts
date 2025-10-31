import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (employeeId) {
      where.employeeId = employeeId
    }
    if (action) {
      where.action = action
    }
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate)
      }
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 1000, // Limitar a 1000 registros más recientes
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Error al obtener logs' },
      { status: 500 }
    )
  }
}

