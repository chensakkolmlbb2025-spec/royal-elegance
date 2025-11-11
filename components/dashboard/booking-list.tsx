"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getBookings, getRooms, getRoomTypes, updateBooking } from "@/lib/supabase-service"
import type { Booking, Room, RoomType } from "@/lib/types"
import { Eye, MoreVertical } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BookingListProps {
  limit?: number
  showActions?: boolean
  bookings?: Booking[]
  rooms?: Room[]
}

export function BookingList({ limit, showActions = true, bookings: propBookings, rooms: propRooms }: BookingListProps) {
  const [bookings, setBookings] = useState<Booking[]>(propBookings || [])
  const [rooms, setRooms] = useState<Room[]>(propRooms || [])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(!propBookings)
  const { toast } = useToast()

  // Update local state when props change
  useEffect(() => {
    if (propBookings) {
      setBookings(propBookings)
      setLoading(false)
    }
  }, [propBookings])

  useEffect(() => {
    if (propRooms) {
      setRooms(propRooms)
    }
  }, [propRooms])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch if no props provided
        if (!propBookings || !propRooms) {
          const promises = []
          
          if (!propBookings) promises.push(getBookings())
          if (!propRooms) promises.push(getRooms())
          promises.push(getRoomTypes())

          const results = await Promise.all(promises)
          
          let index = 0
          if (!propBookings) {
            setBookings(results[index] as Booking[])
            index++
          }
          if (!propRooms) {
            setRooms(results[index] as Room[])
            index++
          }
          setRoomTypes(results[index] as RoomType[])
        } else {
          // Just fetch room types
          const roomTypesData = await getRoomTypes()
          setRoomTypes(roomTypesData)
        }
      } catch (error) {
        console.error("Error fetching booking list data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [propBookings, propRooms])

  const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const displayBookings = limit ? sortedBookings.slice(0, limit) : sortedBookings

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-700 dark:text-green-300"
      case "pending":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
      case "cancelled":
        return "bg-red-500/20 text-red-700 dark:text-red-300"
      case "checked_out":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-300"
      case "no_show":
        return "bg-gray-500/20 text-gray-700 dark:text-gray-300"
      default:
        return ""
    }
  }

  const handleConfirm = async (bookingId: string) => {
    try {
      const updatedBooking = await updateBooking(bookingId, { status: "confirmed" })
      setBookings(bookings.map((b) => (b.id === bookingId ? updatedBooking : b)))
      toast({ title: "Booking confirmed successfully" })
    } catch (error) {
      console.error("Error confirming booking:", error)
      toast({ 
        title: "Error confirming booking", 
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive" 
      })
    }
  }

  const handleCancel = async (bookingId: string) => {
    try {
      const updatedBooking = await updateBooking(bookingId, { status: "cancelled" })
      setBookings(bookings.map((b) => (b.id === bookingId ? updatedBooking : b)))
      toast({ title: "Booking cancelled successfully" })
    } catch (error) {
      console.error("Error cancelling booking:", error)
      
      let errorMessage = "Please try again."
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
      
      toast({ 
        title: "Error cancelling booking", 
        description: errorMessage,
        variant: "destructive" 
      })
    }
  }

  const handleComplete = async (bookingId: string) => {
    try {
      const updatedBooking = await updateBooking(bookingId, { status: "checked_out" })
      setBookings(bookings.map((b) => (b.id === bookingId ? updatedBooking : b)))
      toast({ title: "Booking marked as completed (checked out)" })
    } catch (error) {
      console.error("Error completing booking:", error)
      toast({ 
        title: "Error completing booking", 
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive" 
      })
    }
  }

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const updatedBooking = await updateBooking(bookingId, { status: newStatus as Booking["status"] })
      setBookings(bookings.map((b) => (b.id === bookingId ? updatedBooking : b)))
      toast({ title: `Booking status updated to ${newStatus}` })
    } catch (error) {
      console.error("Error updating booking status:", error)
      toast({ 
        title: "Error updating booking status", 
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive" 
      })
    }
  }

  const getAvailableStatusTransitions = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return ["confirmed", "cancelled"]
      case "confirmed":
        return ["checked_in", "cancelled", "no_show"]
      case "checked_in":
        return ["checked_out", "cancelled"]
      case "checked_out":
        return ["confirmed"] // Allow reopening if needed
      case "cancelled":
        return ["confirmed", "pending"] // Allow reactivation
      case "no_show":
        return ["confirmed", "cancelled"] // Allow reactivation
      default:
        return []
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
    <Card className="glass-card border-0 animate-fade-in-up">
      <CardHeader className="bg-white/95">
        <CardTitle className="font-display text-slate-900">Recent Bookings</CardTitle>
        <CardDescription>Manage and track all reservations</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 8 : 7} className="text-center text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              displayBookings.map((booking) => {
                const room = rooms.find((r) => r.id === booking.roomId)
                const roomType = roomTypes.find((rt) => rt.id === room?.roomTypeId)

                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-xs">#{booking.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{roomType?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">Room {room?.roomNumber || "N/A"}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(booking.checkIn).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(booking.checkOut).toLocaleDateString()}</TableCell>
                    <TableCell>{booking.guests}</TableCell>
                    <TableCell className="font-medium">${booking.totalPrice}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(booking.status)} glass capitalize`}>{booking.status}</Badge>
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="View details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Change status">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-card border-0">
                              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {getAvailableStatusTransitions(booking.status).map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => handleStatusChange(booking.id, status)}
                                  className="capitalize cursor-pointer"
                                >
                                  Mark as {status}
                                </DropdownMenuItem>
                              ))}
                              {getAvailableStatusTransitions(booking.status).length === 0 && (
                                <DropdownMenuItem disabled>No status changes available</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
