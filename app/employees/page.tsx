'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { Pencil, Trash2, Plus, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useSortableTable } from '@/hooks/use-sortable-table'

// Lazy load de formularios
const EmployeeForm = dynamic(() => import('@/components/employees/EmployeeForm').then((mod) => ({ default: mod.EmployeeForm })), {
  loading: () => <div className="py-4 text-muted-foreground">Cargando formulario...</div>,
})

interface Employee {
  id: string
  name: string
  hourlyRate: number
  createdAt: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showRates, setShowRates] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null)

  const { sortBy, sortOrder, handleSort, getSortIcon } = useSortableTable<'name' | 'hourlyRate' | 'createdAt'>('createdAt', 'desc')

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (sortBy) {
        params.append('sortBy', sortBy)
        params.append('sortOrder', sortOrder)
      }

      const response = await fetch(`/api/employees?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        setEmployees(result.data || [])
        setPagination(result.pagination || pagination)
      } else {
        toast.error('Error al cargar empleados')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [page, limit, sortBy, sortOrder])

  const handleDeleteClick = (id: string, name: string) => {
    setEmployeeToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return

    try {
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`Empleado ${employeeToDelete.name} eliminado correctamente`)
        // Si era el último item de la página y no es la primera, volver a la anterior
        if (employees.length === 1 && page > 1) {
          setPage(page - 1)
        } else {
          fetchEmployees()
        }
      } else {
        toast.error('Error al eliminar empleado')
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error('Error al eliminar empleado')
    } finally {
      setDeleteDialogOpen(false)
      setEmployeeToDelete(null)
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setIsDialogOpen(true)
  }

  const handleFormSuccess = () => {
    const wasEditing = !!editingEmployee
    setIsDialogOpen(false)
    setEditingEmployee(null)
    toast.success(wasEditing ? 'Empleado actualizado correctamente' : 'Empleado creado correctamente')
    fetchEmployees()
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Resetear a primera página al cambiar límite
  }

  if (loading && employees.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Cargando empleados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Empleados</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los empleados
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingEmployee(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </DialogTitle>
            </DialogHeader>
            <EmployeeForm
              employee={editingEmployee}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="border-b mb-6"></div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
          <CardDescription>
            {pagination.total} empleado{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay empleados registrados. Crea uno nuevo para comenzar.
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Nombre</span>
                        <span className="text-xs">{getSortIcon('name')}</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <span>Valor por Hora</span>
                        <button
                          type="button"
                          aria-label={showRates ? 'Ocultar valores' : 'Mostrar valores'}
                          className="inline-flex items-center justify-center rounded-md p-1 hover:bg-accent"
                          onClick={() => setShowRates((v) => !v)}
                          title={showRates ? 'Ocultar valores' : 'Mostrar valores'}
                        >
                          {showRates ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">
                        <span>Fecha de Registro</span>
                        <span className="text-xs">{getSortIcon('createdAt')}</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        {employee.hourlyRate === null || employee.hourlyRate === undefined ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#CD9A56]/20 text-[#CD9A56] dark:bg-[#CD9A56]/30 dark:text-[#CD9A56] text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            Sin valor asignado
                          </span>
                        ) : (
                          showRates ? `$${Math.round(employee.hourlyRate)}` : '***'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(employee.createdAt).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(employee.id, employee.name)}
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
        title="Eliminar Empleado"
        description={`¿Estás seguro de que quieres eliminar a ${employeeToDelete?.name}? Esta acción no se puede deshacer y se eliminarán todos los turnos asociados.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}
