'use client'

import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <main
      className={cn(
        'flex-1 p-3 sm:p-4 md:p-6 lg:p-8 transition-all duration-300',
        'pt-16 md:pt-4', // Padding superior para el botón hamburguesa en móviles
        // Margen izquierdo dinámico según el estado del sidebar
        !isCollapsed ? 'md:ml-[280px]' : 'md:ml-[56px]'
      )}
    >
      {children}
    </main>
  )
}

