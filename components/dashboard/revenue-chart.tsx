"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getBookings } from "@/lib/supabase-service"
import type { Booking } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function RevenueChart() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      const data = await getBookings()
      setBookings(data)
    } catch (error) {
      console.error("Error loading bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate revenue by month
  const revenueByMonth = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce(
      (acc, booking) => {
        const month = new Date(booking.createdAt).toLocaleString("default", { month: "short" })
        acc[month] = (acc[month] || 0) + booking.totalPrice
        return acc
      },
      {} as Record<string, number>,
    )

  const chartData = Object.entries(revenueByMonth).map(([month, revenue]) => ({
    month,
    revenue,
  }))

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>
  }

  return (
    <Card className="glass-card border-0 animate-fade-in-up animation-delay-400">
      <CardHeader className="bg-gradient-to-br from-white/95 to-background-accent/20">
        <CardTitle className="font-display text-slate-900">Revenue Overview</CardTitle>
        <CardDescription>Monthly revenue from bookings</CardDescription>
      </CardHeader>
      <CardContent className="bg-white/95">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                borderRadius: "8px",
                backdropFilter: "blur(12px)",
              }}
            />
            <Bar dataKey="revenue" fill="#d4af37" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
