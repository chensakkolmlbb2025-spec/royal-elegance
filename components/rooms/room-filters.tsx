"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter } from "lucide-react"
import type { RoomType } from "@/lib/types"

interface RoomFiltersProps {
  roomTypes: RoomType[]
  onFilterChange: (filters: {
    roomTypeId: string | null
    guests: number | null
    checkIn: Date | null
    checkOut: Date | null
  }) => void
}

export function RoomFilters({ roomTypes, onFilterChange }: RoomFiltersProps) {
  const [roomTypeId, setRoomTypeId] = useState<string | null>(null)
  const [guests, setGuests] = useState<number | null>(null)
  const [checkIn, setCheckIn] = useState<string>("")
  const [checkOut, setCheckOut] = useState<string>("")

  const handleApplyFilters = () => {
    onFilterChange({ 
      roomTypeId, 
      guests, 
      checkIn: checkIn ? new Date(checkIn) : null, 
      checkOut: checkOut ? new Date(checkOut) : null 
    })
  }

  const handleClearFilters = () => {
    setRoomTypeId(null)
    setGuests(null)
    setCheckIn("")
    setCheckOut("")
    onFilterChange({ roomTypeId: null, guests: null, checkIn: null, checkOut: null })
  }

  return (
    <div className="glass-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Filter Rooms</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Room Type Filter */}
        <div className="space-y-2">
          <Label>Room Type</Label>
          <Select value={roomTypeId || "all"} onValueChange={(value) => setRoomTypeId(value === "all" ? null : value)}>
            <SelectTrigger className="glass-input">
              <SelectValue placeholder="All room types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All room types</SelectItem>
              {roomTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Guests Filter */}
        <div className="space-y-2">
          <Label>Number of Guests</Label>
          <Select
            value={guests?.toString() || "all"}
            onValueChange={(value) => setGuests(value === "all" ? null : Number.parseInt(value))}
          >
            <SelectTrigger className="glass-input">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="1">1 Guest</SelectItem>
              <SelectItem value="2">2 Guests</SelectItem>
              <SelectItem value="3">3 Guests</SelectItem>
              <SelectItem value="4">4+ Guests</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Check-in Date */}
        <div className="space-y-2">
          <Label htmlFor="checkIn">Check-in Date</Label>
          <Input
            id="checkIn"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="glass-input"
          />
        </div>

        {/* Check-out Date */}
        <div className="space-y-2">
          <Label htmlFor="checkOut">Check-out Date</Label>
          <Input
            id="checkOut"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || new Date().toISOString().split("T")[0]}
            className="glass-input"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleApplyFilters} className="flex-1">
          Apply Filters
        </Button>
        <Button onClick={handleClearFilters} variant="outline" className="flex-1 bg-transparent">
          Clear Filters
        </Button>
      </div>
    </div>
  )
}
