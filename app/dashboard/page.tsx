'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrendingUp, Clock, Users, DollarSign } from 'lucide-react'

interface HoursRanking {
  name: string
  hours: number
}

interface TardinessRanking {
  name: string
  tardiness: number
  tardinessCount: number
}

interface DashboardStats {
  totalEmployees: number
  totalHoursThisMonth: number
  unpaidSalaries: number
}

export default function DashboardPage() {
  const [hoursRanking, setHoursRanking] = useState<HoursRanking[]>([])
  const [tardinessRanking, setTardinessRanking] = useState<TardinessRanking[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalHoursThisMonth: 0,
    unpaidSalaries: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setHoursRanking(data.hoursRanking || [])
        setTardinessRanking(data.tardinessRanking || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const hoursChartData = hoursRanking.map((item, index) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    horas: Math.round(item.hours * 100) / 100,
  }))

  const tardinessChartData = tardinessRanking.map((item) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    tardanzas: item.tardinessCount,
  }))

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de actividad y estadísticas
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/employees">
            <Button variant="outline">Empleados</Button>
          </Link>
          <Link href="/shifts">
            <Button variant="outline">Turnos</Button>
          </Link>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-3">
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
              {stats.totalHoursThisMonth.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Horas trabajadas este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sueldos Pendientes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.unpaidSalaries.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Días no pagados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Empleados con Más Horas Trabajadas</CardTitle>
            <CardDescription>
              Top empleados por horas trabajadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hoursChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hoursChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="horas" fill="#8884d8" name="Horas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empleados con Más Tardanzas</CardTitle>
            <CardDescription>
              Ranking de llegadas tarde (horario esperado: 09:00)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tardinessChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tardinessChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="tardanzas"
                    fill="#ef4444"
                    name="Cantidad de tardanzas"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tablas de detalles */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Horas</CardTitle>
            <CardDescription>Top 10 empleados por horas trabajadas</CardDescription>
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
            <CardTitle>Ranking de Tardanzas</CardTitle>
            <CardDescription>Empleados con más llegadas tarde</CardDescription>
          </CardHeader>
          <CardContent>
            {tardinessRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
            ) : (
              <div className="space-y-2">
                {tardinessRanking.map((item, index) => (
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
                      {item.tardinessCount} vez{item.tardinessCount !== 1 ? 'es' : ''}
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

