'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShiftForm } from '@/components/shifts/ShiftForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

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

export default function EmployeeShiftsPage({ params }: { params: { id: string } }) {
  const employeeId = params.id
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null)

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setEmployee({ id: data.id, name: data.name })
      }
    } catch (error) {
      console.error('Error fetching employee:', error)
    }
  }

  const fetchShifts = async () => {
    try {
      const response = await fetch(`/api/shifts?employeeId=${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setShifts(data)
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployee()
    fetchShifts()
  }, [employeeId])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este turno?')) {
      return
    }

    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchShifts()
      } else {
        alert('Error al eliminar turno')
      }
    } catch (error) {
      console.error('Error deleting shift:', error)
      alert('Error al eliminar turno')
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
        fetchShifts()
      } else {
        alert('Error al actualizar estado de pago')
      }
    } catch (error) {
      console.error('Error toggling payment:', error)
      alert('Error al actualizar estado de pago')
    }
  }

  const handleEdit = (shift: WorkShift) => {
    setEditingShift(shift)
    setIsDialogOpen(true)
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    setEditingShift(null)
    fetchShifts()
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
    const dt = new Date(time)
    if (isNaN(dt.getTime())) return '-'
    return format(dt, 'HH:mm')
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold">Turnos de {employee?.name || 'Empleado'}</h1>
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
            {shifts.length} turno{shifts.length !== 1 ? 's' : ''} registrado{shifts.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay turnos registrados para este empleado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Turno 1</TableHead>
                  <TableHead>Turno 2</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      {format(new Date(shift.date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      {shift.entryTime1 && shift.exitTime1
                        ? `${formatTime(shift.entryTime1)} - ${formatTime(shift.exitTime1)}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {shift.entryTime2 && shift.exitTime2
                        ? `${formatTime(shift.entryTime2)} - ${formatTime(shift.exitTime2)}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {calculateHours(shift).toFixed(2)}h
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={shift.isPaid}
                        onCheckedChange={() => handleTogglePayment(shift)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
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
                          onClick={() => handleDelete(shift.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


