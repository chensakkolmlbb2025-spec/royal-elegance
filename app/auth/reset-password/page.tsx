"use client"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Hotel } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <div className="absolute inset-0 bg-[url('/luxury-hotel-lobby.png')] bg-cover bg-center opacity-10" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
            <Hotel className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-display font-bold">Luxury Hotel</span>
        </Link>

        <ResetPasswordForm />
      </div>
    </main>
  )
}

