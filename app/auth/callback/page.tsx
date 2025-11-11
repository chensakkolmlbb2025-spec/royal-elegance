'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

type AuthStatus = 'processing' | 'success' | 'error'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<AuthStatus>('processing')
  const [message, setMessage] = useState('Completing authentication...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus('error')
          setMessage(errorDescription || 'Authentication failed: ' + error)
          setTimeout(() => router.replace('/login'), 3000)
          return
        }

        const type = searchParams.get('type')
        if (type === 'recovery') {
          setStatus('success')
          setMessage('Password reset link verified')
          setTimeout(() => router.replace('/auth/reset-password'), 2000)
          return
        }

        setMessage('Verifying authentication...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setStatus('error')
          setMessage('Failed to create session')
          setTimeout(() => router.replace('/login'), 3000)
          return
        }

        setMessage('Loading your profile...')
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const userRole = profile?.role || 'user'
        setStatus('success')
        setMessage('Authentication successful!')

        setTimeout(() => {
          switch (userRole) {
            case 'admin':
              router.replace('/admin')
              break
            case 'staff':
              router.replace('/staff')
              break
            default:
              router.replace('/home')
          }
        }, 1500)
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred')
        setTimeout(() => router.replace('/login'), 3000)
      }
    }

    const timer = setTimeout(handleCallback, 100)
    return () => clearTimeout(timer)
  }, [router, searchParams])

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />
    }
  }

  const getTitle = () => {
    switch (status) {
      case 'processing':
        return 'Processing Authentication'
      case 'success':
        return 'Authentication Successful'
      case 'error':
        return 'Authentication Failed'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-3 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-display">{getTitle()}</CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {status === 'error' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => router.replace('/login')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Return to Login
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
        <Card className="glass-card w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-display">Processing Authentication</CardTitle>
            <CardDescription className="mt-2">Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
