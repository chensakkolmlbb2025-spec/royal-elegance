"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { ServiceBookingForm } from "@/components/user/service-booking-form"
import type { Service } from "@/lib/types"
import { getServices } from "@/lib/supabase-service"

export default function ServiceBookingPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string

  const [service, setService] = useState<Service | null>(null)
  const [loadingService, setLoadingService] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
      
      // Redirect if not authenticated
      if (!user) {
        router.push("/login")
      }
    })

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        router.push("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    const fetchService = async () => {
      try {
        const services = await getServices()
        const foundService = services.find((s) => s.id === serviceId)
        
        if (!foundService) {
          router.push("/services")
          return
        }

        if (!foundService.available) {
          router.push("/services")
          return
        }

        setService(foundService)
      } catch (error) {
        console.error("Error fetching service:", error)
        router.push("/services")
      } finally {
        setLoadingService(false)
      }
    }

    if (serviceId) {
      fetchService()
    }
  }, [serviceId, router])

  if (loading || loadingService) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!service) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <PremiumNavbar />
      <main className="container mx-auto px-4 py-8" style={{ marginTop: "112px" }}>
        <ServiceBookingForm service={service} onBack={() => router.push("/services")} />
      </main>
    </div>
  )
}

