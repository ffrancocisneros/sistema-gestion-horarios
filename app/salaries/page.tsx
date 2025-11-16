'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Pagination } from '@/components/ui/pagination'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getWeek, getDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { DollarSign, Clock, Calendar, AlertTriangle, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useSortableTable } from '@/hooks/use-sortable-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Employee {
  id: string
  name: string
}

interface SalarySummary {
  totalSalary: number
  totalHours: number
  totalShifts: number
  startDate: string | null
  endDate: string | null
}

interface EmployeeSalaryData {
  employeeId: string
  employeeName: string
  hourlyRate: number
  totalHours: number
  totalSalary: number
  period: string
  periodData: Array<{ date: string; salary: number }>
}

interface DetailedShift {
  shiftId: string
  employeeId: string
  employeeName: string
  date: string
  entryTime1: string | null
  exitTime1: string | null
  entryTime2: string | null
  exitTime2: string | null
  hours: number
  salary: number
  hourlyRate: number
}

interface SalaryResponse {
  summary: SalarySummary
  employees: EmployeeSalaryData[]
  detailedShifts: DetailedShift[]
}

export default function SalariesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salaryData, setSalaryData] = useState<SalaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [period, setPeriod] = useState<string>('monthly')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [fetchAbortController, setFetchAbortController] = useState<AbortController | null>(null)

  // Estados para exportación de reportes
  const [exportPeriod, setExportPeriod] = useState<'weekly' | 'monthly'>('monthly')
  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedEmployeesExport, setSelectedEmployeesExport] = useState<string[]>([])
  const [exportAll, setExportAll] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false)
  const [incompleteShiftsInfo, setIncompleteShiftsInfo] = useState<{ count: number; employees: string[] }>({ count: 0, employees: [] })
  const [employeesWithoutRate, setEmployeesWithoutRate] = useState<string[]>([])

  const { sortBy, sortOrder, handleSort, getSortIcon } = useSortableTable<'date' | 'employeeName' | 'hours' | 'salary'>('date', 'desc')

  // Empleados ordenados alfabéticamente
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [employees])

  // Calcular fechas automáticamente según el período
  const { startDate, endDate, periodLabel, periodSubtitle } = useMemo(() => {
    let start: Date
    let end: Date
    let label: string
    let subtitle: string

    if (period === 'weekly') {
      // Semana de la fecha actual (lunes a domingo)
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
      const weekNumber = getWeek(currentDate, { weekStartsOn: 1, firstWeekContainsDate: 4 })
      label = 'Resumen Semanal'
      subtitle = `Semana del ${format(start, 'dd/MM/yyyy', { locale: es })} al ${format(end, 'dd/MM/yyyy', { locale: es })}\nSemana ${weekNumber}`
    } else {
      // Mes de la fecha actual
      start = startOfMonth(currentDate)
      end = endOfMonth(currentDate)
      label = 'Resumen Mensual'
      subtitle = format(currentDate, 'MMMM yyyy', { locale: es })
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      periodLabel: label,
      periodSubtitle: subtitle,
    }
  }, [period, currentDate])

  // Funciones de navegación
  const handlePreviousPeriod = () => {
    if (period === 'weekly') {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(subMonths(currentDate, 1))
    }
  }

  const handleNextPeriod = () => {
    if (period === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  // Funciones para exportación
  const handleEmployeeToggleExport = (employeeId: string) => {
    setSelectedEmployeesExport(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId)
      } else {
        return [...prev, employeeId]
      }
    })
  }

  const handleGeneratePDF = async () => {
    setExporting(true)
    try {
      // Calcular fechas según período
      let startDateExport: Date
      let endDateExport: Date

      if (exportPeriod === 'weekly') {
        const [year, month, day] = exportDate.split('-').map(Number)
        const selectedDate = new Date(year, month - 1, day)
        startDateExport = startOfWeek(selectedDate, { weekStartsOn: 1 })
        endDateExport = endOfWeek(selectedDate, { weekStartsOn: 1 })
      } else {
        const [year, month] = exportMonth.split('-').map(Number)
        const selectedMonth = new Date(year, month - 1, 1)
        startDateExport = startOfMonth(selectedMonth)
        endDateExport = endOfMonth(selectedMonth)
      }

      // Verificar si hay turnos incompletos
      const checkParams = new URLSearchParams()
      checkParams.append('startDate', format(startDateExport, 'yyyy-MM-dd'))
      checkParams.append('endDate', format(endDateExport, 'yyyy-MM-dd'))
      if (!exportAll && selectedEmployeesExport.length > 0) {
        checkParams.append('employeeId', selectedEmployeesExport.join(','))
      }

      const checkResponse = await fetch(`/api/salaries?${checkParams.toString()}`)
      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        
        // Verificar empleados sin hourlyRate
        const employeesWithoutRate = checkData.detailedShifts?.filter((shift: any) => 
          shift.hourlyRate === null || shift.hourlyRate === undefined
        ) || []

        if (employeesWithoutRate.length > 0) {
          const uniqueEmployees = Array.from<string>(
            new Set<string>(employeesWithoutRate.map((s: any) => s.employeeName))
          )
          toast.error(
            `No se puede generar el PDF. Los siguientes empleados no tienen valor por hora asignado: ${uniqueEmployees.join(', ')}`,
            { duration: 6000 }
          )
          setExporting(false)
          return
        }
        
        // Buscar turnos incompletos
        const incompleteShifts = checkData.detailedShifts?.filter((shift: any) => {
          const hasIncompleteEntry1 = (shift.entryTime1 && !shift.exitTime1) || (!shift.entryTime1 && shift.exitTime1)
          const hasIncompleteEntry2 = (shift.entryTime2 && !shift.exitTime2) || (!shift.entryTime2 && shift.exitTime2)
          return hasIncompleteEntry1 || hasIncompleteEntry2
        }) || []

        if (incompleteShifts.length > 0) {
          // Obtener nombres únicos de empleados con turnos incompletos
          const uniqueEmployees = Array.from<string>(
            new Set<string>(incompleteShifts.map((s: any) => s.employeeName))
          )
          setIncompleteShiftsInfo({
            count: incompleteShifts.length,
            employees: uniqueEmployees
          })
          setShowIncompleteWarning(true)
          setExporting(false)
          return
        }
      }

      // Si no hay turnos incompletos ni empleados sin hourlyRate, proceder con la exportación
      await proceedWithExport(startDateExport, endDateExport)
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      toast.error(error.message || 'Error al generar el reporte')
      setExporting(false)
    }
  }

  const proceedWithExport = async (startDateExport: Date, endDateExport: Date) => {
    setExporting(true)
    try {
      // Construir parámetros
      const params = new URLSearchParams()
      params.append('period', exportPeriod)
      params.append('startDate', format(startDateExport, 'yyyy-MM-dd'))
      params.append('endDate', format(endDateExport, 'yyyy-MM-dd'))

      // Agregar empleados seleccionados
      if (exportAll) {
        params.append('employeeIds', 'all')
      } else {
        if (selectedEmployeesExport.length === 0) {
          toast.error('Selecciona al menos un empleado')
          setExporting(false)
          return
        }
        params.append('employeeIds', selectedEmployeesExport.join(','))
      }

      // Hacer fetch
      const response = await fetch(`/api/salaries/report?${params.toString()}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al generar el PDF')
      }

      // Descargar PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-sueldos-${exportPeriod === 'weekly' ? 'semanal' : 'mensual'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Reporte generado correctamente')
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      toast.error(error.message || 'Error al generar el reporte')
    } finally {
      setExporting(false)
      setShowIncompleteWarning(false)
    }
  }

  const handleConfirmExportWithIncomplete = async () => {
    // Calcular fechas según período
    let startDateExport: Date
    let endDateExport: Date

    if (exportPeriod === 'weekly') {
      const [year, month, day] = exportDate.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)
      startDateExport = startOfWeek(selectedDate, { weekStartsOn: 1 })
      endDateExport = endOfWeek(selectedDate, { weekStartsOn: 1 })
    } else {
      const [year, month] = exportMonth.split('-').map(Number)
      const selectedMonth = new Date(year, month - 1, 1)
      startDateExport = startOfMonth(selectedMonth)
      endDateExport = endOfMonth(selectedMonth)
    }

    await proceedWithExport(startDateExport, endDateExport)
  }

  // Resetear a la fecha actual cuando cambia el período
  useEffect(() => {
    setCurrentDate(new Date())
  }, [period])

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Detectar empleados sin hourlyRate
  useEffect(() => {
    if (salaryData?.detailedShifts) {
      const missingRate = salaryData.detailedShifts
        .filter(shift => shift.hourlyRate === null || shift.hourlyRate === undefined)
        .map(shift => shift.employeeName)
      setEmployeesWithoutRate(
        Array.from<string>(new Set<string>(missingRate))
      )
    }
  }, [salaryData])

  useEffect(() => {
    let isMounted = true
    
    // Cancelar la petición anterior si existe
    if (fetchAbortController) {
      fetchAbortController.abort()
    }
    
    const abortController = new AbortController()
    setFetchAbortController(abortController)
    
    // Pequeño delay para evitar llamadas duplicadas en React Strict Mode
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        fetchSalaries(abortController.signal)
      }
    }, 0)
    
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [selectedEmployee, startDate, endDate, period])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000')
      if (response.ok) {
        const result = await response.json()
        if (result.data && Array.isArray(result.data)) {
          setEmployees(result.data)
        } else {
          console.warn('Unexpected response format:', result)
          setEmployees([])
        }
      } else {
        // Solo mostrar error si no es un error de conexión inicial
        const errorData = await response.json().catch(() => ({}))
        console.error('Error fetching employees:', response.status, errorData)
        // No mostrar toast para errores temporales de conexión
        if (response.status !== 500) {
          toast.error('Error al cargar empleados')
        }
        setEmployees([])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      // No mostrar toast para errores de red temporales
      setEmployees([])
    }
  }

  const fetchSalaries = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee)
      }
      params.append('startDate', startDate)
      params.append('endDate', endDate)
      params.append('period', period)
      // No filtrar por isPaid, mostrar todos (no enviar el parámetro)

      const url = `/api/salaries?${params.toString()}`
      console.log('Fetching salaries from:', url)
      
      const response = await fetch(url, {
        signal,
      })
      
      // Verificar si la petición fue cancelada
      if (signal?.aborted) {
        console.log('Request was aborted')
        return
      }
      
      console.log('Response status:', response.status, response.ok)
      
      const data = await response.json()
      console.log('Response data:', {
        hasError: !!data.error,
        hasSummary: !!data.summary,
        hasEmployees: !!data.employees,
        hasDetailedShifts: !!data.detailedShifts,
        employeesCount: data.employees?.length,
        shiftsCount: data.detailedShifts?.length,
      })
      
      // Verificar nuevamente si fue cancelada después del parseo
      if (signal?.aborted) {
        console.log('Request was aborted after parsing')
        return
      }
      
      if (response.ok) {
        // Verificar si la respuesta tiene un error en el cuerpo
        if (data.error) {
          setSalaryData(null)
          console.error('Error in response body:', data)
          // Solo mostrar error si no es un error de conexión temporal
          if (response.status !== 500) {
            toast.error(data.error || 'Error al calcular sueldos')
          }
        } else {
          // Verificar que tenga la estructura esperada
          if (data.summary && data.employees && data.detailedShifts) {
            console.log('Setting salary data successfully')
            setSalaryData(data)
          } else {
            setSalaryData(null)
            console.error('Invalid response structure:', data)
            // No mostrar error para respuestas vacías iniciales
            if (data.summary || data.employees || data.detailedShifts) {
              toast.error('Error: Respuesta inválida del servidor')
            }
          }
        }
      } else {
        // Si hay un error HTTP, limpiar los datos anteriores
        setSalaryData(null)
        console.error('HTTP Error response:', response.status, data)
        // Solo mostrar error si no es un error de conexión temporal (500)
        if (response.status !== 500) {
          toast.error(data.error || `Error al calcular sueldos (${response.status})`)
        }
      }
    } catch (error: any) {
      // Ignorar errores de abort
      if (error?.name === 'AbortError' || signal?.aborted) {
        console.log('Request was aborted, ignoring error')
        return
      }
      // Si hay un error de red o parsing, limpiar los datos anteriores
      setSalaryData(null)
      console.error('Error fetching salaries:', error)
      
      // Mostrar error más específico
      const errorMessage = error?.message?.includes('Failed to fetch') 
        ? 'Error de conexión. Verifica tu conexión a internet.'
        : 'Error al calcular sueldos'
      toast.error(errorMessage)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  // Filtrar y ordenar turnos detallados
  const filteredAndSortedShifts = useMemo(() => {
    if (!salaryData) return []
    
    let shifts = [...salaryData.detailedShifts]
    
    // Ordenar
    shifts.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number
      
      switch (sortBy) {
        case 'date':
          aValue = a.date
          bValue = b.date
          break
        case 'employeeName':
          aValue = a.employeeName
          bValue = b.employeeName
          break
        case 'hours':
          aValue = a.hours
          bValue = b.hours
          break
        case 'salary':
          aValue = a.salary
          bValue = b.salary
          break
        default:
          return 0
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })
    
    return shifts
  }, [salaryData, sortBy, sortOrder])

  // Paginación
  const paginatedShifts = useMemo(() => {
    const start = (page - 1) * limit
    return filteredAndSortedShifts.slice(start, start + limit)
  }, [filteredAndSortedShifts, page, limit])

  const totalPages = Math.ceil(filteredAndSortedShifts.length / limit)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatTime = (time: string | null) => {
    if (!time) return '-'
    
    // Extraer la hora directamente del string ISO sin convertir a Date
    // para evitar problemas de zona horaria (UTC vs local)
    const source = time.includes('T') ? time.split('T')[1] : time
    const [hours, minutes] = source.split(':')
    
    if (!hours || !minutes) return '-'
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }

  // Helper para parsear fecha en zona horaria local (evita problemas de UTC)
  const parseLocalDate = (dateString: string | Date): Date => {
    if (dateString instanceof Date) {
      const year = dateString.getFullYear()
      const month = dateString.getMonth()
      const day = dateString.getDate()
      return new Date(year, month, day)
    }
    const dateOnly = dateString.split('T')[0]
    const [year, month, day] = dateOnly.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Obtener día de la semana en español
  const getDayOfWeek = (dateString: string): string => {
    const date = parseLocalDate(dateString)
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return dayNames[date.getDay()]
  }

  // Calcular horas de un turno
  const calculateTurnHours = (entryTime: string | null, exitTime: string | null): number => {
    if (!entryTime || !exitTime) return 0
    const entry = new Date(entryTime)
    const exit = new Date(exitTime)
    const hours = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60)
    return Math.round(hours * 100) / 100
  }

  // Calcular horas del turno 1
  const getTurn1Hours = (shift: DetailedShift): number => {
    return calculateTurnHours(shift.entryTime1, shift.exitTime1)
  }

  // Calcular horas del turno 2
  const getTurn2Hours = (shift: DetailedShift): number => {
    return calculateTurnHours(shift.entryTime2, shift.exitTime2)
  }

  // Calcular total del día
  const getTotalDayHours = (shift: DetailedShift): number => {
    const turn1Hours = getTurn1Hours(shift)
    const turn2Hours = getTurn2Hours(shift)
    return Math.round((turn1Hours + turn2Hours) * 100) / 100
  }

  // Formatear el período para mostrar en "Detalle de turnos"
  const formatPeriodDisplay = () => {
    if (period === 'weekly') {
      const start = parseLocalDate(startDate)
      const end = parseLocalDate(endDate)
      return `Mostrando horarios de la semana del ${format(start, 'dd/MM/yyyy', { locale: es })} al ${format(end, 'dd/MM/yyyy', { locale: es })}`
    } else {
      return `Mostrando horarios del mes de ${format(currentDate, 'MMMM yyyy', { locale: es })}`
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Sueldos</h1>
        <p className="text-muted-foreground mt-1">
          Calcula y gestiona los sueldos de los empleados
        </p>
      </div>
      <div className="border-b mb-6"></div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecciona los parámetros para calcular los sueldos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Buscar Empleado" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">Todos los Empleados</SelectItem>
                  {sortedEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <div>
                <SegmentedControl
                  options={[
                    { value: 'weekly', label: 'Semanal' },
                    { value: 'monthly', label: 'Mensual' },
                  ]}
                  value={period}
                  onValueChange={setPeriod}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del período con botones de navegación */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-lg font-medium whitespace-pre-line">{periodSubtitle}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousPeriod}
            className="p-2 min-h-[44px] min-w-[44px] rounded-md border bg-background hover:bg-muted transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNextPeriod}
            className="p-2 min-h-[44px] min-w-[44px] rounded-md border bg-background hover:bg-muted transition-colors"
            aria-label="Período siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Calculando sueldos...</p>
        </div>
      ) : !salaryData || salaryData.summary.totalShifts === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay datos disponibles para los filtros seleccionados
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Cards de Resumen */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-col items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-center">Horas Totales Trabajadas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground mt-2" />
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold">
                  {salaryData.summary.totalHours.toFixed(2)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-center">Sueldo Total Calculado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground mt-2" />
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold">
                  {formatCurrency(salaryData.summary.totalSalary)}
                </div>
                {employeesWithoutRate.length > 0 && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#CD9A56]/20 text-[#CD9A56] dark:bg-[#CD9A56]/30 dark:text-[#CD9A56] text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {employeesWithoutRate.length} empleado{employeesWithoutRate.length > 1 ? 's' : ''} sin valor por hora
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {employeesWithoutRate.join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-center">Total de Turnos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground mt-2" />
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold">
                  {salaryData.summary.totalShifts}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Detalles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detalle de Turnos</CardTitle>
                  <CardDescription>
                    {filteredAndSortedShifts.length} turno{filteredAndSortedShifts.length !== 1 ? 's' : ''} registrado{filteredAndSortedShifts.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  {formatPeriodDisplay()}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50 z-10">
                      <TableRow className="hover:bg-muted/50">
                        <TableHead 
                          className="cursor-pointer hover:bg-muted whitespace-nowrap font-semibold text-center w-[10%]"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>Fecha</span>
                            <span className="text-xs">{getSortIcon('date')}</span>
                          </div>
                        </TableHead>
                        <TableHead className="whitespace-nowrap font-semibold text-center w-[8%]">Día</TableHead>
                        {selectedEmployee === 'all' && (
                          <TableHead 
                            className="cursor-pointer hover:bg-muted whitespace-nowrap font-semibold text-center w-[12%]"
                            onClick={() => handleSort('employeeName')}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>Empleado</span>
                              <span className="text-xs">{getSortIcon('employeeName')}</span>
                            </div>
                          </TableHead>
                        )}
                        <TableHead className="whitespace-nowrap font-semibold text-center w-[15%]">Turno 1</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold text-center w-[10%]">Horas Turno 1</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold text-center w-[15%]">Turno 2</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold text-center w-[10%]">Horas Turno 2</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold text-center w-[10%]">Total día</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted whitespace-nowrap font-semibold text-center w-[15%]"
                          onClick={() => handleSort('salary')}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span>Sueldo día</span>
                            <span className="text-xs">{getSortIcon('salary')}</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedShifts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={selectedEmployee === 'all' ? 9 : 8} className="text-center text-muted-foreground">
                            No hay turnos para mostrar
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedShifts.map((shift) => {
                          const turn1Hours = getTurn1Hours(shift)
                          const turn2Hours = getTurn2Hours(shift)
                          const totalDayHours = getTotalDayHours(shift)
                          
                          return (
                            <TableRow key={shift.shiftId}>
                              <TableCell className="whitespace-nowrap text-center">
                                {format(parseLocalDate(shift.date), 'dd/MM/yyyy', { locale: es })}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-center">
                                {getDayOfWeek(shift.date)}
                              </TableCell>
                              {selectedEmployee === 'all' && (
                                <TableCell className="font-medium text-center">{shift.employeeName}</TableCell>
                              )}
                              {/* Turno 1 */}
                              <TableCell className="whitespace-nowrap text-center">
                                {shift.entryTime1 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm">
                                      {formatTime(shift.entryTime1)}
                                      {shift.exitTime1 ? ` - ${formatTime(shift.exitTime1)}` : ''}
                                    </span>
                                    {shift.entryTime1 && !shift.exitTime1 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#CD9A56]/20 text-[#CD9A56] dark:bg-[#CD9A56]/30 dark:text-[#CD9A56] text-xs">
                                        <AlertTriangle className="h-3 w-3" />
                                        Falta salida
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              {/* Horas Turno 1 */}
                              <TableCell className="text-center whitespace-nowrap">
                                {turn1Hours > 0 ? `${turn1Hours.toFixed(2)}h` : '-'}
                              </TableCell>
                              {/* Turno 2 */}
                              <TableCell className="whitespace-nowrap text-center">
                                {shift.entryTime2 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-sm">
                                      {formatTime(shift.entryTime2)}
                                      {shift.exitTime2 ? ` - ${formatTime(shift.exitTime2)}` : ''}
                                    </span>
                                    {shift.entryTime2 && !shift.exitTime2 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#CD9A56]/20 text-[#CD9A56] dark:bg-[#CD9A56]/30 dark:text-[#CD9A56] text-xs">
                                        <AlertTriangle className="h-3 w-3" />
                                        Falta salida
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              {/* Horas Turno 2 */}
                              <TableCell className="text-center whitespace-nowrap">
                                {turn2Hours > 0 ? `${turn2Hours.toFixed(2)}h` : '-'}
                              </TableCell>
                              {/* Total día */}
                              <TableCell className="text-center font-semibold whitespace-nowrap">
                                {totalDayHours > 0 ? `${totalDayHours.toFixed(2)}h` : '-'}
                              </TableCell>
                              {/* Sueldo día */}
                              <TableCell className="text-center font-bold whitespace-nowrap">
                                {shift.hourlyRate === null || shift.hourlyRate === undefined ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#CD9A56]/20 text-[#CD9A56] dark:bg-[#CD9A56]/30 dark:text-[#CD9A56] text-xs font-normal">
                                      <AlertTriangle className="h-3 w-3" />
                                      Sin valor/hora
                                    </span>
                                  </div>
                                ) : (
                                  formatCurrency(shift.salary)
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 border-t">
                    <Pagination
                      page={page}
                      limit={limit}
                      total={filteredAndSortedShifts.length}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      onLimitChange={(newLimit) => {
                        setLimit(newLimit)
                        setPage(1)
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sección de exportación de reportes */}
          <Card>
            <CardHeader>
              <CardTitle>Exportar Reportes de Sueldos</CardTitle>
              <CardDescription>
                Genera reportes en PDF de sueldos por período y empleado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Selector de período */}
                <div className="space-y-2">
                  <Label className="block mb-3">Período</Label>
                  <SegmentedControl
                    options={[
                      { value: 'weekly', label: 'Semanal' },
                      { value: 'monthly', label: 'Mensual' },
                    ]}
                    value={exportPeriod}
                    onValueChange={(value) => setExportPeriod(value as 'weekly' | 'monthly')}
                  />
                </div>

                {/* Selector de fecha/mes según período */}
                <div className="space-y-2">
                  <Label htmlFor={exportPeriod === 'weekly' ? 'export-date' : 'export-month'}>
                    {exportPeriod === 'weekly' ? 'Fecha' : 'Mes'}
                  </Label>
                  {exportPeriod === 'weekly' ? (
                    <Input
                      id="export-date"
                      type="date"
                      value={exportDate}
                      onChange={(e) => setExportDate(e.target.value)}
                      className="w-full sm:w-64"
                    />
                  ) : (
                    <Input
                      id="export-month"
                      type="month"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className="w-full sm:w-64"
                    />
                  )}
                </div>

                {/* Selección de empleados */}
                <div className="space-y-3">
                  <Label>Empleados</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="export-all"
                      checked={exportAll}
                      onCheckedChange={(checked) => {
                        setExportAll(checked as boolean)
                        if (checked) {
                          setSelectedEmployeesExport([])
                        }
                      }}
                    />
                    <label
                      htmlFor="export-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Todos los empleados
                    </label>
                  </div>

                  {!exportAll && sortedEmployees.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                      {sortedEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`employee-export-${employee.id}`}
                            checked={selectedEmployeesExport.includes(employee.id)}
                            onCheckedChange={() => handleEmployeeToggleExport(employee.id)}
                          />
                          <label
                            htmlFor={`employee-export-${employee.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {employee.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón de generar */}
                <Button
                  onClick={handleGeneratePDF}
                  disabled={exporting || (!exportAll && selectedEmployeesExport.length === 0)}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? 'Generando PDF...' : 'Generar PDF'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Diálogo de advertencia para turnos incompletos */}
      <ConfirmDialog
        open={showIncompleteWarning}
        onOpenChange={setShowIncompleteWarning}
        title="Turnos incompletos detectados"
        description={
          <div className="space-y-2">
            <p>
              Se encontraron <strong>{incompleteShiftsInfo.count}</strong> turno(s) incompleto(s) 
              {incompleteShiftsInfo.employees.length > 0 && (
                <> de: <strong>{incompleteShiftsInfo.employees.join(', ')}</strong></>
              )}.
            </p>
            <p>
              Estos turnos tienen horarios de ingreso o egreso faltantes, por lo que no se calcularán las horas ni el sueldo correspondiente en el reporte.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              ¿Deseas continuar con la exportación de todos modos?
            </p>
          </div>
        }
        confirmText="Exportar de todos modos"
        cancelText="Cancelar"
        onConfirm={handleConfirmExportWithIncomplete}
        variant="warning"
      />
    </div>
  )
}
