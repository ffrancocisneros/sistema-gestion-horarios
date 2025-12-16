import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, addDays, getDay } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { readFileSync } from 'fs'
import { join } from 'path'

// Tipo para las entradas agrupadas
type GroupedEntry = {
  employeeName: string
  startTime: string
  endTime: string
}

// Helper para extraer fecha (YYYY-MM-DD) de un Date sin problemas de zona horaria
const extractLocalDate = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper para formatear fecha localmente sin problemas de zona horaria
const formatLocalDate = (date: Date, formatStr: string): string => {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const localDate = new Date(year, month, day)
  return format(localDate, formatStr, { locale: es })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')

    if (!weekStart) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro weekStart (fecha del lunes)' },
        { status: 400 }
      )
    }

    // Parsear fecha en UTC para evitar problemas de zona horaria
    const [year, month, day] = weekStart.split('-').map(Number)
    const weekStartDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

    // Buscar plan existente
    const plan = await prisma.shiftPlanWeek.findUnique({
      where: {
        weekStartDate: weekStartDate,
      },
      include: {
        entries: {
          include: {
            employee: true,
          },
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' },
            { endTime: 'asc' },
          ],
        },
      },
    })

    if (!plan || plan.entries.length === 0) {
      return NextResponse.json(
        { error: 'No hay planificación para esta semana' },
        { status: 404 }
      )
    }

    // Crear PDF en orientación horizontal
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Agregar logo y título centrados
    try {
      const logoPath = join(process.cwd(), 'public', 'logo.png')
      const logoBuffer = readFileSync(logoPath)
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
      
      // Configurar fuente para medir el ancho del texto
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const text = 'PATIO CERVECERO ORO VERDE'
      const textWidth = doc.getTextWidth(text)
      
      // Dimensiones del logo
      const logoSize = 10 // 10mm x 10mm
      const spacing = 3 // Espacio entre logo y texto
      
      // Calcular posición para centrar todo el conjunto (logo + espacio + texto)
      const totalWidth = logoSize + spacing + textWidth
      const pageWidth = doc.internal.pageSize.getWidth()
      const startX = (pageWidth - totalWidth) / 2
      
      // Posición Y centrada para logo y texto
      const logoY = 10
      const textY = logoY + (logoSize / 2) + 2 // Centrado verticalmente con el logo
      
      // Dibujar logo
      doc.addImage(logoBase64, 'PNG', startX, logoY, logoSize, logoSize)
      
      // Dibujar texto centrado verticalmente con el logo
      doc.text(text, startX + logoSize + spacing, textY)
    } catch (error) {
      console.error('Error loading logo:', error)
      // Si falla, solo mostrar el texto centrado
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('PATIO CERVECERO ORO VERDE', 148.5, 15, { align: 'center' })
    }

    // Período (centrado, debajo del logo/título)
    const weekEnd = addDays(weekStartDate, 6)
    const periodText = `Semana del ${formatLocalDate(weekStartDate, 'dd/MM/yyyy')} al ${formatLocalDate(weekEnd, 'dd/MM/yyyy')}`

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(periodText, 148.5, 22, { align: 'center' })

    // Agrupar entries por día y horario
    // Estructura: { dateKey: { timeKey: [employeeNames] } }
    const entriesByDateAndTime: Record<string, Record<string, string[]>> = {}
    const uniqueTimeSlots = new Set<string>()

    plan.entries.forEach((entry) => {
      // Extraer la fecha en formato YYYY-MM-DD sin problemas de zona horaria
      const dateKey = extractLocalDate(entry.date)
      const timeKey = `${entry.startTime}-${entry.endTime}`
      
      if (!entriesByDateAndTime[dateKey]) {
        entriesByDateAndTime[dateKey] = {}
      }
      if (!entriesByDateAndTime[dateKey][timeKey]) {
        entriesByDateAndTime[dateKey][timeKey] = []
      }
      
      entriesByDateAndTime[dateKey][timeKey].push(entry.employee.name)
      uniqueTimeSlots.add(timeKey)
    })

    // Ordenar nombres alfabéticamente dentro de cada grupo
    Object.keys(entriesByDateAndTime).forEach(dateKey => {
      Object.keys(entriesByDateAndTime[dateKey]).forEach(timeKey => {
        entriesByDateAndTime[dateKey][timeKey].sort((a, b) => a.localeCompare(b, 'es'))
      })
    })

    // Ordenar horarios únicos por hora de inicio, y luego por hora de fin (más temprano primero)
    const sortedTimeSlots = Array.from(uniqueTimeSlots).sort((a, b) => {
      const [startA, endA] = a.split('-')
      const [startB, endB] = b.split('-')
      const startComparison = startA.localeCompare(startB)
      if (startComparison !== 0) {
        return startComparison
      }
      // Si tienen el mismo horario de inicio, ordenar por hora de fin (más temprano primero)
      return endA.localeCompare(endB)
    })

    // Detectar si necesitamos fila adicional "19-01" (para V-S)
    const has19to01 = sortedTimeSlots.some(slot => slot === '19:00-01:00')
    const has19to00 = sortedTimeSlots.some(slot => slot === '19:00-00:00')
    
    // Si hay 19-01, agregar fila especial
    let finalTimeSlots = [...sortedTimeSlots]
    if (has19to01 || has19to00) {
      // Remover 19:00-01:00 y 19:00-00:00 si existen
      finalTimeSlots = finalTimeSlots.filter(slot => slot !== '19:00-01:00' && slot !== '19:00-00:00')
      // Agregar manualmente las dos filas especiales
      finalTimeSlots.push('19:00-00:00')
      finalTimeSlots.push('19:00-01:00')
      finalTimeSlots.sort((a, b) => {
        const [startA, endA] = a.split('-')
        const [startB, endB] = b.split('-')
        const startComparison = startA.localeCompare(startB)
        if (startComparison !== 0) {
          return startComparison
        }
        // Si tienen el mismo horario de inicio, ordenar por hora de fin (más temprano primero)
        return endA.localeCompare(endB)
      })
    }

    // Preparar headers
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    const headers = ['Horarios', ...dayNames.map((day, i) => {
      const date = addDays(weekStartDate, i)
      return `${day}\n${formatLocalDate(date, 'dd/MM')}`
    })]

    // Preparar body de la tabla
    // Necesitamos trackear qué columnas tienen rowSpan activo
    const body: any[] = []
    const rowSpanTracker: Record<number, boolean> = {} // dayIndex -> tiene rowSpan activo en fila anterior

    finalTimeSlots.forEach((timeSlot, rowIndex) => {
      const row: any[] = []
      
      // Primera columna: Horarios
      const [start, end] = timeSlot.split('-')
      row.push({ content: `${start.slice(0, 5)} a ${end.slice(0, 5)}`, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } })

      // Resetear tracker si es una fila nueva no-19:00-01:00
      if (timeSlot !== '19:00-01:00') {
        for (let i = 0; i < 7; i++) {
          rowSpanTracker[i] = false
        }
      }

      // Columnas de días
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        // Si esta celda está ocupada por un rowSpan de la fila anterior, saltarla
        if (timeSlot === '19:00-01:00' && rowSpanTracker[dayIndex]) {
          continue // NO agregar celda, está ocupada por rowSpan
        }

        const date = addDays(weekStartDate, dayIndex)
        // Extraer fecha sin problemas de zona horaria
        const dateKey = extractLocalDate(date)

        // Caso especial: fila "19:00-01:00"
        if (timeSlot === '19:00-01:00') {
          // Esta fila muestra celdas vacías grises solo para días que NO tienen rowSpan
          row.push({ content: '', styles: { fillColor: [245, 245, 245] } })
        } else if (timeSlot === '19:00-00:00') {
          // Fila "19:00-00:00"
          // Revisar si Viernes o Sábado tienen turno 19:00-01:00
          const entries19to01 = entriesByDateAndTime[dateKey]?.['19:00-01:00'] || []
          const entries19to00 = entriesByDateAndTime[dateKey]?.['19:00-00:00'] || []
          const mergedEntries = [...entries19to00, ...entries19to01]
          
          if (mergedEntries.length > 0) {
            // Cualquier día con turno entre 19:00 y 00:00/01:00: usar rowSpan 2 y mostrar todos los empleados
            row.push({
              content: mergedEntries.join('\n'),
              rowSpan: 2,
              styles: { halign: 'center', valign: 'middle' }
            })
            // Marcar que esta columna tiene rowSpan activo
            rowSpanTracker[dayIndex] = true
          } else {
            // Sin turnos en ese rango para este día
            row.push({
              content: '',
              styles: { halign: 'center', valign: 'middle' }
            })
          }
        } else {
          // Filas normales (incluye 11:00-16:00 y otros horarios)
          const employees = entriesByDateAndTime[dateKey]?.[timeSlot] || []
          row.push({
            content: employees.length > 0 ? employees.join('\n') : '',
            styles: { halign: 'center', valign: 'middle' }
          })
        }
      }

      body.push(row)
    })

    // Generar tabla con autoTable
    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.75, // Grosor de líneas más grueso (2 pixels ≈ 0.75mm)
        lineColor: [200, 200, 200],
      },
      headStyles: {
        fillColor: [27, 71, 73], // Color #1B4749
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.75,
        lineColor: [27, 71, 73],
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' }, // Columna Horarios
        1: { cellWidth: 32 }, // Lunes
        2: { cellWidth: 32 }, // Martes
        3: { cellWidth: 32 }, // Miércoles
        4: { cellWidth: 32 }, // Jueves
        5: { cellWidth: 32 }, // Viernes
        6: { cellWidth: 32 }, // Sábado
        7: { cellWidth: 32 }, // Domingo
      },
      margin: { left: 10, right: 10 },
    })

    // Generar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Devolver PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="planificacion-turnos-${weekStart}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating shift plan export:', error)
    return NextResponse.json(
      {
        error: 'Error al generar la exportación',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}
