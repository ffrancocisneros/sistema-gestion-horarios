'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const employeeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  hourlyRate: z.string().refine((val) => {
    const num = parseFloat(val)
    return !isNaN(num) && num > 0
  }, 'El valor por hora debe ser un número positivo'),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface Employee {
  id: string
  name: string
  hourlyRate: number
}

interface EmployeeFormProps {
  employee?: Employee | null
  onSuccess: () => void
}

export function EmployeeForm({ employee, onSuccess }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name || '',
      hourlyRate: employee?.hourlyRate.toString() || '',
    },
  })

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        hourlyRate: employee.hourlyRate.toString(),
      })
    } else {
      reset({
        name: '',
        hourlyRate: '',
      })
    }
  }, [employee, reset])

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true)
    try {
      const url = employee
        ? `/api/employees/${employee.id}`
        : '/api/employees'
      const method = employee ? 'PATCH' : 'POST'

      // Crear un AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          hourlyRate: data.hourlyRate,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        toast.success(employee ? 'Empleado actualizado' : 'Empleado creado')
        onSuccess()
      } else {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('Error response:', error)
        
        // Manejar errores específicos
        if (response.status === 503) {
          toast.error('Error de conexión', {
            description: 'La base de datos está tardando en responder. Por favor, intenta nuevamente.',
          })
        } else {
          toast.error(error.error || 'Error al guardar empleado', {
            description: error.details || error.code,
          })
        }
      }
    } catch (error: any) {
      console.error('Error submitting form:', error)
      
      if (error.name === 'AbortError') {
        toast.error('Tiempo de espera agotado', {
          description: 'La operación está tardando demasiado. Por favor, intenta nuevamente.',
        })
      } else {
        toast.error('Error al guardar empleado', {
          description: 'Revisa tu conexión e intenta nuevamente.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Nombre del empleado"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="hourlyRate">Valor por Hora</Label>
        <Input
          id="hourlyRate"
          type="number"
          step="0.01"
          {...register('hourlyRate')}
          placeholder="0.00"
        />
        {errors.hourlyRate && (
          <p className="text-sm text-destructive">
            {errors.hourlyRate.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Guardando...'
            : employee
            ? 'Actualizar'
            : 'Crear'}
        </Button>
      </div>
    </form>
  )
}

