'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { authClient } from '@/lib/auth/helpers'
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'

interface SignUpFormProps {
  onSwitchToLogin?: () => void
}

function validatePassword(password: string) {
  const errors: string[] = []
  if (password.length < 8) errors.push('At least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('One number')
  return { valid: errors.length === 0, errors }
}

export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!acceptedTerms) {
      setError('Please accept the terms of service and privacy policy.')
      return
    }

    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0])
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await authClient.signUp({ email, password, fullName })
      setError(null)
      router.push('/auth/verify-email?email=' + encodeURIComponent(email))
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass-card w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">Create Account</CardTitle>
        <CardDescription>Enter your information to create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="space-y-1 text-xs">
                {passwordValidation.errors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-3 h-3" />
                    <span>{error}</span>
                  </div>
                ))}
                {passwordValidation.valid && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Password meets all requirements</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {confirmPassword.length > 0 && (
              <div className="text-xs">
                {passwordsMatch ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-3 h-3" />
                    <span>Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              disabled={loading}
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground leading-none">
              I agree to the{' '}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !acceptedTerms || !passwordValidation.valid || !passwordsMatch}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          {onSwitchToLogin && (
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline">
                Sign In
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
