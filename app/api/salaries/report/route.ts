import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeIdsParam = searchParams.get('employeeIds')
    const period = searchParams.get('period') || 'monthly' // weekly | monthly
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Parsear employeeIds
    const employeeIds = employeeIdsParam ? employeeIdsParam.split(',') : []
    const includeAll = employeeIds.length === 0 || employeeIdsParam === 'all'

    // Construir filtro
    const where: any = {}

    if (!includeAll) {
      where.employeeId = { in: employeeIds }
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number)
        const start = new Date(year, month - 1, day)
        start.setHours(0, 0, 0, 0)
        where.date.gte = start
      }
      if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number)
        const endDateObj = new Date(year, month - 1, day + 1)
        endDateObj.setHours(0, 0, 0, 0)
        where.date.lt = endDateObj
      }
    }

    // Obtener turnos
    const shifts = await prisma.workShift.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: [
        { employee: { name: 'asc' } },
        { date: 'asc' },
      ],
    })

    if (shifts.length === 0) {
      return NextResponse.json(
        { error: 'No hay turnos registrados para el período y empleados seleccionados' },
        { status: 404 }
      )
    }

    // Agrupar por empleado
    const employeeData: Record<
      string,
      {
        name: string
        hourlyRate: number
        shifts: Array<{
          date: string
          entryTime1: Date | null
          exitTime1: Date | null
          entryTime2: Date | null
          exitTime2: Date | null
          hours: number
          salary: number
        }>
        totalHours: number
        totalSalary: number
      }
    > = {}

    shifts.forEach((shift) => {
      const empId = shift.employeeId
      if (!employeeData[empId]) {
        employeeData[empId] = {
          name: shift.employee.name,
          // Si el empleado no tiene valor por hora definido, se considera 0 para el reporte
          hourlyRate: shift.employee.hourlyRate ?? 0,
          shifts: [],
          totalHours: 0,
          totalSalary: 0,
        }
      }

      let hours = 0
      if (shift.entryTime1 && shift.exitTime1) {
        hours += (shift.exitTime1.getTime() - shift.entryTime1.getTime()) / (1000 * 60 * 60)
      }
      if (shift.entryTime2 && shift.exitTime2) {
        hours += (shift.exitTime2.getTime() - shift.entryTime2.getTime()) / (1000 * 60 * 60)
      }

      // Solo incluir turnos que tengan horas trabajadas
      if (hours > 0) {
        const hourlyRate = shift.employee.hourlyRate ?? 0
        const salary = hours * hourlyRate

        employeeData[empId].shifts.push({
          date: shift.date.toISOString().split('T')[0],
          entryTime1: shift.entryTime1,
          exitTime1: shift.exitTime1,
          entryTime2: shift.entryTime2,
          exitTime2: shift.exitTime2,
          hours: Math.round(hours * 100) / 100,
          salary: Math.round(salary * 100) / 100,
        })

        employeeData[empId].totalHours += hours
        employeeData[empId].totalSalary += salary
      }
    })

    // Crear PDF
    const doc = new jsPDF()

    // Título del reporte
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Reporte de Sueldos', 105, 20, { align: 'center' })

    // Período
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    let periodText = ''
    if (period === 'weekly' && startDate && endDate) {
      // Parsear fechas en UTC para evitar problemas de zona horaria
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
      const startDateLocal = new Date(startYear, startMonth - 1, startDay)
      const endDateLocal = new Date(endYear, endMonth - 1, endDay)
      periodText = `Período: Semana del ${format(startDateLocal, 'dd/MM/yyyy', { locale: es })} al ${format(endDateLocal, 'dd/MM/yyyy', { locale: es })}`
    } else if (period === 'monthly' && startDate) {
      const [year, month, day] = startDate.split('-').map(Number)
      const startDateLocal = new Date(year, month - 1, day)
      periodText = `Período: ${format(startDateLocal, 'MMMM yyyy', { locale: es })}`
    } else if (startDate && endDate) {
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
      const startDateLocal = new Date(startYear, startMonth - 1, startDay)
      const endDateLocal = new Date(endYear, endMonth - 1, endDay)
      periodText = `Período: ${format(startDateLocal, 'dd/MM/yyyy', { locale: es })} al ${format(endDateLocal, 'dd/MM/yyyy', { locale: es })}`
    }
    doc.text(periodText, 105, 30, { align: 'center' })

    doc.setFontSize(10)
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 105, 37, { align: 'center' })

    let yPos = 50

    // Iterar sobre cada empleado
    for (const [empId, data] of Object.entries(employeeData)) {
      // Verificar si necesitamos nueva página
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      // Nombre del empleado
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(data.name, 20, yPos)
      yPos += 10

      // Resumen del empleado
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Tarifa por hora: $${data.hourlyRate.toLocaleString('es-AR')}`, 20, yPos)
      yPos += 6
      doc.text(`Total de horas: ${data.totalHours.toFixed(2)}h`, 20, yPos)
      yPos += 6
      doc.text(`Total a pagar: $${Math.round(data.totalSalary).toLocaleString('es-AR')}`, 20, yPos)
      yPos += 10

      // Tabla de turnos
      const tableData = data.shifts.map((shift) => {
        let scheduleText = ''
        if (shift.entryTime1 && shift.exitTime1) {
          scheduleText = `${format(new Date(shift.entryTime1), 'HH:mm')} - ${format(new Date(shift.exitTime1), 'HH:mm')}`
        }
        if (shift.entryTime2 && shift.exitTime2) {
          if (scheduleText) scheduleText += '\n'
          scheduleText += `${format(new Date(shift.entryTime2), 'HH:mm')} - ${format(new Date(shift.exitTime2), 'HH:mm')}`
        }

        // Parsear fecha correctamente para evitar problemas de zona horaria
        const [year, month, day] = shift.date.split('-').map(Number)
        const shiftDateLocal = new Date(year, month - 1, day)

        return [
          format(shiftDateLocal, 'dd/MM/yyyy', { locale: es }),
          scheduleText,
          `${shift.hours.toFixed(2)}h`,
          `$${shift.salary.toLocaleString('es-AR')}`,
        ]
      })

      // Agregar fila de totales
      tableData.push([
        'Total',
        '',
        `${data.totalHours.toFixed(2)}h`,
        `$${Math.round(data.totalSalary).toLocaleString('es-AR')}`,
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Horario', 'Horas', 'Sueldo']],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { left: 20 },
        didDrawPage: (data) => {
          yPos = data.cursor?.y || yPos
        },
        // Estilos para la última fila (totales)
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.row.index === tableData.length - 1) {
            hookData.cell.styles.fontStyle = 'bold'
            hookData.cell.styles.fillColor = [240, 240, 240]
          }
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 15
    }

    // Generar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Devolver PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-sueldos-${format(new Date(), 'yyyy-MM-dd')}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating salary report:', error)
    return NextResponse.json(
      {
        error: 'Error al generar el reporte',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

