'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

export default function ClearDatabasePage() {
  const [loading, setLoading] = useState(false)

  const handleClearDatabase = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      return
    }

    if (!confirm('¿Realmente estás seguro? Esto eliminará todos los empleados, turnos y logs.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/clear-database', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Base de datos limpiada exitosamente')
        // Recargar la página después de 2 segundos
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else {
        toast.error(data.error || 'Error al limpiar la base de datos')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al limpiar la base de datos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Limpiar Base de Datos
          </CardTitle>
          <CardDescription>
            Esta acción eliminará TODOS los datos: empleados, turnos y logs de actividad.
            Esta acción NO se puede deshacer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
            <p className="text-sm font-medium text-destructive mb-2">⚠️ Advertencia</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Se eliminarán todos los empleados</li>
              <li>Se eliminarán todos los turnos</li>
              <li>Se eliminarán todos los logs de actividad</li>
              <li>Esta acción es permanente e irreversible</li>
            </ul>
          </div>

          <Button
            onClick={handleClearDatabase}
            disabled={loading}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {loading ? 'Eliminando...' : 'Eliminar Todos los Datos'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Solo disponible en modo desarrollo
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

