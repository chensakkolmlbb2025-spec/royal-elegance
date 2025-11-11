"use client"

import { Button } from "@/components/ui/button"
import { Hotel, Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
            <Hotel className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold">Luxury Hotel</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/rooms" className="text-sm font-medium hover:text-primary transition-colors">
            Rooms
          </Link>
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Admin
          </Link>
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Staff
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="rounded-full">
              Book Now
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg">
          <nav className="flex flex-col p-4 space-y-2">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/rooms"
              className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Rooms
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Staff
            </Link>
            <div className="pt-2 space-y-2">
              <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/rooms" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full rounded-full">
                  Book Now
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
