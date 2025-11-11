"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Building2, LogOut, User, Hotel, Sparkles, Calendar, UserCircle } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function UserNav() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const navLinks = [
    { href: "/rooms", label: "Rooms", icon: Hotel },
    { href: "/services", label: "Services", icon: Sparkles },
    { href: "/bookings", label: "My Bookings", icon: Calendar },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ]

  return (
    <nav className="glass-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/rooms" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Building2 className="w-6 h-6" />
            <h1 className="text-xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Luxury Hotel
            </h1>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn("gap-2", isActive && "bg-primary/10")}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.user_metadata?.full_name || user.email}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 mt-4 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn("gap-2 whitespace-nowrap", isActive && "bg-primary/10")}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
