'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, Clock, Calculator, FileText, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/dashboard', label: 'Estadísticas', icon: LayoutDashboard },
  { href: '/employees', label: 'Empleados', icon: Users },
  { href: '/shifts', label: 'Turnos', icon: Clock },
  { href: '/salaries', label: 'Sueldos', icon: Calculator },
  { href: '/logs', label: 'Logs', icon: FileText },
]

export function Navbar() {
  const pathname = usePathname()
  const [imageError, setImageError] = useState(false)

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              {!imageError ? (
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <span className="font-bold text-xl">
                Sistema de Gestión de Horarios
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'gap-2',
                      isActive && 'bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}

