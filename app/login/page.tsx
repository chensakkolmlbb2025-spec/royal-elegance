"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { Hotel, Star, Shield, Users, TrendingUp } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const verified = searchParams.get('verified')
    const error = searchParams.get('error')
    const message = searchParams.get('message')

    if (verified === 'true') {
      toast({
        title: "Email Verified Successfully",
        description: "Your email has been verified. You can now sign in to your account.",
      })
    } else if (error) {
      let errorMessage = "Authentication failed"
      
      switch (error) {
        case 'timeout':
          errorMessage = "Authentication timed out. Please try again."
          break
        case 'auth_failed':
          errorMessage = message ? decodeURIComponent(message) : "Authentication failed"
          break
        case 'no_auth_code':
          errorMessage = "Invalid verification link. Please request a new one."
          break
        case 'exchange_failed':
          errorMessage = "Failed to complete authentication. Please try again."
          break
        case 'session_failed':
          errorMessage = "Failed to establish session. Please try again."
          break
        case 'no_session':
          errorMessage = "Authentication succeeded but no session was created."
          break
        default:
          errorMessage = message ? decodeURIComponent(message) : "Authentication error"
      }

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }, [searchParams, toast])


  
  const testimonials = [
    {
      quote: "The booking experience was seamless. Best hotel platform I've used!",
      author: "Sarah Johnson",
      role: "Verified Guest",
      rating: 5
    },
    {
      quote: "Exceptional service and easy-to-use interface. Highly recommended!",
      author: "Michael Chen",
      role: "Business Traveler",
      rating: 5
    },
  ]

  const stats = [
    { icon: Users, label: "Happy Guests", value: "50K+" },
    { icon: Star, label: "Average Rating", value: "4.9/5" },
    { icon: TrendingUp, label: "Growth Rate", value: "200%" },
  ]

  return (
    <main className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-accent/5 to-background" />
        <div className="absolute inset-0 bg-[url('/luxury-hotel-lobby.png')] bg-cover bg-center opacity-5" />
        
        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Hotel className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ROYAL ELEGANCE
            </span>
          </Link>

          {/* Login Form */}
          <LoginForm 
            onForgotPassword={() => router.push("/auth/reset-password")} 
            onSwitchToSignUp={() => router.push("/auth/signup")} 
          />

          {/* Trust Badges */}
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Badge variant="outline" className="gap-2">
              <Shield className="w-3 h-3" />
              Secure Login
            </Badge>
            <Badge variant="outline" className="gap-2">
              <Star className="w-3 h-3" />
              Trusted by 50K+
            </Badge>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
