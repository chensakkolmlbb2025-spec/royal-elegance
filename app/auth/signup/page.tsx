"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Hotel, Check, Sparkles, Globe, Clock, Heart } from "lucide-react"
import { SignUpForm } from "@/components/auth/signup-form"

export default function SignUpPage() {
  const router = useRouter()
  
  const benefits = [
    {
      icon: Sparkles,
      title: "Exclusive Deals",
      description: "Get access to members-only rates and special promotions"
    },
    {
      icon: Clock,
      title: "Fast Booking",
      description: "Save your preferences for quick and easy reservations"
    },
    {
      icon: Heart,
      title: "Personalized",
      description: "Receive tailored recommendations based on your taste"
    },
    {
      icon: Globe,
      title: "Worldwide Access",
      description: "Book luxury hotels in over 150 countries globally"
    },
  ]

  const features = [
    "Instant booking confirmation",
    "24/7 customer support",
    "Flexible cancellation",
    "Loyalty rewards program",
    "Mobile app access",
    "Price match guarantee"
  ]

  return (
    <main className="min-h-screen flex">

      {/* Right Side - Sign Up Form */}
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
              Luxury Hotel
            </span>
          </Link>

          {/* Mobile Benefits (Visible only on Mobile) */}
          <div className="lg:hidden mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border">
            <p className="text-sm font-medium text-center">
              ✨ Join 50,000+ travelers • Exclusive deals • 24/7 support
            </p>
          </div>

          {/* Sign Up Form */}
          <SignUpForm onSwitchToLogin={() => router.push("/login")} />
        </div>
      </div>
    </main>
  )
}

