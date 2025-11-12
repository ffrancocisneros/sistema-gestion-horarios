import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { MainContent } from '@/components/layout/MainContent'

export const metadata: Metadata = {
  title: 'Sistema de Gestión de Horarios',
  description: 'Aplicación para gestionar horarios y sueldos de empleados',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider>
            <div className="flex">
              <Sidebar />
              <MainContent>{children}</MainContent>
            </div>
          </SidebarProvider>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
