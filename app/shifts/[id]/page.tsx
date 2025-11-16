'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { toast } from 'sonner'
import { useSortableTable } from '@/hooks/use-sortable-table'

// Lazy load de formularios
const ShiftForm = dynamic(() => import('@/components/shifts/ShiftForm').then((mod) => ({ default: mod.ShiftForm })), {
  loading: () => <div className="py-4 text-muted-foreground">Cargando formulario...</div>,
})

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

export default function EmployeeShiftsPage({ params }: { params: { id: string } }) {
  const employeeId = params.id
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shiftToDelete, setShiftToDelete] = useState<{ id: string; date: string } | null>(null)

  const { sortBy, sortOrder, handleSort, getSortIcon } = useSortableTable<'date' | 'createdAt' | 'isPaid'>('date', 'desc')

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setEmployee({ id: data.id, name: data.name })
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
      toast.error('Error al cargar empleado')
    }
  }

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('employeeId', employeeId)
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
    fetchEmployee()
  }, [employeeId])

  useEffect(() => {
    fetchShifts()
  }, [employeeId, page, limit, sortBy, sortOrder])

  const handleDeleteClick = (id: string, date: string) => {
    setShiftToDelete({ id, date })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!shiftToDelete) return

    try {
      const response = await fetch(`/api/shifts/${shiftToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Turno eliminado correctamente')
        // Si era el último item de la página y no es la primera, volver a la anterior
        if (shifts.length === 1 && page > 1) {
          setPage(page - 1)
        } else {
          fetchShifts()
        }
      } else {
        toast.error('Error al eliminar turno')
      }
    } catch (error) {
      console.error('Error deleting shift:', error)
      toast.error('Error al eliminar turno')
    } finally {
      setDeleteDialogOpen(false)
      setShiftToDelete(null)
    }
  }

  const handleTogglePayment = async (shift: WorkShift) => {
    try {
      const response = await fetch(`/api/shifts/${shift.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPaid: !shift.isPaid,
        }),
      })

      if (response.ok) {
        toast.success(`Turno marcado como ${!shift.isPaid ? 'pagado' : 'no pagado'}`)
        fetchShifts()
      } else {
        toast.error('Error al actualizar estado de pago')
      }
    } catch (error) {
      console.error('Error toggling payment:', error)
      toast.error('Error al actualizar estado de pago')
    }
  }

  const handleEdit = (shift: WorkShift) => {
    setEditingShift(shift)
    setIsDialogOpen(true)
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    setEditingShift(null)
    toast.success(editingShift ? 'Turno actualizado correctamente' : 'Turno creado correctamente')
    fetchShifts()
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const calculateHours = (shift: WorkShift): number => {
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
    return hours
  }

  const formatTime = (time: string | null | undefined): string => {
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
      // Si ya es Date, extraer solo la parte de fecha
      const year = dateString.getFullYear()
      const month = dateString.getMonth()
      const day = dateString.getDate()
      return new Date(year, month, day)
    }
    // Si es string ISO, extraer solo la parte de fecha
    const dateOnly = dateString.split('T')[0]
    const [year, month, day] = dateOnly.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  if (loading && shifts.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/shifts">
            <Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4"/> Volver</Button>
          </Link>
        </div>
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Cargando turnos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/shifts">
            <Button variant="ghost" className="gap-2 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Turnos de {employee?.name || 'Empleado'}</h1>
          <p className="text-muted-foreground mt-1">
            Registra y gestiona los horarios del empleado
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingShift(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Turno
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingShift ? 'Editar Turno' : 'Nuevo Turno'}
              </DialogTitle>
            </DialogHeader>
            <ShiftForm
              employees={employee ? [employee] : []}
              readonlyEmployeeId={employee?.id}
              shift={editingShift}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Turnos</CardTitle>
          <CardDescription>
            {pagination.total} turno{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay turnos registrados para este empleado.
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="rounded-md border overflow-x-auto max-w-4xl w-full">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 w-[110px] px-3"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Fecha</span>
                          <span className="text-xs">{getSortIcon('date')}</span>
                        </div>
                      </TableHead>
                      <TableHead className="w-[160px] px-3">Turno 1</TableHead>
                      <TableHead className="w-[160px] px-3">Turno 2</TableHead>
                      <TableHead className="w-[70px] px-3">Horas</TableHead>
                      <TableHead className="w-[70px] px-3">Pagado</TableHead>
                      <TableHead className="w-[100px] text-right px-3">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="px-3">
                        {format(parseLocalDate(shift.date), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="px-3">
                        {shift.entryTime1 ? (
                          <div className="flex items-center gap-2">
                            <span>
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
                      <TableCell className="px-3">
                        {shift.entryTime2 ? (
                          <div className="flex items-center gap-2">
                            <span>
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
                      <TableCell className="px-3">
                        {calculateHours(shift).toFixed(2)}h
                      </TableCell>
                      <TableCell className="px-3">
                        <Checkbox
                          checked={shift.isPaid}
                          onCheckedChange={() => handleTogglePayment(shift)}
                        />
                      </TableCell>
                      <TableCell className="text-right px-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(shift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(shift.id, shift.date)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Turno"
        description={`¿Estás seguro de que quieres eliminar el turno del ${shiftToDelete ? format(parseLocalDate(shiftToDelete.date), 'dd/MM/yyyy', { locale: es }) : ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}
