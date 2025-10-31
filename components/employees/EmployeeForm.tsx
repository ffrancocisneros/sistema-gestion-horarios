'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          hourlyRate: data.hourlyRate,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar empleado')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error al guardar empleado')
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

