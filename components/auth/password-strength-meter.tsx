"use client"

import { useMemo } from "react"
import { CheckCircle2, XCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthMeterProps {
  password: string
  showRequirements?: boolean
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    if (!password) return { score: 0, checks }

    let score = 0

    // Calculate score
    if (checks.length) score++
    if (checks.lowercase) score++
    if (checks.uppercase) score++
    if (checks.number) score++
    if (checks.special) score++

    // Bonus points for length
    if (password.length >= 12) score++
    if (password.length >= 16) score++

    return { score: Math.min(score, 5), checks }
  }, [password])

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: "Too weak", color: "text-gray-400" }
    if (score <= 2) return { label: "Weak", color: "text-red-500" }
    if (score <= 3) return { label: "Fair", color: "text-orange-500" }
    if (score === 4) return { label: "Good", color: "text-yellow-500" }
    return { label: "Strong", color: "text-green-500" }
  }

  const strengthInfo = getStrengthLabel(strength.score)

  const requirements = [
    { key: "length", label: "At least 8 characters", met: strength.checks.length },
    { key: "lowercase", label: "One lowercase letter", met: strength.checks.lowercase },
    { key: "uppercase", label: "One uppercase letter", met: strength.checks.uppercase },
    { key: "number", label: "One number", met: strength.checks.number },
    { key: "special", label: "One special character", met: strength.checks.special },
  ]

  if (!password) return null

  return (
    <div className="space-y-3">
      {/* Strength Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn("font-medium", strengthInfo.color)}>{strengthInfo.label}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn("h-1 flex-1 rounded-full transition-all duration-300", {
                "bg-red-500": level <= strength.score && strength.score <= 2,
                "bg-orange-500": level <= strength.score && strength.score === 3,
                "bg-yellow-500": level <= strength.score && strength.score === 4,
                "bg-green-500": level <= strength.score && strength.score === 5,
                "bg-gray-200 dark:bg-gray-700": level > strength.score,
              })}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          {requirements.map((req) => (
            <div key={req.key} className="flex items-center gap-2 text-xs">
              {req.met ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={cn(req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
