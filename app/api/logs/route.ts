import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'timestamp'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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

    // Validar parámetros de ordenamiento
    const validSortFields = ['timestamp', 'action']
    const validSortOrder = ['asc', 'desc']
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp'
    const order = validSortOrder.includes(sortOrder) ? sortOrder : 'desc'
    
    const skip = (page - 1) * limit

    // Obtener total de registros con los mismos filtros
    const total = await prisma.activityLog.count({ where })

    // Obtener logs con paginación y ordenamiento
    const logs = await prisma.activityLog.findMany({
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
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Error al obtener logs' },
      { status: 500 }
    )
  }
}

