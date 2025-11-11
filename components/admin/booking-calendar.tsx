"use client"

import { useState, useEffect } from "react"
import { getRooms, getBookings, getRoomTypes } from "@/lib/supabase-service"
import type { Room, Booking, RoomType } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function BookingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all") // Updated default value to "all"
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])

  useEffect(() => {
    const fetchRooms = async () => {
      const fetchedRooms = await getRooms()
      setRooms(fetchedRooms)
    }

    const fetchBookings = async () => {
      const fetchedBookings = await getBookings()
      setBookings(fetchedBookings)
    }

    const fetchRoomTypes = async () => {
      const fetchedRoomTypes = await getRoomTypes()
      setRoomTypes(fetchedRoomTypes)
    }

    fetchRooms()
    fetchBookings()
    fetchRoomTypes()
  }, [])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)

  const previousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const getBookingsForDay = (day: number) => {
    const date = new Date(year, month, day)
    const nextDay = new Date(year, month, day + 1)

    return bookings.filter((booking) => {
      if (selectedRoomId !== "all" && booking.roomId !== selectedRoomId) return false
      if (booking.status === "cancelled") return false

      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)

      return date < checkOut && nextDay > checkIn
    })
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const filteredRooms = selectedRoomId !== "all" ? rooms.filter((r) => r.id === selectedRoomId) : rooms

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Booking Calendar</CardTitle>
            <CardDescription>View all bookings across rooms</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth} className="glass bg-transparent">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="glass bg-transparent">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger className="glass w-64">
              <SelectValue placeholder="All rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rooms</SelectItem> {/* Updated value prop to "all" */}
              {rooms.map((room) => {
                const roomType = roomTypes.find((rt) => rt.id === room.roomTypeId)
                return (
                  <SelectItem key={room.id} value={room.id}>
                    Room {room.roomNumber} - {roomType?.name}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <div className="text-2xl font-display font-bold">
            {monthNames[month]} {year}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayBookings = getBookingsForDay(day)
            const isToday =
              new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year

            return (
              <div
                key={day}
                className={`
                  p-2 rounded-lg border min-h-24
                  ${isToday ? "ring-2 ring-primary" : ""}
                  ${dayBookings.length > 0 ? "bg-accent/20" : "bg-background/50"}
                `}
              >
                <div className="text-sm font-medium mb-1">{day}</div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 2).map((booking) => {
                    const room = rooms.find((r) => r.id === booking.roomId)
                    return (
                      <Badge key={booking.id} variant="secondary" className="text-xs w-full justify-start truncate">
                        Room {room?.roomNumber}
                      </Badge>
                    )
                  })}
                  {dayBookings.length > 2 && (
                    <Badge variant="outline" className="text-xs w-full">
                      +{dayBookings.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
