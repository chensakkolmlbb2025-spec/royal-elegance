import React from 'react'
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { PremiumFooter } from "@/components/layout/premium-footer"

type LoadingProps = {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  withLayout?: boolean  // Include navbar and footer
}

export default function Loading({ message = 'Loading...', size = 'md', withLayout = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className={`${sizeClasses[size]} border-4 border-primary border-t-transparent rounded-full animate-spin`} />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  )

  if (withLayout) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-accent/5 to-background">
        <PremiumNavbar />
        <div className="flex-1 flex items-center justify-center">
          {spinner}
        </div>
        <PremiumFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
      {spinner}
    </div>
  )
}
