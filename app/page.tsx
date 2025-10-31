import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Users, Clock, Calculator, FileText } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-12 px-4">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
            Sistema de Gestión de Horarios
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Gestiona los horarios, turnos y sueldos de tus empleados de manera eficiente y organizada
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Link href="/dashboard">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <LayoutDashboard className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Visualiza estadísticas y métricas generales
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/employees">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Users className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Empleados</CardTitle>
                <CardDescription>
                  Gestiona los perfiles de tus empleados
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/shifts">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Clock className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Turnos</CardTitle>
                <CardDescription>
                  Registra y gestiona los horarios de trabajo
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/salaries">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Calculator className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Sueldos</CardTitle>
                <CardDescription>
                  Calcula sueldos diarios, semanales y mensuales
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/logs">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <FileText className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Logs</CardTitle>
                <CardDescription>
                  Revisa el historial de actividades del sistema
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <Link href="/dashboard">
            <Button size="lg">
              Comenzar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

