"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X, Phone, Mail, User, Calendar, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function PremiumNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/rooms", label: "Rooms & Suites" },
    { href: "/services", label: "Experiences" },
    { href: "/bookings", label: "My Reservations" },
  ]

  return (
    <>
      {/* Top Bar */}
      <div className="bg-slate-900 text-white py-2 px-4 text-xs">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex gap-6">
            <a href="https://maps.google.com/?q=Royal+Elegance+Hotel" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <MapPin className="w-3 h-3" />
              <span className="hidden md:inline">123 Luxury Avenue, Downtown</span>
            </a>
            <a href="tel:+1234567890" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Phone className="w-3 h-3" />
              <span className="hidden md:inline">+1 (234) 567-890</span>
            </a>
            <a href="mailto:reservations@hotel.com" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Mail className="w-3 h-3" />
              <span className="hidden md:inline">reservations@hotel.com</span>
            </a>
          </div>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <Link href="/profile" className="hover:text-primary transition-colors flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="hidden md:inline">My Account</span>
                </Link>
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.href = "/"
                  }} 
                  className="hover:text-primary transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" className="hover:text-primary transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass-card border-b"
            : "bg-transparent"
        }`}
        style={{ top: scrolled ? "0" : "32px" }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 items-center h-20 gap-4">
            {/* Logo - Left Column */}
            <div className="flex justify-start">
              <Link href="/" className="flex flex-col items-start group">
                <span className={`text-2xl font-display font-bold tracking-wider transition-all duration-300 ${
                  scrolled ? "text-slate-900" : "text-white"
                } group-hover:accent-gold`}>
                  ROYAL ELEGANCE
                </span>
                <span className={`text-[10px] tracking-[0.3em] uppercase transition-all duration-300 ${
                  scrolled ? "text-slate-600" : "text-white/80"
                } group-hover:text-[#d4af37]`}>
                  Luxury Hotel & Residences
                </span>
              </Link>
            </div>

            {/* Desktop Navigation - Center Column (Perfectly Centered) */}
            <div className="hidden lg:flex items-center justify-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm tracking-wide uppercase transition-all duration-300 relative group whitespace-nowrap ${
                    pathname === link.href
                      ? scrolled ? "text-slate-900 font-semibold" : "text-white font-semibold"
                      : scrolled ? "text-slate-700 hover:text-slate-900" : "text-white/90 hover:text-white"
                  }`}
                >
                  {link.label}
                  <span className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
                    pathname === link.href 
                      ? "w-full bg-gradient-to-r from-[#d4af37] to-[#f4d03f]" 
                      : "w-0 bg-gradient-to-r from-[#d4af37] to-[#f4d03f] group-hover:w-full"
                  }`} />
                </Link>
              ))}
            </div>

            {/* CTA Buttons - Right Column */}
            <div className="hidden lg:flex items-center justify-end gap-4">
              <Link href="/rooms">
                <Button
                  size="sm"
                  className="booking-button tracking-wide"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button - Right Column on Mobile */}
            <div className="lg:hidden flex justify-end">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 ${scrolled ? "text-slate-900" : "text-white"}`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ top: "112px" }}>
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg tracking-wide uppercase transition-colors ${
                      pathname === link.href
                        ? "text-primary font-medium"
                        : "text-white hover:text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-6 border-t border-white/10">
                  <Link href="/rooms" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full booking-button" size="lg">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Your Stay
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
