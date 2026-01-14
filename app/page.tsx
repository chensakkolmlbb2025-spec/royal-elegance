"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { PremiumFooter } from "@/components/layout/premium-footer"
import { PremiumHeroSection } from "@/components/landing/premium-hero-section"
import SEO from "@/components/ui/SEO"
import Loading from "@/components/ui/loading"

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [shouldShowLanding, setShouldShowLanding] = useState(false)
  const authCheckDone = useRef(false)

  useEffect(() => {
    // Prevent multiple auth checks using ref (doesn't cause re-render)
    if (authCheckDone.current) return

    const checkAuth = async () => {
      authCheckDone.current = true
      
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          // Get user role from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          const role = profile?.role || 'user'

          // Redirect based on role - don't show landing page
          if (role === 'admin') {
            router.replace('/admin')
          } else if (role === 'staff') {
            router.replace('/staff')
          } else {
            router.replace('/home')
          }
          // Keep loading true during redirect to prevent flash
          return
        }
        
        // No user - show landing page
        setShouldShowLanding(true)
      } catch (error) {
        console.error('Auth check error:', error)
        // On error, show landing page
        setShouldShowLanding(true)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return <Loading message="Loading..." size="lg" variant="fullpage" />
  }

  // Don't render landing page if redirecting
  if (!shouldShowLanding) {
    return <Loading message="Redirecting..." size="lg" variant="fullpage" />
  }

  return (
      <>
        <SEO
          title="Royal Elegance Luxury Hotel"
          description="A historic landmark hotel offering unparalleled luxury and service since 1929. Book your stay and experience true elegance."
          ogTitle="Royal Elegance Luxury Hotel"
          ogDescription="Unparalleled luxury and service since 1929."
          ogImage="/logo.png"
        />
        <div className="min-h-screen">
          <PremiumNavbar />
          <PremiumHeroSection />
          <PremiumFooter/>
        </div>
      </>
  )
}
