"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getRooms, getRoomTypes } from "@/lib/supabase-service"
import type { Room, RoomType } from "@/lib/types"

export function RoomStatusOverview() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, roomTypesData] = await Promise.all([getRooms(), getRoomTypes()])
        setRooms(roomsData)
        setRoomTypes(roomTypesData)
      } catch (error) {
        console.error("Error fetching room status data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const statusCounts = rooms.reduce(
    (acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1
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
        <CardDescription>Current status of all rooms</CardDescription>
      </CardHeader>
      <CardContent className="bg-white/95">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(statusCounts).map(([status, count], index) => (
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
