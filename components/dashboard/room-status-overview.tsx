"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getRooms, getRoomTypes, getBookings } from "@/lib/supabase-service"
import type { Room, RoomType, Booking } from "@/lib/types"

export function RoomStatusOverview() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, roomTypesData, bookingsData] = await Promise.all([
          getRooms(), 
          getRoomTypes(),
          getBookings()
        ])
        setRooms(roomsData)
        setRoomTypes(roomTypesData)
        setBookings(bookingsData)
      } catch (error) {
        console.error("Error fetching room status data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate actual room status based on current bookings
  const calculateRoomStatus = (room: Room) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today
    
    // Helper function to safely convert to Date
    const toDate = (date: any): Date | null => {
      if (!date) return null
      if (date instanceof Date) return date
      try {
        const d = new Date(date)
        return isNaN(d.getTime()) ? null : d
      } catch {
        return null
      }
    }
    
    // Check if room has a current active booking
    const activeBooking = bookings.find((booking) => {
      if (booking.roomId !== room.id) return false
      if (booking.status === "cancelled") return false
      
      const checkIn = toDate(booking.checkIn || booking.checkInDate)
      const checkOut = toDate(booking.checkOut || booking.checkOutDate)
      
      if (!checkIn || !checkOut) return false
      
      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      checkInDate.setHours(0, 0, 0, 0)
      checkOutDate.setHours(0, 0, 0, 0)
      
      // Guest is currently staying (checked in and not yet checked out)
      if (booking.status === "confirmed" && checkInDate <= now && checkOutDate > now) {
        return true
      }
      
      return false
    })

    // Check for future reservations (reserved status)
    const futureReservation = bookings.find((booking) => {
      if (booking.roomId !== room.id) return false
      if (booking.status === "cancelled") return false
      
      const checkIn = toDate(booking.checkIn || booking.checkInDate)
      if (!checkIn) return false
      
      const checkInDate = new Date(checkIn)
      checkInDate.setHours(0, 0, 0, 0)
      
      // Has a confirmed/pending booking in the future (reserved for future date)
      if ((booking.status === "confirmed" || booking.status === "pending") && checkInDate > now) {
        return true
      }
      
      return false
    })

    // Priority: maintenance > occupied > reserved > available
    if (room.status === "maintenance") return "maintenance"
    if (activeBooking) return "occupied"
    if (futureReservation) return "reserved"
    return "available"
  }

  const statusCounts = rooms.reduce(
    (acc, room) => {
      const actualStatus = calculateRoomStatus(room)
      acc[actualStatus] = (acc[actualStatus] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/20 text-green-700 dark:text-green-300"
      case "occupied":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-300"
      case "maintenance":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
      case "reserved":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-300"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <Card className="glass-card border-0 animate-fade-in">
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-0 animate-fade-in-up animation-delay-400">
      <CardHeader className="bg-gradient-to-br from-white/95 to-background-accent/20">
        <CardTitle className="font-display text-slate-900">Room Status</CardTitle>
        <CardDescription>Real-time status based on current bookings</CardDescription>
      </CardHeader>
      <CardContent className="bg-white/95">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count], index) => (
              <div 
                key={status} 
                className="glass-button p-4 rounded-lg animate-fade-in-scale"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize font-medium">{status}</span>
                  <Badge className={`${getStatusColor(status)} glass font-semibold`}>{count}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Rooms</span>
              <span className="font-semibold">{rooms.length}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Room Types</span>
              <span className="font-semibold">{roomTypes.length}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Active Bookings</span>
              <span className="font-semibold">{bookings.filter(b => b.status !== 'cancelled').length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
