"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"

// Password validation helper
const validatePassword = (password: string) => {
  const requirements = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  }
  
  const isStrong = Object.values(requirements).every(Boolean)
  
  return { requirements, isStrong }
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Password validation
  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  // Verify the recovery token from email link
  useEffect(() => {
    const verifyRecoveryToken = async () => {
      const supabase = createClient()
      
      // Check if we have a recovery token in the URL
      const type = searchParams.get('type')
      const code = searchParams.get('code')
      
      if (type !== 'recovery' || !code) {
        setTokenError("Invalid or missing password reset link. Please request a new one.")
        setIsVerifying(false)
        return
      }

      try {
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error("Token verification error:", error)
          setTokenError("This password reset link has expired or is invalid. Please request a new one.")
          setIsVerifying(false)
          return
        }

        if (data.session) {
          setIsValidToken(true)
          setIsVerifying(false)
        } else {
          setTokenError("Unable to verify reset link. Please request a new one.")
          setIsVerifying(false)
        }
      } catch (error) {
        console.error("Unexpected error verifying token:", error)
        setTokenError("An error occurred. Please try again.")
        setIsVerifying(false)
      }
    }

    verifyRecoveryToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordValidation.isStrong) {
      toast({
        title: "Invalid Password",
        description: "Password must meet all security requirements.",
        variant: "destructive",
      })
      return
    }

    if (!passwordsMatch) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. Redirecting to login...",
      })

      // Sign out to clear the recovery session
      await supabase.auth.signOut()

      // Redirect to login page
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while verifying token
  if (isVerifying) {
    return (
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-display">Verifying Reset Link</CardTitle>
          <CardDescription>Please wait while we verify your password reset link...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Verifying your link...</p>
        </CardContent>
      </Card>
    )
  }

  // Show error if token is invalid
  if (tokenError) {
    return (
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-display">Invalid Reset Link</CardTitle>
          <CardDescription>{tokenError}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Password reset links expire after 1 hour for security reasons.
            </AlertDescription>
          </Alert>

          <Button
            type="button"
            className="w-full"
            onClick={() => router.push("/auth/forgot-password")}
          >
            Request New Reset Link
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/auth/login")}
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show password reset form if token is valid
  return (
    <Card className="glass-card w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">Create New Password</CardTitle>
        <CardDescription>Enter a strong password for your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Requirements */}
            {password.length > 0 && (
              <div className="space-y-1 text-xs bg-slate-50 p-3 rounded-md">
                <p className="font-medium text-slate-700 mb-2">Password must contain:</p>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.length ? 'text-green-600' : 'text-slate-400'}`}>
                  {passwordValidation.requirements.length ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.lowercase ? 'text-green-600' : 'text-slate-400'}`}>
                  {passwordValidation.requirements.lowercase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.uppercase ? 'text-green-600' : 'text-slate-400'}`}>
                  {passwordValidation.requirements.uppercase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.numbers ? 'text-green-600' : 'text-slate-400'}`}>
                  {passwordValidation.requirements.numbers ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.special ? 'text-green-600' : 'text-slate-400'}`}>
                  {passwordValidation.requirements.special ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Special character (!@#$%...)</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="glass pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Match Indicator */}
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

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !passwordValidation.isStrong || !passwordsMatch}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

