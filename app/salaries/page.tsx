'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

interface Employee {
  id: string
  name: string
}

interface SalaryData {
  employeeId: string
  employeeName: string
  hourlyRate: number
  totalHours: number
  totalSalary: number
  period: string
  periodData: Array<{ date: string; salary: number }>
}

export default function SalariesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salaryData, setSalaryData] = useState<SalaryData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [period, setPeriod] = useState<string>('monthly')

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchSalaries()
  }, [selectedEmployee, startDate, endDate, period])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchSalaries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee)
      }
      params.append('startDate', startDate)
      params.append('endDate', endDate)
      params.append('period', period)

      const response = await fetch(`/api/salaries?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSalaryData(data)
      }
    } catch (error) {
      console.error('Error fetching salaries:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount)
  }

  const formatPeriodDate = (date: string) => {
    const dateObj = new Date(date)
    if (period === 'daily') {
      return format(dateObj, 'dd/MM/yyyy', { locale: es })
    } else if (period === 'weekly') {
      const weekEnd = new Date(dateObj)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${format(dateObj, 'dd/MM', { locale: es })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: es })}`
    } else {
      return format(dateObj, 'MMMM yyyy', { locale: es })
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cálculo de Sueldos</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza y calcula los sueldos de tus empleados
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecciona los parámetros para calcular los sueldos (solo días marcados como pagados)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
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
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Calculando sueldos...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {salaryData.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay datos disponibles para los filtros seleccionados
              </CardContent>
            </Card>
          ) : (
            salaryData.map((data) => (
              <Card key={data.employeeId}>
                <CardHeader>
                  <CardTitle>{data.employeeName}</CardTitle>
                  <CardDescription>
                    Valor por hora: {formatCurrency(data.hourlyRate)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Horas</p>
                      <p className="text-2xl font-bold">{data.totalHours.toFixed(2)}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sueldo Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(data.totalSalary)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Período</p>
                      <p className="text-2xl font-bold">{data.period}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">
                      Desglose {data.period.toLowerCase()}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha / Período</TableHead>
                          <TableHead className="text-right">Sueldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.periodData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatPeriodDate(item.date)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.salary)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

