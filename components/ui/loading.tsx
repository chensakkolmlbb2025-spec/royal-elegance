import React from 'react'

type LoadingProps = {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Loading({ message = 'Loading...', size = 'md' }: LoadingProps) {
  // Using consistent spinner size across all loading states
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">{message}</p>
      </div>
    </div>
  )
}
