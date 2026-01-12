"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { getFloors, addFloor, updateFloor, deleteFloor } from "@/lib/supabase-service"
import type { Floor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useFloorDelete } from "@/hooks/use-delete-operation"

export function FloorManagement() {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", number: 0, description: "" })
  const { toast } = useToast()

  // Refresh function for delete hook
  const refreshFloors = useCallback(async () => {
    try {
      const floorsData = await getFloors()
      setFloors(floorsData)
    } catch (error) {
      console.error("Error fetching floors:", error)
      toast({ 
        title: "Error loading floors", 
        description: "Please ensure the floors table exists and has proper permissions.",
        variant: "destructive" 
      })
    }
  }, [toast])

  // Delete operation with confirmation dialog, dependency check, and audit logging
  const deleteOperation = useFloorDelete(deleteFloor, refreshFloors)

  useEffect(() => {
    const fetchFloors = async () => {
      try {
        const floorsData = await getFloors()
        setFloors(floorsData)
      } catch (error) {
        console.error("Error fetching floors:", error)
        toast({ 
          title: "Error loading floors", 
          description: "Please ensure the floors table exists and has proper permissions. Check the seed-floors.sql file.",
          variant: "destructive" 
        })
      } finally {
        setLoading(false)
      }
    }
    fetchFloors()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editingId) {
        await updateFloor(editingId, formData)
        setFloors(floors.map((f) => (f.id === editingId ? { ...f, ...formData } : f)))
        toast({ title: "Floor updated successfully" })
      } else {
        const newFloor = await addFloor(formData)
        setFloors([...floors, newFloor])
        toast({ title: "Floor added successfully" })
      }
      setIsOpen(false)
      resetForm()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast({ 
        title: "Error saving floor", 
        description: errorMessage,
        variant: "destructive" 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (floor: Floor) => {
    setEditingId(floor.id)
    setFormData({ name: floor.name, number: floor.number, description: floor.description })
    setIsOpen(true)
  }

  // Handle delete - uses the new delete operation hook with confirmation
  const handleDelete = (floor: Floor) => {
    deleteOperation.initiateDelete(floor.id, floor.name)
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({ name: "", number: 0, description: "" })
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
    <>
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteOperation.state.isDialogOpen}
        onOpenChange={deleteOperation.setDialogOpen}
        onConfirm={deleteOperation.confirmDelete}
        title="Delete Floor"
        itemName={deleteOperation.state.itemToDelete?.name || ""}
        itemType="Floor"
        description="This will permanently delete this floor. All rooms on this floor must be moved or deleted first."
        dependencies={deleteOperation.state.dependencies}
        willSoftDelete={deleteOperation.state.willSoftDelete}
        isLoading={deleteOperation.state.isLoading}
        variant="danger"
      />

      <Card className="glass-card border-0 animate-fade-in-up">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-br from-white/95 to-background-accent/20">
        <div>
          <CardTitle className="font-display text-slate-900">Floor Management</CardTitle>
          <CardDescription>Manage hotel floors and levels</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="glass-button hover:border-[#d4af37]">
              <Plus className="w-4 h-4 mr-2" />
              Add Floor
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-0">
            <DialogHeader>
              <DialogTitle className="font-display text-slate-900">{editingId ? "Edit Floor" : "Add New Floor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Floor Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="glass-button"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Floor Number</Label>
                <Input
                  id="number"
                  type="number"
                  value={formData.number || 0}
                  onChange={(e) => setFormData({ ...formData, number: Number.parseInt(e.target.value) || 0 })}
                  required
                  className="glass-button"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass-button"
                />
              </div>
              <Button type="submit" className="w-full glass-button hover:border-[#d4af37]">
                {editingId ? "Update Floor" : "Add Floor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {floors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No floors found. Add your first floor to get started.
                </TableCell>
              </TableRow>
            ) : (
              floors.map((floor) => (
                <TableRow key={floor.id}>
                  <TableCell className="font-medium">{floor.name}</TableCell>
                  <TableCell>{floor.number}</TableCell>
                  <TableCell>{floor.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(floor)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(floor)}
                        disabled={deleteOperation.state.isLoading}
                      >
                        {deleteOperation.state.isLoading && deleteOperation.state.itemToDelete?.id === floor.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </>
  )
}
