'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { toast } from 'sonner'

const shiftSchema = z
  .object({
    employeeId: z.string().min(1, 'El empleado es requerido'),
    date: z.string().min(1, 'La fecha es requerida'),
    entryTime1: z.string().optional(),
    exitTime1: z.string().optional(),
    entryTime2: z.string().optional(),
    exitTime2: z.string().optional(),
    isPaid: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Al menos debe tener una hora de entrada
      return data.entryTime1 || data.entryTime2
    },
    {
      message: 'Debe ingresar al menos una hora de entrada',
    }
  )

type ShiftFormData = z.infer<typeof shiftSchema>

interface Employee {
  id: string
  name: string
}

interface WorkShift {
  id: string
  employeeId: string
  date: string | Date
  entryTime1?: string | null
  exitTime1?: string | null
  entryTime2?: string | null
  exitTime2?: string | null
  isPaid: boolean
}

interface ShiftFormProps {
  employees: Employee[]
  shift?: WorkShift | null
  onSuccess: () => void
  readonlyEmployeeId?: string
}

export function ShiftForm({ employees, shift, onSuccess, readonlyEmployeeId }: ShiftFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSecondShift, setShowSecondShift] = useState(false)

  // Ordenar empleados alfabéticamente
  const sortedEmployees = [...employees].sort((a, b) => 
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      employeeId: shift?.employeeId || '',
      date: shift?.date
        ? (() => {
            // Parsear fecha en zona horaria local para evitar problemas de UTC
            let dateStr: string
            if (typeof shift.date === 'string') {
              dateStr = shift.date
            } else if (shift.date instanceof Date) {
              dateStr = shift.date.toISOString()
            } else {
              dateStr = String(shift.date)
            }
            const dateOnly = dateStr.split('T')[0]
            const [year, month, day] = dateOnly.split('-').map(Number)
            const localDate = new Date(year, month - 1, day)
            return format(localDate, 'yyyy-MM-dd')
          })()
        : format(new Date(), 'yyyy-MM-dd'),
      entryTime1: shift?.entryTime1
        ? format(new Date(shift.entryTime1), 'HH:mm')
        : '',
      exitTime1: shift?.exitTime1
        ? format(new Date(shift.exitTime1), 'HH:mm')
        : '',
      entryTime2: shift?.entryTime2
        ? format(new Date(shift.entryTime2), 'HH:mm')
        : '',
      exitTime2: shift?.exitTime2
        ? format(new Date(shift.exitTime2), 'HH:mm')
        : '',
      isPaid: shift?.isPaid ?? false,
    },
  })

  useEffect(() => {
    // Si la vista es por empleado, fijar el employeeId
    if (readonlyEmployeeId) {
      setValue('employeeId', readonlyEmployeeId)
    }
    if (shift) {
      reset({
        employeeId: readonlyEmployeeId ?? shift.employeeId,
        date: (() => {
          // Parsear fecha en zona horaria local para evitar problemas de UTC
          const dateStr = typeof shift.date === 'string' ? shift.date : shift.date.toISOString()
          const dateOnly = dateStr.split('T')[0]
          const [year, month, day] = dateOnly.split('-').map(Number)
          const localDate = new Date(year, month - 1, day)
          return format(localDate, 'yyyy-MM-dd')
        })(),
        entryTime1: shift.entryTime1
          ? format(new Date(shift.entryTime1), 'HH:mm')
          : '',
        exitTime1: shift.exitTime1
          ? format(new Date(shift.exitTime1), 'HH:mm')
          : '',
        entryTime2: shift.entryTime2
          ? format(new Date(shift.entryTime2), 'HH:mm')
          : '',
        exitTime2: shift.exitTime2
          ? format(new Date(shift.exitTime2), 'HH:mm')
          : '',
        isPaid: shift.isPaid,
      })
      setShowSecondShift(!!shift.entryTime2)
    }
  }, [shift, reset, readonlyEmployeeId, setValue])

  const watchedEntryTime2 = watch('entryTime2')
  const watchedExitTime1 = watch('exitTime1')
  useEffect(() => {
    if (watchedEntryTime2 || watchedExitTime1) {
      setShowSecondShift(true)
    }
  }, [watchedEntryTime2, watchedExitTime1])

  const onSubmit = async (data: ShiftFormData) => {
    setIsSubmitting(true)
    try {
      const url = shift ? `/api/shifts/${shift.id}` : '/api/shifts'
      const method = shift ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: data.employeeId,
          date: data.date,
          entryTime1: data.entryTime1 || null,
          exitTime1: data.exitTime1 || null,
          entryTime2: data.entryTime2 || null,
          exitTime2: data.exitTime2 || null,
          isPaid: data.isPaid,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        toast.error(error.error || 'Error al guardar turno', {
          description: error.details || error.code,
        })
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('Error al guardar turno', {
        description: 'Revisa la consola para más detalles',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="employeeId">Empleado</Label>
        {readonlyEmployeeId ? (
          <div className="px-3 py-2 border rounded-md bg-muted/30">
            {employees.find((e) => e.id === readonlyEmployeeId)?.name || 'Empleado'}
          </div>
        ) : (
          <>
            <Select
              value={watch('employeeId')}
              onValueChange={(value) => setValue('employeeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {sortedEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && (
              <p className="text-sm text-destructive">{errors.employeeId.message}</p>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Fecha</Label>
        <Input id="date" type="date" {...register('date')} />
        {errors.date && (
          <p className="text-sm text-destructive">{errors.date.message}</p>
        )}
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">Turno 1</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entryTime1">Entrada</Label>
            <Input id="entryTime1" type="time" {...register('entryTime1')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exitTime1">Salida</Label>
            <Input id="exitTime1" type="time" {...register('exitTime1')} />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Turno 2 (Opcional)</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowSecondShift(!showSecondShift)
              if (showSecondShift) {
                setValue('entryTime2', '')
                setValue('exitTime2', '')
              }
            }}
          >
            {showSecondShift ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
        {showSecondShift && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryTime2">Entrada</Label>
              <Input id="entryTime2" type="time" {...register('entryTime2')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exitTime2">Salida</Label>
              <Input id="exitTime2" type="time" {...register('exitTime2')} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isPaid"
          checked={watch('isPaid')}
          onCheckedChange={(checked) => setValue('isPaid', checked as boolean)}
        />
        <Label htmlFor="isPaid" className="cursor-pointer">
          Día pagado
        </Label>
      </div>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : shift ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}

