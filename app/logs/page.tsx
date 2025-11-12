'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { toast } from 'sonner'
import { useSortableTable } from '@/hooks/use-sortable-table'

interface Employee {
  id: string
  name: string
}

interface ActivityLog {
  id: string
  action: string
  employeeId: string | null
  employee: Employee | null
  details: string | null
  timestamp: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

const actionLabels: Record<string, string> = {
  CREATE_EMPLOYEE: 'Crear Empleado',
  UPDATE_EMPLOYEE: 'Actualizar Empleado',
  DELETE_EMPLOYEE: 'Eliminar Empleado',
  CREATE_SHIFT: 'Crear Turno',
  UPDATE_SHIFT: 'Actualizar Turno',
  DELETE_SHIFT: 'Eliminar Turno',
  TOGGLE_PAYMENT: 'Cambiar Estado de Pago',
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const { sortBy, sortOrder, handleSort, getSortIcon } = useSortableTable<'timestamp' | 'action'>('timestamp', 'desc')

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [selectedEmployee, selectedAction, startDate, endDate, page, limit, sortBy, sortOrder])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setEmployees(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Error al cargar empleados')
    }
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee)
      }
      if (selectedAction !== 'all') {
        params.append('action', selectedAction)
      }
      if (startDate) {
        params.append('startDate', startDate)
      }
      if (endDate) {
        params.append('endDate', endDate)
      }
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (sortBy) {
        params.append('sortBy', sortBy)
        params.append('sortOrder', sortOrder)
      }

      const response = await fetch(`/api/logs?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        setLogs(result.data || [])
        setPagination(result.pagination || pagination)
      } else {
        toast.error('Error al cargar logs')
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast.error('Error al cargar logs')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const handleFilterChange = () => {
    setPage(1) // Resetear a primera página al cambiar filtros
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Logs de Actividad</h1>
        <p className="text-muted-foreground mt-1">
          Registro de todas las acciones realizadas en el sistema
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra los logs por empleado, acción o rango de fechas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado</Label>
              <Select 
                value={selectedEmployee} 
                onValueChange={(value) => {
                  setSelectedEmployee(value)
                  handleFilterChange()
                }}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Acción</Label>
              <Select 
                value={selectedAction} 
                onValueChange={(value) => {
                  setSelectedAction(value)
                  handleFilterChange()
                }}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  handleFilterChange()
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  handleFilterChange()
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de logs */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Actividades</CardTitle>
          <CardDescription>
            {pagination.total} registro{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">Cargando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay logs disponibles para los filtros seleccionados
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Fecha y Hora</span>
                        <span className="text-xs">{getSortIcon('timestamp')}</span>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('action')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Acción</span>
                        <span className="text-xs">{getSortIcon('action')}</span>
                      </div>
                    </TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>
                        {actionLabels[log.action] || log.action}
                      </TableCell>
                      <TableCell>
                        {log.employee ? log.employee.name : '-'}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {log.details || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
