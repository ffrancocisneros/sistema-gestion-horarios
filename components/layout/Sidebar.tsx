'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, Clock, Calculator, FileText, Home, Menu, X, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useState, useEffect } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/employees', label: 'Empleados', icon: Users },
  { href: '/shifts', label: 'Turnos', icon: Clock },
  { href: '/salaries', label: 'Sueldos', icon: Calculator },
  { href: '/shift-planning', label: 'Planificación', icon: CalendarCheck },
  { href: '/dashboard', label: 'Reportes', icon: LayoutDashboard },
]

export function Sidebar() {
  const pathname = usePathname()
  const [imageError, setImageError] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isCollapsed, setIsCollapsed } = useSidebar()

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Cerrar menú móvil al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isMobileMenuOpen && !target.closest('aside') && !target.closest('button[aria-label="Toggle menu"]')) {
        setIsMobileMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobileMenuOpen])

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={cn(
        "flex h-16 items-center border-b px-4 transition-all",
        isCollapsed ? "justify-center px-2" : "gap-3"
      )}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-3 flex-1 min-w-0">
            {!imageError ? (
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="object-contain flex-shrink-0"
                priority
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center bg-muted rounded flex-shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <span className="font-bold text-lg truncate">
              Patio Cervecero Oro Verde
            </span>
          </Link>
        )}
        {isCollapsed && (
          <div className="w-full flex items-center justify-center">
            {!imageError ? (
              <Image
                src="/logo.png"
                alt="Logo"
                width={20}
                height={20}
                className="object-contain"
                priority
                onError={() => setImageError(true)}
              />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        )}
        {/* Botón para colapsar/expandir (solo escritorio) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors"
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full gap-3 transition-all',
                  isCollapsed ? 'justify-center px-2' : 'justify-start',
                  isActive && 'bg-secondary'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t transition-all",
        isCollapsed ? "p-2 flex flex-col items-center gap-2" : "p-4 flex items-center justify-between gap-2"
      )}>
        <Link href="/logs">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 w-9',
              pathname === '/logs' && 'bg-secondary'
            )}
            title="Logs"
          >
            <FileText className="h-5 w-5" />
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </div>
  )

  return (
    <>
      {/* Botón hamburguesa para móviles */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-background border shadow-md"
        aria-label="Toggle menu"
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Overlay para móviles */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300",
          isCollapsed ? "w-[56px]" : "w-[280px]",
          // En móviles: oculto por defecto, visible cuando el menú está abierto
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

