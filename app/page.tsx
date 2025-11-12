import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Users, Clock, Calculator } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#023235]/8 via-background to-[#CD9A56]/8 dark:from-[#023235]/30 dark:via-background dark:to-[#023235]/20">
      <div className="container mx-auto py-12 px-4">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Sistema de Gestión de Horarios
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Gestiona los horarios, turnos y sueldos
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Link href="/dashboard">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <LayoutDashboard className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Estadísticas</CardTitle>
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
                  Gestiona los perfiles de los empleados
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

