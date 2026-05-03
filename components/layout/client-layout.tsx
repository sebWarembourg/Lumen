'use client'

import { useSidebar } from '@/components/layout/sidebar-context'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <main
      className={[
        'flex-1 min-h-screen overflow-x-hidden bg-background pb-16 md:pb-0',
        'transition-[margin] duration-300',
        collapsed ? 'md:ml-14' : 'md:ml-56',
      ].join(' ')}
    >
      {children}
      <footer className="border-t border-border/50 py-3 px-6 flex items-center justify-center mb-16 md:mb-0">
        <p className="text-xs text-muted-foreground/40 font-mono">
          reads from ~/.claude/ · local only · no telemetry
        </p>
      </footer>
    </main>
  )
}
