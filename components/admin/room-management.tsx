"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { getRooms, getFloors, getRoomTypes, addRoom, updateRoom, deleteRoom } from "@/lib/supabase-service"
import type { Room, Floor, RoomType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useRoomDelete } from "@/hooks/use-delete-operation"

export function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    roomNumber: string
    floorId: string
    roomTypeId: string
    status: Room["status"]
  }>({
    roomNumber: "",
    floorId: "",
    roomTypeId: "",
    status: "available",
  })
  const { toast } = useToast()

  // Refresh function for delete hook
  const refreshRooms = useCallback(async () => {
    const roomsData = await getRooms()
    setRooms(roomsData)
  }, [])

  // Delete operation with confirmation dialog, dependency check, and audit logging
  const deleteOperation = useRoomDelete(deleteRoom, refreshRooms)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [roomsData, floorsData, roomTypesData] = await Promise.all([
          getRooms(),
          getFloors(),
          getRoomTypes()
        ])
        setRooms(roomsData)
        setFloors(floorsData)
        setRoomTypes(roomTypesData)
      } catch (error) {
        console.error("[RoomManagement] Error fetching data:", error)
        toast({
          title: "Error loading data",
          description: "Please try refreshing the page.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editingId) {
        await updateRoom(editingId, formData)
        toast({ title: "Room updated successfully" })
      } else {
        await addRoom(formData)
        toast({ title: "Room added successfully" })
      }
      await refreshRooms()
      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error("[RoomManagement] Error saving room:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast({
        title: "Error saving room",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (room: Room) => {
    setEditingId(room.id)
    setFormData({
      roomNumber: room.roomNumber,
      floorId: room.floorId,
      roomTypeId: room.roomTypeId,
      status: room.status,
    })
    setIsOpen(true)
  }

  // Handle delete - uses the new delete operation hook with confirmation
  const handleDelete = (room: Room) => {
    deleteOperation.initiateDelete(room.id, `Room ${room.roomNumber}`)
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({ roomNumber: "", floorId: "", roomTypeId: "", status: "available" })
  }

  const getFloorName = (floorId: string) => floors.find((f) => f.id === floorId)?.name || "Unknown"
  const getRoomTypeName = (roomTypeId: string) => roomTypes.find((rt) => rt.id === roomTypeId)?.name || "Unknown"

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

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteOperation.state.isDialogOpen}
        onOpenChange={deleteOperation.setDialogOpen}
        onConfirm={deleteOperation.confirmDelete}
        title="Delete Room"
        itemName={deleteOperation.state.itemToDelete?.name || ""}
        itemType="Room"
        description="This will remove the room from the system. Are you sure?"
        dependencies={deleteOperation.state.dependencies}
        willSoftDelete={deleteOperation.state.willSoftDelete}
        isLoading={deleteOperation.state.isLoading}
        variant="danger"
      />

      <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Room Management</CardTitle>
          <CardDescription>Manage individual rooms and their status</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Room" : "Add New Room"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  required
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floorId">Floor</Label>
                <Select
                  value={formData.floorId}
                  onValueChange={(value) => setFormData({ ...formData, floorId: value })}
                >
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {floors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomTypeId">Room Type</Label>
                <Select
                  value={formData.roomTypeId}
                  onValueChange={(value) => setFormData({ ...formData, roomTypeId: value })}
                >
                  <SelectTrigger className="glass">
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((roomType) => (
                      <SelectItem key={roomType.id} value={roomType.id}>
                        {roomType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update Room" : "Add Room"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Number</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.roomNumber}</TableCell>
                <TableCell>{getFloorName(room.floorId)}</TableCell>
                <TableCell>{getRoomTypeName(room.roomTypeId)}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(room.status)}>{room.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(room)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(room)}
                      disabled={deleteOperation.state.isLoading}
                    >
                      {deleteOperation.state.isLoading && deleteOperation.state.itemToDelete?.id === room.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </>
  )
}
