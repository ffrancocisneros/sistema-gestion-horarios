'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WeeklyPlanGrid } from '@/components/shift-planning/WeeklyPlanGrid'
import { ShiftPlanImageExport } from '@/components/shift-planning/ShiftPlanImageExport'
import { format, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { ChevronLeft, ChevronRight, Plus, Save, Download, Image as ImageIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import html2canvas from 'html2canvas'

interface Employee {
  id: string
  name: string
}

interface PlanEntry {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  note?: string | null
}

interface NewEntry {
  employeeId: string
  date: string
  startTime: string
  endTime: string
  note: string
}

export default function ShiftPlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [planId, setPlanId] = useState<string | null>(null)
  const [entries, setEntries] = useState<PlanEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingImage, setExportingImage] = useState(false)
  
  // Estados para el diálogo de agregar/editar turno
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PlanEntry | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [note, setNote] = useState('')

  // Empleados ordenados alfabéticamente
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [employees])

  useEffect(() => {
    const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 })
    setWeekStart(weekStartDate)
    fetchPlan(weekStartDate)
  }, [currentDate])

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setEmployees(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchPlan = async (weekStartDate: Date) => {
    setLoading(true)
    try {
      const weekStartStr = format(weekStartDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/shift-plans?weekStart=${weekStartStr}`)
      
      if (response.ok) {
        const data = await response.json()
        setPlanId(data.plan?.id || null)
        setEntries(data.entries || [])
      } else {
        toast.error('Error al cargar la planificación')
      }
    } catch (error) {
      console.error('Error fetching plan:', error)
      toast.error('Error al cargar la planificación')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1))
  }

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1))
  }

  const handleAddShift = (dateStr: string) => {
    setEditingEntry(null)
    setSelectedDate(dateStr)
    setSelectedEmployees([])
    setStartTime('09:00')
    setEndTime('17:00')
    setNote('')
    setIsDialogOpen(true)
  }

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId)
      } else {
        return [...prev, employeeId]
      }
    })
  }

  const handleConfirmAdd = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Selecciona al menos un empleado')
      return
    }

    if (!startTime || !endTime) {
      toast.error('Ingresa horario de inicio y fin')
      return
    }

    if (editingEntry) {
      // Modo edición: actualizar el turno existente
      setEntries(prev => prev.map(e => 
        e.id === editingEntry.id
          ? {
              ...e,
              employeeId: selectedEmployees[0],
              employeeName: employees.find(emp => emp.id === selectedEmployees[0])?.name || e.employeeName,
              date: selectedDate,
              startTime,
              endTime,
              note: note || null,
            }
          : e
      ))
      setIsDialogOpen(false)
      setEditingEntry(null)
      toast.success('Turno actualizado. Recuerda guardar los cambios.')
    } else {
      // Modo agregar: crear nuevos entries para cada empleado seleccionado
      const newEntries: PlanEntry[] = selectedEmployees.map(empId => {
        const employee = employees.find(e => e.id === empId)
        return {
          id: `temp-${Date.now()}-${empId}`,
          employeeId: empId,
          employeeName: employee?.name || '',
          date: selectedDate,
          startTime,
          endTime,
          note: note || null,
        }
      })

      setEntries(prev => [...prev, ...newEntries])
      setIsDialogOpen(false)
      toast.success('Turnos agregados. Recuerda guardar la planificación.')
    }
  }

  const handleEditEntry = (entry: PlanEntry) => {
    setEditingEntry(entry)
    setSelectedDate(entry.date)
    setSelectedEmployees([entry.employeeId])
    setStartTime(entry.startTime)
    setEndTime(entry.endTime)
    setNote(entry.note || '')
    setIsDialogOpen(true)
  }

  const handleDeleteEntry = (entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId))
    toast.success('Turno eliminado. Recuerda guardar los cambios.')
  }

  const handleSavePlan = async () => {
    setSaving(true)
    try {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      
      const response = await fetch('/api/shift-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStartDate: weekStartStr,
          name: `Semana del ${format(weekStart, 'dd/MM/yyyy')}`,
          description: null,
          entries: entries.map(e => ({
            employeeId: e.employeeId,
            date: e.date,
            startTime: e.startTime,
            endTime: e.endTime,
            note: e.note,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPlanId(data.plan.id)
        setEntries(data.entries)
        toast.success('Planificación guardada correctamente')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }
    } catch (error: any) {
      console.error('Error saving plan:', error)
      toast.error(error.message || 'Error al guardar la planificación')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    if (entries.length === 0) {
      toast.error('No hay turnos para exportar. Agrega turnos primero.')
      return
    }

    // Verificar si hay cambios sin guardar
    if (!planId) {
      toast.error('Debes guardar la planificación antes de exportar')
      return
    }

    setExporting(true)
    try {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const response = await fetch(`/api/shift-plans/export?weekStart=${weekStartStr}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al generar el PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `planificacion-turnos-${weekStartStr}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF generado correctamente')
    } catch (error: any) {
      console.error('Error exporting PDF:', error)
      toast.error(error.message || 'Error al generar el PDF')
    } finally {
      setExporting(false)
    }
  }

  const handleExportImage = async () => {
    if (entries.length === 0) {
      toast.error('No hay turnos para exportar. Agrega turnos primero.')
      return
    }

    // Verificar si hay cambios sin guardar
    if (!planId) {
      toast.error('Debes guardar la planificación antes de exportar')
      return
    }

    setExportingImage(true)
    try {
      // Buscar el elemento oculto con el diseño del PDF
      const element = document.getElementById('shift-plan-image-export')
      
      if (!element) {
        throw new Error('No se encontró el elemento para exportar')
      }

      // Capturar como canvas con alta calidad
      const canvas = await html2canvas(element, {
        scale: 2, // Mayor escala = mejor calidad
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
      })

      // Convertir a blob y descargar
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Error al generar la imagen')
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const weekStartStr = format(weekStart, 'yyyy-MM-dd')
        a.download = `planificacion-turnos-${weekStartStr}.png`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast.success('Imagen exportada correctamente')
      }, 'image/png')
    } catch (error: any) {
      console.error('Error exporting image:', error)
      toast.error(error.message || 'Error al exportar la imagen')
    } finally {
      setExportingImage(false)
    }
  }

  // Generar días de la semana para los botones de agregar
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return {
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEEE', { locale: es }),
    }
  })

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Planificación de Turnos</h1>
          <p className="text-muted-foreground mt-1">
            Crea un plan visual semanal para organizar los turnos
          </p>
        </div>
      </div>
      <div className="border-b mb-6"></div>

      {/* Selector de semana */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Semana</CardTitle>
          <CardDescription>
            Selecciona la semana a planificar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-lg font-semibold">
                Semana del {format(weekStart, 'dd/MM/yyyy')} al {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(weekStart, 'MMMM yyyy', { locale: es })}
              </div>
            </div>
            <Button variant="outline" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de planificación */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Planificación Semanal</CardTitle>
              <CardDescription>
                {entries.length} turno{entries.length !== 1 ? 's' : ''} planificado{entries.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSavePlan} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={exporting || entries.length === 0 || !planId}
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exportando...' : 'Exportar PDF'}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportImage}
                disabled={exportingImage || entries.length === 0 || !planId}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {exportingImage ? 'Generando...' : 'Exportar Imagen'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">Cargando planificación...</p>
            </div>
          ) : (
            <>
              <WeeklyPlanGrid 
                weekStartDate={weekStart} 
                entries={entries}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
              />
              
              {/* Botones para agregar turnos por día */}
              <div className="grid grid-cols-7 gap-2 mt-4">
                {weekDays.map((day) => (
                  <Button
                    key={day.dateString}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddShift(day.dateString)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="capitalize text-xs">{day.dayName.slice(0, 3)}</span>
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para agregar turno */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Editar Turno' : 'Agregar Turno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Hora inicio</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">Hora fin</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Empleados</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2 mt-2">
                {sortedEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay empleados disponibles</p>
                ) : (
                  sortedEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`emp-${emp.id}`}
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => handleEmployeeToggle(emp.id)}
                      />
                      <label
                        htmlFor={`emp-${emp.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {emp.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="note">Nota (opcional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Atención especial..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmAdd}>
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Componente oculto para exportar como imagen */}
      {entries.length > 0 && (
        <ShiftPlanImageExport weekStart={weekStart} entries={entries} />
      )}
    </div>
  )
}

