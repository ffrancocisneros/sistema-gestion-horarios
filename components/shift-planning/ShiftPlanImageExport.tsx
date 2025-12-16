'use client'

import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale/es'

interface PlanEntry {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  note?: string | null
}

interface ShiftPlanImageExportProps {
  weekStart: Date
  entries: PlanEntry[]
}

export function ShiftPlanImageExport({ weekStart, entries }: ShiftPlanImageExportProps) {
  // Agrupar entries por día y horario (misma lógica que el PDF)
  const entriesByDateAndTime: Record<string, Record<string, string[]>> = {}
  const uniqueTimeSlots = new Set<string>()

  entries.forEach((entry) => {
    const dateKey = entry.date
    const timeKey = `${entry.startTime}-${entry.endTime}`
    
    if (!entriesByDateAndTime[dateKey]) {
      entriesByDateAndTime[dateKey] = {}
    }
    if (!entriesByDateAndTime[dateKey][timeKey]) {
      entriesByDateAndTime[dateKey][timeKey] = []
    }
    
    entriesByDateAndTime[dateKey][timeKey].push(entry.employeeName)
    uniqueTimeSlots.add(timeKey)
  })

  // Ordenar nombres alfabéticamente dentro de cada grupo
  Object.keys(entriesByDateAndTime).forEach(dateKey => {
    Object.keys(entriesByDateAndTime[dateKey]).forEach(timeKey => {
      entriesByDateAndTime[dateKey][timeKey].sort((a, b) => a.localeCompare(b, 'es'))
    })
  })

  // Ordenar horarios únicos (misma lógica que el PDF)
  const sortedTimeSlots = Array.from(uniqueTimeSlots).sort((a, b) => {
    const [startA, endA] = a.split('-')
    const [startB, endB] = b.split('-')
    const startComparison = startA.localeCompare(startB)
    if (startComparison !== 0) {
      return startComparison
    }
    return endA.localeCompare(endB)
  })

  // Detectar filas especiales 19:00 (misma lógica que el PDF)
  const has19to01 = sortedTimeSlots.some(slot => slot === '19:00-01:00')
  const has19to00 = sortedTimeSlots.some(slot => slot === '19:00-00:00')
  
  let finalTimeSlots = [...sortedTimeSlots]
  if (has19to01 || has19to00) {
    finalTimeSlots = finalTimeSlots.filter(slot => slot !== '19:00-01:00' && slot !== '19:00-00:00')
    finalTimeSlots.push('19:00-00:00')
    finalTimeSlots.push('19:00-01:00')
    finalTimeSlots.sort((a, b) => {
      const [startA, endA] = a.split('-')
      const [startB, endB] = b.split('-')
      const startComparison = startA.localeCompare(startB)
      if (startComparison !== 0) {
        return startComparison
      }
      return endA.localeCompare(endB)
    })
  }

  // Días de la semana
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const weekEnd = addDays(weekStart, 6)

  // Determinar si una celda necesita rowSpan
  const getCellContent = (timeSlot: string, dayIndex: number) => {
    const date = addDays(weekStart, dayIndex)
    // Usar el mismo formato de fecha que se guarda en las entradas: 'yyyy-MM-dd'
    const dateKey = format(date, 'yyyy-MM-dd')

    if (timeSlot === '19:00-01:00') {
      return { employees: [], isEmpty: true, rowSpan: 1 }
    } else if (timeSlot === '19:00-00:00') {
      const entries19to01 = entriesByDateAndTime[dateKey]?.['19:00-01:00'] || []
      const entries19to00 = entriesByDateAndTime[dateKey]?.['19:00-00:00'] || []
      const mergedEntries = [...entries19to00, ...entries19to01]

      // Si hay turnos que terminan a las 01:00, el bloque ocupa 19:00-00:00 y 19:00-01:00 (rowSpan 2)
      if (entries19to01.length > 0 && mergedEntries.length > 0) {
        return { employees: mergedEntries, isEmpty: false, rowSpan: 2 }
      }

      // Si solo hay 19:00-00:00 (sin 19:00-01:00), mostrarlo solo en la fila 19:00-00:00 (rowSpan 1)
      if (entries19to00.length > 0) {
        return { employees: entries19to00, isEmpty: false, rowSpan: 1 }
      }

      // Sin turnos en ese rango
      return { employees: [], isEmpty: true, rowSpan: 1 }
    } else {
      const employees = entriesByDateAndTime[dateKey]?.[timeSlot] || []
      return { employees: employees, isEmpty: employees.length === 0, rowSpan: 1 }
    }
  }

  // Trackear qué celdas están ocupadas por rowSpan
  const rowSpanTracker: Record<string, boolean> = {}

  return (
    <div 
      id="shift-plan-image-export" 
      className="absolute -left-[9999px] bg-white"
      style={{ width: '1122px', minHeight: '794px', padding: '40px' }}
    >
      {/* Header: Logo + Título */}
      <div className="flex items-center justify-center mb-6 gap-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          width={40} 
          height={40}
          style={{ display: 'block', verticalAlign: 'middle' }}
        />
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0, lineHeight: '40px' }}>
          PATIO CERVECERO ORO VERDE
        </h1>
      </div>

      {/* Período */}
      <p className="text-center text-base text-gray-700 mb-6" style={{ textAlign: 'center', fontSize: '16px', color: '#374151' }}>
        Semana del {format(weekStart, 'dd/MM/yyyy', { locale: es })} al {format(weekEnd, 'dd/MM/yyyy', { locale: es })}
      </p>

      {/* Tabla */}
      <table className="w-full border-collapse" style={{ borderWidth: '2px', borderColor: '#1B4749' }}>
        <thead>
          <tr style={{ backgroundColor: '#1B4749' }}>
            <th 
              className="text-white font-bold text-sm p-3 text-center"
              style={{ 
                borderWidth: '2px', 
                borderColor: '#1B4749', 
                width: '100px',
                color: '#ffffff',
                textAlign: 'center',
                verticalAlign: 'middle',
                fontWeight: 'bold'
              }}
            >
              Horarios
            </th>
            {dayNames.map((day, i) => {
              const date = addDays(weekStart, i)
              return (
                <th 
                  key={day}
                  className="text-white font-bold text-sm p-3 text-center"
                  style={{ 
                    borderWidth: '2px', 
                    borderColor: '#1B4749', 
                    width: '130px',
                    color: '#ffffff',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 'bold'
                  }}
                >
                  {day}
                  <br />
                  {format(date, 'dd/MM')}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {finalTimeSlots.map((timeSlot, rowIndex) => {
            const [start, end] = timeSlot.split('-')
            
            return (
              <tr key={timeSlot}>
                {/* Columna Horarios */}
                <td 
                  className="font-bold text-sm p-3 text-center bg-white"
                  style={{ 
                    borderWidth: '2px', 
                    borderColor: '#c8c8c8', 
                    color: '#000000',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 'bold'
                  }}
                >
                  {start.slice(0, 5)} a {end.slice(0, 5)}
                </td>

                {/* Columnas de días */}
                {dayNames.map((day, dayIndex) => {
                  const key = `${rowIndex}-${dayIndex}`
                  
                  // Si esta celda está ocupada por un rowSpan anterior, saltarla
                  if (rowSpanTracker[key]) {
                    return null
                  }

                  const cellData = getCellContent(timeSlot, dayIndex)
                  
                  // Si tiene rowSpan > 1, marcar la celda siguiente como ocupada
                  if (cellData.rowSpan > 1) {
                    const nextKey = `${rowIndex + 1}-${dayIndex}`
                    rowSpanTracker[nextKey] = true
                  }

                  return (
                    <td
                      key={`${day}-${timeSlot}`}
                      rowSpan={cellData.rowSpan}
                      className="text-sm p-3 text-center bg-white"
                      style={{ 
                        borderWidth: '2px', 
                        borderColor: '#c8c8c8',
                        backgroundColor: cellData.isEmpty && timeSlot === '19:00-01:00' ? '#f5f5f5' : 'white',
                        color: '#000000',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}
                    >
                      {cellData.employees.map((emp, idx) => (
                        <div key={idx} style={{ textAlign: 'center', color: '#000000' }}>{emp}</div>
                      ))}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

