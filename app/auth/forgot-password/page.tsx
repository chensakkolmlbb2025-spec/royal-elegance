"use client"

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { Hotel } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/5 to-background p-4">
      <div className="absolute inset-0 bg-[url('/luxury-hotel-lobby.png')] bg-cover bg-center opacity-10" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="relative z-50 flex flex-col items-center group">
            <span className="text-xl sm:text-2xl font-display font-bold tracking-widest transition-colors duration-300 text-slate-900">
              ROYAL
              <span className="ml-1 bg-slate-800 px-2 transition-colors duration-300 text-[#d4af37]">
                ELEGANCE
              </span>
            </span>
            <span className="text-[9px] sm:text-[10px] tracking-[0.3em] uppercase transition-colors duration-300 text-slate-500">
              Luxury Hotel & Residences
            </span>
          </div>
        </Link>

        <ForgotPasswordForm />
      </div>
    </main>
  )
}
