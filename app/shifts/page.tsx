'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShiftForm } from '@/components/shifts/ShiftForm'
import { Pagination } from '@/components/ui/pagination'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, AlertTriangle, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { useSortableTable } from '@/hooks/use-sortable-table'

interface Employee {
  id: string
  name: string
}

interface WorkShift {
  id: string
  employeeId: string
  employee: Employee
  date: string
  entryTime1?: string | null
  exitTime1?: string | null
  entryTime2?: string | null
  exitTime2?: string | null
  isPaid: boolean
  createdAt: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ShiftsByEmployeePage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'day'>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const { sortBy, sortOrder, handleSort, getSortIcon } = useSortableTable<'date' | 'employeeName'>('date', 'desc')

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setEmployees(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchShiftsByDay = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('startDate', selectedDate)
      params.append('endDate', selectedDate)
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (sortBy) {
        params.append('sortBy', sortBy)
        params.append('sortOrder', sortOrder)
      }

      const response = await fetch(`/api/shifts?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        setShifts(result.data || [])
        setPagination(result.pagination || pagination)
      } else {
        toast.error('Error al cargar turnos')
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
      toast.error('Error al cargar turnos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (activeTab === 'day') {
      fetchShiftsByDay()
    }
  }, [activeTab, selectedDate, page, limit, sortBy, sortOrder])

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase().trim())
  )

  const handleFormSuccess = (wasEditing: boolean = false) => {
    setIsDialogOpen(false)
    setIsEditDialogOpen(false)
    toast.success(wasEditing ? 'Turno actualizado correctamente' : 'Turno creado correctamente')
    setEditingShift(null)
    if (activeTab === 'day') {
      fetchShiftsByDay()
    }
  }

  const handleEditShift = (shift: WorkShift) => {
    setEditingShift(shift)
    setIsEditDialogOpen(true)
  }

  const formatTime = (time: string | null | undefined): string => {
    if (!time) return '-'
    const dt = new Date(time)
    if (isNaN(dt.getTime())) return '-'
    return format(dt, 'HH:mm')
  }

  // Helper para parsear fecha en zona horaria local
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

  // Agrupar turnos por empleado para la vista por día
  const shiftsByEmployee = shifts.reduce((acc, shift) => {
    if (!acc[shift.employeeId]) {
      acc[shift.employeeId] = {
        employee: shift.employee,
        shifts: [],
      }
    }
    acc[shift.employeeId].shifts.push(shift)
    return acc
  }, {} as Record<string, { employee: Employee; shifts: WorkShift[] }>)

  if (loading && employees.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Turnos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los turnos de los empleados
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Turno
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Turno</DialogTitle>
            </DialogHeader>
            <ShiftForm
              employees={employees}
              onSuccess={() => handleFormSuccess(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Turno</DialogTitle>
            </DialogHeader>
            {editingShift && (
              <ShiftForm
                employees={employees}
                shift={editingShift}
                readonlyEmployeeId={editingShift.employeeId}
                onSuccess={() => handleFormSuccess(true)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className="border-b mb-6"></div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'employees' | 'day')}>
        <TabsList>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="day">Día</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <div className="space-y-4">
            <div className="w-full md:w-80">
              <label htmlFor="search" className="text-sm text-muted-foreground">Buscar empleado</label>
              <Input
                id="search"
                placeholder="Ej: Ana, Bruno, Carla"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Empleados</CardTitle>
                <CardDescription>
                  {employees.length} empleado{employees.length !== 1 ? 's' : ''} disponible{employees.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {employees.length === 0
                      ? 'No hay empleados. Crea uno en la sección Empleados.'
                      : 'No se encontraron empleados para tu búsqueda.'}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="rounded-md border overflow-x-auto max-w-2xl w-full">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-3">Nombre</TableHead>
                          <TableHead className="text-right px-3">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium px-3">{e.name}</TableCell>
                            <TableCell className="text-right px-3">
                              <Link href={`/shifts/${e.id}`}>
                                <Button variant="outline">Ver turnos</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="day">
          <div className="space-y-4">
            <div className="w-full md:w-80">
              <label htmlFor="date" className="text-sm text-muted-foreground">Seleccionar fecha</label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-muted-foreground">Cargando turnos...</p>
              </div>
            ) : shifts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay turnos registrados para esta fecha
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Turnos del {format(parseLocalDate(selectedDate), 'dd/MM/yyyy', { locale: es })}
                    </CardTitle>
                    <CardDescription>
                      {pagination.total} turno{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <div className="rounded-md border overflow-x-auto max-w-4xl w-full">
                        <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px] px-3">Empleado</TableHead>
                            <TableHead className="w-[180px] px-3">Horario</TableHead>
                            <TableHead className="w-[70px] text-right px-3">Horas</TableHead>
                            <TableHead className="w-[70px] text-center px-3">Pagado</TableHead>
                            <TableHead className="w-[80px] text-right px-3">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {shifts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No hay turnos registrados para esta fecha
                            </TableCell>
                          </TableRow>
                        ) : (
                          shifts.map((shift) => (
                            <TableRow key={shift.id}>
                              <TableCell className="font-medium px-3">
                                {shift.employee.name}
                              </TableCell>
                              <TableCell className="px-3">
                                <div className="space-y-1">
                                  {shift.entryTime1 && (
                                    <div className="flex items-center gap-2">
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
                                  )}
                                  {shift.entryTime2 && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">
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
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right px-3">
                                {(() => {
                                  let hours = 0
                                  if (shift.entryTime1 && shift.exitTime1) {
                                    const entry1 = new Date(shift.entryTime1)
                                    const exit1 = new Date(shift.exitTime1)
                                    if (!isNaN(entry1.getTime()) && !isNaN(exit1.getTime())) {
                                      hours += (exit1.getTime() - entry1.getTime()) / (1000 * 60 * 60)
                                    }
                                  }
                                  if (shift.entryTime2 && shift.exitTime2) {
                                    const entry2 = new Date(shift.entryTime2)
                                    const exit2 = new Date(shift.exitTime2)
                                    if (!isNaN(entry2.getTime()) && !isNaN(exit2.getTime())) {
                                      hours += (exit2.getTime() - entry2.getTime()) / (1000 * 60 * 60)
                                    }
                                  }
                                  return hours > 0 ? `${hours.toFixed(2)}h` : '-'
                                })()}
                              </TableCell>
                              <TableCell className="text-center px-3">
                                {shift.isPaid ? 'Sí' : 'No'}
                              </TableCell>
                              <TableCell className="text-right px-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditShift(shift)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {pagination.totalPages > 1 && (
                  <Pagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    onLimitChange={(newLimit) => {
                      setLimit(newLimit)
                      setPage(1)
                    }}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
