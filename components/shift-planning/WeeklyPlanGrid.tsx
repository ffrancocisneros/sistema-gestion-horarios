'use client'

import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

interface PlanEntry {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  note?: string | null
}

interface WeeklyPlanGridProps {
  weekStartDate: Date
  entries: PlanEntry[]
  onEditEntry?: (entry: PlanEntry) => void
  onDeleteEntry?: (entryId: string) => void
}

export function WeeklyPlanGrid({ weekStartDate, entries, onEditEntry, onDeleteEntry }: WeeklyPlanGridProps) {
  // Generar días de la semana (Lunes a Domingo)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStartDate, i)
    return {
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEEE', { locale: es }),
      dayNumber: format(date, 'd'),
    }
  })

  // Agrupar entries por fecha
  const entriesByDate: Record<string, PlanEntry[]> = {}
  entries.forEach((entry) => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = []
    }
    entriesByDate[entry.date].push(entry)
  })

  // Ordenar entries dentro de cada día por hora de inicio, y si coinciden, por hora de fin (más temprano primero)
  Object.keys(entriesByDate).forEach((date) => {
    entriesByDate[date].sort((a, b) => {
      const startComparison = a.startTime.localeCompare(b.startTime)
      if (startComparison !== 0) {
        return startComparison
      }
      // Si tienen el mismo horario de inicio, ordenar por hora de fin (más temprano primero)
      return a.endTime.localeCompare(b.endTime)
    })
  })

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Encabezados de días */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day.dateString}
              className="text-center p-3 bg-muted rounded-lg border"
            >
              <div className="font-semibold capitalize text-sm">
                {day.dayName}
              </div>
              <div className="text-2xl font-bold">{day.dayNumber}</div>
              <div className="text-xs text-muted-foreground">
                {format(day.date, 'MMM', { locale: es })}
              </div>
            </div>
          ))}
        </div>

        {/* Grid de turnos */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayEntries = entriesByDate[day.dateString] || []

            return (
              <div
                key={day.dateString}
                className="min-h-[200px] p-3 bg-card border rounded-lg"
              >
                {dayEntries.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Sin turnos
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-2 bg-primary/10 border border-primary/20 rounded text-sm group relative"
                      >
                        <div className="font-semibold text-xs text-blue-700 dark:text-blue-300">
                          {entry.startTime} - {entry.endTime}
                        </div>
                        <div className="font-medium mt-1">
                          {entry.employeeName}
                        </div>
                        {entry.note && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            {entry.note}
                          </div>
                        )}
                        
                        {/* Botones de acción */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEditEntry && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onEditEntry(entry)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          {onDeleteEntry && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => onDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

