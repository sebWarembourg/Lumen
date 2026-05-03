import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ThemeProvider } from '@/components/theme-provider'
import { KeyboardNavProvider } from '@/components/keyboard-nav-provider'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { ClientLayout } from '@/components/layout/client-layout'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Claude Analytics',
  description: 'Local AI usage dashboard. Reads directly from ~/.claude/ — no telemetry, no API.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t!=='light')}catch(e){}})()` }} />
      </head>
      <body suppressHydrationWarning className={`${geistMono.variable} ${inter.variable} antialiased`}>
        <ThemeProvider>
          <SidebarProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <ClientLayout>{children}</ClientLayout>
            </div>
            <BottomNav />
            <KeyboardNavProvider />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
