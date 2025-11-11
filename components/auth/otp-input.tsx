"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function OTPInput({ length = 6, value, onChange, disabled = false, autoFocus = false }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length)
  }, [length])

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  // Update internal state when value prop changes
  useEffect(() => {
    const otpArray = value.split("").slice(0, length)
    while (otpArray.length < length) {
      otpArray.push("")
    }
    setOtp(otpArray)
  }, [value, length])

  const handleChange = (index: number, digit: string) => {
    // Only allow digits
    if (digit && !/^\d$/.test(digit)) return

    const newOtp = [...otp]
    newOtp[index] = digit

    setOtp(newOtp)
    onChange(newOtp.join(""))

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
      e.preventDefault()
      const newOtp = [...otp]
      
      if (otp[index]) {
        // Clear current input
        newOtp[index] = ""
        setOtp(newOtp)
        onChange(newOtp.join(""))
      } else if (index > 0) {
        // Move to previous input and clear it
        newOtp[index - 1] = ""
        setOtp(newOtp)
        onChange(newOtp.join(""))
        inputRefs.current[index - 1]?.focus()
      }
    }
    
    // Handle arrow keys
    else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, length)
    
    const newOtp = pastedData.split("")
    while (newOtp.length < length) {
      newOtp.push("")
    }
    
    setOtp(newOtp)
    onChange(newOtp.join(""))
    
    // Focus last filled input or last input
    const lastFilledIndex = Math.min(pastedData.length, length - 1)
    inputRefs.current[lastFilledIndex]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            digit
              ? "border-primary bg-primary/5"
              : "border-input bg-background hover:border-primary/50"
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
