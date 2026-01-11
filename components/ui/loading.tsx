import React from 'react'

type LoadingProps = {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Loading({ message = 'Loading...', size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="flex flex-col items-center gap-4">
        <div className={`${sizeClasses[size]} border-4 border-primary border-t-transparent rounded-full animate-spin`} />
        <p className="text-sm text-slate-500 font-medium">{message}</p>
      </div>
    </div>
  )
}
