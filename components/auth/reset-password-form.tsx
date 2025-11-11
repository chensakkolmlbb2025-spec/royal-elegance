"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

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
  const { toast } = useToast()
  const router = useRouter()

  // Password validation
  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordValidation.isStrong) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters.",
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
        description: "Your password has been updated. You can now sign in with your new password.",
      })

      // Redirect to login page
      setTimeout(() => {
        router.push("/login")
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

  return (
    <Card className="glass-card w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-display">Create New Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
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
              <div className="space-y-1 text-xs">
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.length ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.length ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.lowercase ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.lowercase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.uppercase ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.uppercase ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.numbers ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.numbers ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Number</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordValidation.requirements.special ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordValidation.requirements.special ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>Special character</span>
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

          <Button type="submit" className="w-full" disabled={isLoading || !passwordValidation.isStrong || !passwordsMatch}>
            {isLoading ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

