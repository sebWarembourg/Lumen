'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  isLoading: boolean
  label?: string
}

export function LoadingOverlay({ isLoading, label = 'Chargement' }: LoadingOverlayProps) {
  const [mounted, setMounted] = useState(isLoading)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 350)
      return () => clearTimeout(t)
    }
  }, [isLoading])

  if (!mounted) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-6',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={{
        background: 'color-mix(in oklab, var(--background) 88%, transparent)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      aria-label="Chargement en cours"
      role="status"
    >
      <div className="breathing-dot" />
      <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground select-none">
        {label}
      </p>
    </div>
  )
}
