'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ShiftForm } from '@/components/shifts/ShiftForm'
import { Clock, Users, Plus, LayoutDashboard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface HomeData {
  totalHoursToday: number
  employeesToday: Array<{ id: string; name: string }>
  totalShiftsToday: number
}

interface Employee {
  id: string
  name: string
}

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    fetchHomeData()
    fetchEmployees()
  }, [])

  const fetchHomeData = async () => {
    try {
      const response = await fetch('/api/home')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        console.error('Error fetching home data')
      }
    } catch (error) {
      console.error('Error fetching home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setEmployees(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    toast.success('Turno creado correctamente')
    fetchHomeData()
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#023235]/8 via-background to-[#CD9A56]/8 dark:from-[#023235]/30 dark:via-background dark:to-[#023235]/20 md:pt-[11.5rem]">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center gap-4 mb-8">
          {!imageError && (
            <Image
              src="/logo.png"
              alt="Logo"
              width={64}
              height={64}
              className="object-contain"
              priority
              onError={() => setImageError(true)}
            />
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-the-sans font-bold uppercase">
            Patio Cervecero Oro Verde
          </h1>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {/* Card Horas trabajadas hoy */}
          <div className="w-full sm:w-[320px] min-h-[205px] rounded-lg border bg-muted p-4 pt-3 pb-[1.125rem] flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Horas trabajadas hoy</h3>
            </div>
            <Card className="bg-card border-0 shadow-none flex-1 flex flex-col">
              <CardContent className="p-[1.125rem] pt-2 pb-[1.125rem] flex-1 flex flex-col items-start justify-start">
                {loading ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <p className="text-3xl font-bold">
                    {data?.totalHoursToday.toFixed(2) || '0.00'}h
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Card Empleados que trabajaron hoy */}
          <div className="w-full sm:w-[320px] min-h-[205px] rounded-lg border bg-muted p-4 pt-3 pb-[1.125rem] flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Empleados de hoy</h3>
            </div>
            <Card className="bg-card border-0 shadow-none flex-1 flex flex-col">
              <CardContent className="p-[1.125rem] pt-2 pb-[1.125rem] flex-1 flex flex-col items-start justify-start">
                {loading ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-full">
                    {data && data.employeesToday.length > 0 ? (
                      <ul className="text-sm text-white space-y-1">
                        {data.employeesToday.map((emp) => (
                          <li key={emp.id}>• {emp.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-lg text-muted-foreground text-center">No hay empleados trabajando hoy</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                <Plus className="h-5 w-5 mr-2" />
                Nuevo turno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Turno</DialogTitle>
              </DialogHeader>
              <ShiftForm
                employees={employees}
                onSuccess={handleFormSuccess}
              />
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-6" asChild>
            <Link href="/employees" className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Ver empleados
            </Link>
          </Button>
          
          <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-6" asChild>
            <Link href="/dashboard" className="flex items-center">
              <LayoutDashboard className="h-5 w-5 mr-2" />
              Ver reportes
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
