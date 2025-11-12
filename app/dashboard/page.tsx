'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Users } from 'lucide-react'


interface HoursRanking {
  name: string
  hours: number
}

interface DashboardStats {
  totalEmployees: number
  totalHoursSelectedMonth: number
}

export default function DashboardPage() {
  const [hoursRanking, setHoursRanking] = useState<HoursRanking[]>([])
  const [totalShiftsRanking, setTotalShiftsRanking] = useState<Array<{ name: string; total: number }>>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalHoursSelectedMonth: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [selectedMonth])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/dashboard?month=${selectedMonth}`)
      if (response.ok) {
        const data = await response.json()
        setHoursRanking(data.hoursRanking || [])
        setTotalShiftsRanking(data.totalShiftsRanking || [])
        setStats(data.stats || {})
        if (data.availableMonths && data.availableMonths.length > 0) {
          setAvailableMonths(data.availableMonths)
        }
        if (data.selectedMonth) {
          setSelectedMonth(data.selectedMonth)
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMonthLabel = (month: string) => {
    const [year, m] = month.split('-').map(Number)
    return new Date(year, m - 1).toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    )
  }


  const MonthSelect = () => (
    <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(value)}>
      <SelectTrigger className="w-[170px]">
        <SelectValue placeholder="Mes" />
      </SelectTrigger>
      <SelectContent>
        {availableMonths.length > 0 ? (
          availableMonths.map((month) => (
            <SelectItem key={month} value={month}>
              {formatMonthLabel(month)}
            </SelectItem>
          ))
        ) : (
          <SelectItem value={selectedMonth}>
            {formatMonthLabel(selectedMonth)}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Estadísticas</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Resumen de actividad y métricas
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Empleados registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas del Mes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalHoursSelectedMonth.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Horas trabajadas este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tablas de detalles */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Horas trabajadas por empleado</CardTitle>
              <MonthSelect />
            </div>
          </CardHeader>
          <CardContent>
            {hoursRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
            ) : (
              <div className="space-y-2">
                {hoursRanking.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 rounded-md hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">
                      {item.hours.toFixed(2)}h
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Turnos por empleado</CardTitle>
              <MonthSelect />
            </div>
          </CardHeader>
          <CardContent>
            {totalShiftsRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
            ) : (
              <div className="space-y-2">
                {totalShiftsRanking.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 rounded-md hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">
                      {item.total} turno{item.total !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
