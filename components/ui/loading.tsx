import React from 'react'

type LoadingProps = {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  /** 
   * Loading display mode:
   * - 'content': Shows spinner in content area only (navbar/footer stay visible via layout)
   * - 'fullpage': Full page loading with gradient background (for admin/staff dashboards)
   */
  variant?: 'content' | 'fullpage'
  className?: string
}

export default function Loading({ 
  message = 'Loading...', 
  size = 'md', 
  variant = 'content',
  className = ''
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className={`${sizeClasses[size]} border-4 border-primary border-t-transparent rounded-full animate-spin`} />
      {message && <p className="text-sm text-slate-500 font-medium">{message}</p>}
    </div>
  )

  // Content-only loading - fits within existing layout (navbar/footer from layout.tsx)
  if (variant === 'content') {
    return (
      <div className={`flex-1 flex items-center justify-center min-h-[60vh] ${className}`}>
        {spinner}
      </div>
    )
  }

  // Full-page loading - for admin/staff dashboards with their own layouts
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background ${className}`}>
      {spinner}
    </div>
  )
}

// Export a content skeleton for more complex loading states
export function ContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex-1 container max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
      </div>
      
      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
            <div className="h-40 bg-slate-100 rounded-lg" />
            <div className="space-y-2">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
