"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Booking, Room, RoomType } from "@/lib/types"
import { getRooms, getRoomTypes, updateBooking, checkInBooking, checkOutBooking, markBookingNoShow, cancelBooking } from "@/lib/supabase-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Search, 
  Calendar, 
  User, 
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  LogIn,
  LogOut as LogOutIcon,
  UserX,
  Trash2,
  Filter,
  Download,
  RefreshCw
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    checked_in: "bg-blue-50 text-blue-700 border-blue-200",
    checked_out: "bg-slate-100 text-slate-700 border-slate-200",
    no_show: "bg-orange-50 text-orange-700 border-orange-200",
  }
  
  const labels = {
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
    checked_in: "Checked In",
    checked_out: "Checked Out",
    no_show: "No Show",
  }

  const statusKey = status as keyof typeof styles
  
  return (
    <Badge variant="outline" className={`px-2.5 py-0.5 font-medium border ${styles[statusKey] || styles.pending}`}>
      {labels[statusKey] || status}
    </Badge>
  )
}

export function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "check-in" | "check-out" | "no-show" | "cancel" | "delete" | null
    booking: Booking | null
  }>({ open: false, type: null, booking: null })
  const [detailsOpen, setDetailsOpen] = useState(false)
  
  const supabase = createClient()
  const { toast } = useToast()

  const fetchData = async () => {
    try {
      setLoading(true)
      const [bookingsData, roomsData, roomTypesData] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        getRooms(),
        getRoomTypes()
      ])

      if (bookingsData.error) throw bookingsData.error

      const convertedBookings = bookingsData.data.map((booking: any) => ({
        ...booking,
        id: booking.id,
        createdAt: new Date(booking.created_at),
        updatedAt: new Date(booking.updated_at),
        checkInDate: new Date(booking.check_in_date),
        checkOutDate: new Date(booking.check_out_date),
        checkIn: new Date(booking.check_in_date),
        checkOut: new Date(booking.check_out_date),
        status: booking.status,
        totalPrice: booking.total_price,
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone,
        guestCount: booking.guest_count,
        guests: booking.guest_count,
        bookingReference: booking.booking_reference,
        paymentStatus: booking.payment_status,
        paidAmount: booking.paid_amount,
        roomId: booking.room_id,
        roomTypeId: booking.room_type_id,
        floorId: booking.floor_id,
        userId: booking.user_id,
        bookingType: booking.room_id ? 'room' : 'service',
      })) as Booking[]

      setBookings(convertedBookings)
      setRooms(roomsData)
      setRoomTypes(roomTypesData)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Real-time subscription
    const channel = supabase
      .channel("booking-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleAction = async (type: "check-in" | "check-out" | "no-show" | "cancel" | "delete", booking: Booking) => {
    setActionDialog({ open: true, type, booking })
  }

  const confirmAction = async () => {
    if (!actionDialog.booking || !actionDialog.type) return

    try {
      const bookingId = actionDialog.booking.id

      switch (actionDialog.type) {
        case "check-in":
          await checkInBooking(bookingId)
          toast({ title: "Success", description: "Guest checked in successfully" })
          break
        case "check-out":
          await checkOutBooking(bookingId)
          toast({ title: "Success", description: "Guest checked out successfully. Room is now available." })
          break
        case "no-show":
          await markBookingNoShow(bookingId)
          toast({ title: "Success", description: "Booking marked as no-show. Room is now available." })
          break
        case "cancel":
          await cancelBooking(bookingId)
          toast({ title: "Success", description: "Booking cancelled successfully. Room is now available." })
          break
        case "delete":
          await supabase.from("bookings").delete().eq("id", bookingId)
          toast({ title: "Success", description: "Booking deleted successfully" })
          break
      }

      fetchData()
      setActionDialog({ open: false, type: null, booking: null })
    } catch (error: any) {
      console.error("Action failed:", error)
      toast({
        title: "Error",
        description: error.message || "Action failed. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getRoom = (roomId: string | null) => {
    if (!roomId) return null
    return rooms.find(r => r.id === roomId)
  }

  const getRoomType = (roomTypeId: string | null | undefined) => {
    if (!roomTypeId) return null
    return roomTypes.find(rt => rt.id === roomTypeId)
  }

  const filteredBookings = bookings.filter(booking => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      booking.guestName?.toLowerCase().includes(query) ||
      booking.guestEmail?.toLowerCase().includes(query) ||
      booking.bookingReference?.toLowerCase().includes(query) ||
      getRoom(booking.roomId)?.roomNumber?.toLowerCase().includes(query)
    )
  })

  const upcomingBookings = filteredBookings.filter(b => 
    (b.status === "confirmed" || b.status === "pending") && 
    new Date(b.checkInDate) > new Date()
  )
  
  const activeBookings = filteredBookings.filter(b => 
    b.status === "checked_in"
  )
  
  const completedBookings = filteredBookings.filter(b => 
    b.status === "checked_out"
  )
  
  const cancelledBookings = filteredBookings.filter(b => 
    b.status === "cancelled" || b.status === "no_show"
  )

  const renderBookingRow = (booking: Booking) => {
    const room = getRoom(booking.roomId)
    const roomType = getRoomType(booking.roomTypeId)

    return (
      <TableRow key={booking.id} className="hover:bg-slate-50">
        <TableCell className="font-medium">{booking.bookingReference}</TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="font-medium">{booking.guestName}</div>
            <div className="text-sm text-slate-500">{booking.guestEmail}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm">{roomType?.name || "N/A"}</div>
            <div className="text-xs text-slate-500">
              {room ? `Room ${room.roomNumber}` : "Service only"}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm">{format(new Date(booking.checkInDate), "MMM dd, yyyy")}</div>
            <div className="text-xs text-slate-500">{format(new Date(booking.checkOutDate), "MMM dd, yyyy")}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            <span className="text-sm">{booking.guestCount}</span>
          </div>
        </TableCell>
        <TableCell><StatusBadge status={booking.status} /></TableCell>
        <TableCell className="font-medium">{formatCurrency(booking.totalPrice)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {booking.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("check-in", booking)}
                  className="h-8"
                >
                  <LogIn className="w-3 h-3 mr-1" />
                  Check In
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("cancel", booking)}
                  className="h-8"
                >
                  <XCircle className="w-3 h-3" />
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("check-in", booking)}
                  className="h-8"
                >
                  <LogIn className="w-3 h-3 mr-1" />
                  Check In
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("cancel", booking)}
                  className="h-8"
                >
                  <XCircle className="w-3 h-3" />
                </Button>
              </>
            )}
            {booking.status === "checked_in" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("check-out", booking)}
                  className="h-8"
                >
                  <LogOutIcon className="w-3 h-3 mr-1" />
                  Check Out
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedBooking(booking)
                setDetailsOpen(true)
              }}
              className="h-8"
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Booking Management</h2>
          <p className="text-slate-500 mt-1">Manage all hotel reservations and bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search & Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by guest name, email, booking reference, or room number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-700">{upcomingBookings.length}</div>
              <div className="text-sm text-blue-600">Upcoming</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-700">{activeBookings.length}</div>
              <div className="text-sm text-emerald-600">Active</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-2xl font-bold text-slate-700">{completedBookings.length}</div>
              <div className="text-sm text-slate-600">Completed</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="text-2xl font-bold text-orange-700">{cancelledBookings.length}</div>
              <div className="text-sm text-orange-600">Cancelled/No Show</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="all">All ({filteredBookings.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeBookings.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedBookings.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map(renderBookingRow)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingBookings.map(renderBookingRow)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBookings.map(renderBookingRow)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedBookings.map(renderBookingRow)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelledBookings.map(renderBookingRow)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, type: null, booking: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === "check-in" && "Check In Guest"}
              {actionDialog.type === "check-out" && "Check Out Guest"}
              {actionDialog.type === "no-show" && "Mark as No Show"}
              {actionDialog.type === "cancel" && "Cancel Booking"}
              {actionDialog.type === "delete" && "Delete Booking"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === "check-in" && `Check in ${actionDialog.booking?.guestName}? This will mark the booking as active.`}
              {actionDialog.type === "check-out" && `Check out ${actionDialog.booking?.guestName}? The room will be marked as available.`}
              {actionDialog.type === "no-show" && `Mark ${actionDialog.booking?.guestName}'s booking as no-show? The room will be marked as available.`}
              {actionDialog.type === "cancel" && `Cancel ${actionDialog.booking?.guestName}'s booking? The room will be marked as available.`}
              {actionDialog.type === "delete" && `Permanently delete this booking? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionDialog.type === "delete" ? "Delete" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Booking Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Reference: {selectedBooking?.bookingReference}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Guest Name</label>
                  <p className="text-lg">{selectedBooking.guestName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <p>{selectedBooking.guestEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Phone</label>
                  <p>{selectedBooking.guestPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Check In</label>
                  <p>{format(new Date(selectedBooking.checkInDate), "PPP")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Check Out</label>
                  <p>{format(new Date(selectedBooking.checkOutDate), "PPP")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Room</label>
                  <p>{getRoomType(selectedBooking.roomTypeId)?.name || "N/A"}</p>
                  <p className="text-sm text-slate-500">{getRoom(selectedBooking.roomId)?.roomNumber || "Service only"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Guests</label>
                  <p>{selectedBooking.guestCount} guest(s)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Total Price</label>
                  <p className="text-lg font-semibold text-emerald-600">{formatCurrency(selectedBooking.totalPrice)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Payment Status</label>
                  <p className="capitalize">{selectedBooking.paymentStatus}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
