import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import localFont from 'next/font/local'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { MainContent } from '@/components/layout/MainContent'

const theSansOffice = localFont({
  src: [
    {
      path: '../fonts/TheSansOffice-Regular_TRIAL.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/TheSansOffice-Italic_TRIAL.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../fonts/TheSansOffice-Bold_TRIAL.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../fonts/TheSansOffice-BoldItalic_TRIAL.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: '--font-the-sans-office',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Patio Cervecero Oro Verde',
  description: 'Aplicación para gestionar horarios y sueldos de empleados',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${theSansOffice.variable}`}>
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
