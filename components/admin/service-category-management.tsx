"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  getServiceCategories, 
  addServiceCategory, 
  updateServiceCategory, 
  deleteServiceCategory 
} from "@/lib/supabase-service"
import type { ServiceCategory } from "@/lib/types"

export function ServiceCategoryManagement() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    color: "gray",
  })
  const { toast } = useToast()

  // Load categories from database
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await getServiceCategories()
      setCategories(data)
    } catch (error) {
      console.error("[ServiceCategory] Error loading categories:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // Check if it's a table not found error
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        toast({ 
          title: "Service Categories Table Not Found",
          description: "Please run the migration file: add-service-categories-table.sql in your Supabase SQL Editor",
          variant: "destructive" 
        })
      } else {
        toast({ 
          title: "Error loading categories",
          description: errorMessage,
          variant: "destructive" 
        })
      }
    }
  }

  const handleOpenAddDialog = () => {
    setEditingId(null)
    setFormData({ name: "", description: "", icon: "", color: "gray" })
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Generate slug from name
    const slug = formData.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
    
    if (!slug) {
      toast({ 
        title: "Invalid category name",
        description: "Category name must contain at least one letter or number",
        variant: "destructive" 
      })
      return
    }

    try {
      if (editingId) {
        // Update existing category
        await updateServiceCategory(editingId, {
          name: formData.name,
          slug,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          isDefault: false,
          sortOrder: 0,
        })
        toast({ title: "Category updated successfully" })
      } else {
        // Add new category
        await addServiceCategory({
          name: formData.name,
          slug,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
          isDefault: false,
          sortOrder: categories.length + 1,
        })
        toast({ title: "Category added successfully" })
      }
      setIsOpen(false)
      setFormData({ name: "", description: "", icon: "", color: "gray" })
      loadCategories() // Reload from database
    } catch (error) {
      console.error("[ServiceCategory] Error saving category:", error)
      toast({ 
        title: "Error saving category",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      })
    }
  }

  const handleEdit = (category: ServiceCategory) => {
    setEditingId(category.id)
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      color: category.color,
    })
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    // Check if it's a default category
    const category = categories.find(cat => cat.id === id)
    if (category?.isDefault) {
      toast({ 
        title: "Cannot delete default category",
        description: "Default categories cannot be removed",
        variant: "destructive" 
      })
      return
    }

    try {
      await deleteServiceCategory(id)
      toast({ title: "Category deleted successfully" })
      loadCategories() // Reload from database
    } catch (error) {
      console.error("[ServiceCategory] Error deleting category:", error)
      toast({ 
        title: "Error deleting category",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      })
    }
  }

  const colorOptions = [
    { value: "purple", label: "Purple" },
    { value: "orange", label: "Orange" },
    { value: "blue", label: "Blue" },
    { value: "cyan", label: "Cyan" },
    { value: "green", label: "Green" },
    { value: "pink", label: "Pink" },
    { value: "yellow", label: "Yellow" },
    { value: "red", label: "Red" },
    { value: "gray", label: "Gray" },
  ]

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      purple: "bg-purple-100 text-purple-800",
      orange: "bg-orange-100 text-orange-800",
      blue: "bg-blue-100 text-blue-800",
      cyan: "bg-cyan-100 text-cyan-800",
      green: "bg-green-100 text-green-800",
      pink: "bg-pink-100 text-pink-800",
      yellow: "bg-yellow-100 text-yellow-800",
      red: "bg-red-100 text-red-800",
      gray: "bg-gray-100 text-gray-800",
    }
    return colorMap[color] || colorMap.gray
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Service Categories</CardTitle>
          <CardDescription>Manage service categories and their appearance</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Category" : "Add New Category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Spa & Wellness"
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                  className="glass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🧖"
                  maxLength={2}
                  className="glass text-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-2 rounded border-2 ${
                        formData.color === color.value ? 'border-[#d4af37]' : 'border-transparent'
                      } ${getColorClasses(color.value)}`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update Category" : "Add Category"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg font-semibold mb-2">No categories found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Please apply the database migration first:
            </p>
            <code className="block bg-muted p-4 rounded-lg text-sm">
              Run add-service-categories-table.sql in Supabase SQL Editor
            </code>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="glass overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{category.icon}</span>
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        <Badge className={`mt-1 ${getColorClasses(category.color)}`}>
                          {category.slug}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {!category.isDefault && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
