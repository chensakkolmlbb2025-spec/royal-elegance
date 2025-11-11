"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, UserCog, Shield, Users, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  email: string
  fullName?: string
  phone?: string
  role: "admin" | "staff" | "user"
  createdAt: Date
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "user" as "admin" | "staff" | "user",
    fullName: "",
    phone: "",
  })

  // Password validation helper
  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
    }
    
    const isStrong = Object.values(requirements).every(Boolean)
    const score = Object.values(requirements).filter(Boolean).length
    
    return { requirements, isStrong, score }
  }
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const supabase = createClient()
      
      // Fetch all profiles with admin or staff role
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'staff', 'user'])
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedUsers: User[] = data.map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role as "admin" | "staff" | "user",
        phone: profile.phone,
        createdAt: new Date(profile.created_at),
      }))

      setUsers(mappedUsers)
    } catch (error) {
      console.error("[UserManagement] Error loading users:", error)
      toast({ title: "Error loading users", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddDialog = () => {
    setEditingId(null)
    setFormData({ email: "", password: "", role: "user", fullName: "", phone: "" })
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.email) {
      toast({ 
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive" 
      })
      return
    }

    if (!editingId) {
      if (!formData.password) {
        toast({ 
          title: "Password required",
          description: "Please enter a password",
          variant: "destructive" 
        })
        return
      }

      const passwordValidation = validatePassword(formData.password)
      if (!passwordValidation.isStrong) {
        const missing = []
        if (!passwordValidation.requirements.length) missing.push("at least 8 characters")
        if (!passwordValidation.requirements.lowercase) missing.push("lowercase letters")
        if (!passwordValidation.requirements.uppercase) missing.push("uppercase letters")
        if (!passwordValidation.requirements.numbers) missing.push("numbers")
        if (!passwordValidation.requirements.special) missing.push("special characters")
        
        toast({ 
          title: "Password requirements not met",
          description: `Password must contain: ${missing.join(", ")}`,
          variant: "destructive" 
        })
        return
      }
    }

    try {
      const supabase = createClient()

      if (editingId) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            role: formData.role,
            full_name: formData.fullName,
            phone: formData.phone,
          })
          .eq('id', editingId)

        if (error) throw error
        toast({ title: "User updated successfully" })
      } else {
        // Create new user with auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              role: formData.role,
              full_name: formData.fullName,
              phone: formData.phone,
            }
          }
        })

        if (authError) throw authError

        // Update profile with role
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              role: formData.role,
              full_name: formData.fullName,
              phone: formData.phone,
            })
            .eq('id', authData.user.id)

          if (profileError) throw profileError
        }

        toast({ 
          title: "User created successfully",
          description: "An email verification link has been sent to the user."
        })
      }

      await loadUsers()
      setIsOpen(false)
      setFormData({ email: "", password: "", role: "user", fullName: "", phone: "" })
    } catch (error: any) {
      console.error("[UserManagement] Error saving user:", error)
      toast({ 
        title: "Error saving user",
        description: error.message || "Unknown error",
        variant: "destructive" 
      })
    }
  }

  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setFormData({
      email: user.email,
      password: "", // Don't show password
      role: user.role as "admin" | "staff",
      fullName: user.fullName || "",
      phone: user.phone || "",
    })
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      const supabase = createClient()

      // Delete user profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({ title: "User deleted successfully" })
      await loadUsers()
    } catch (error: any) {
      console.error("[UserManagement] Error deleting user:", error)
      toast({ 
        title: "Error deleting user",
        description: error.message || "Unknown error",
        variant: "destructive" 
      })
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800"><Shield className="w-3 h-3 mr-1" />Admin</Badge>
      case 'staff':
        return <Badge className="bg-blue-100 text-blue-800"><UserCog className="w-3 h-3 mr-1" />Staff</Badge>
      case 'user':
        return <Badge className="bg-green-100 text-green-800"><User className="w-3 h-3 mr-1" />Customer</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage admin, staff, and customer user accounts</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit User" : "Add New User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingId}
                  placeholder="user@example.com"
                  className="glass"
                />
              </div>
              
              {!editingId && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Strong password required"
                    className="glass"
                  />
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="text-xs space-y-1">
                        {(() => {
                          const validation = validatePassword(formData.password)
                          return (
                            <>
                              <div className={`flex items-center gap-1 ${validation.requirements.length ? 'text-green-600' : 'text-red-500'}`}>
                                {validation.requirements.length ? '✓' : '✗'} 8+ characters
                              </div>
                              <div className={`flex items-center gap-1 ${validation.requirements.lowercase ? 'text-green-600' : 'text-red-500'}`}>
                                {validation.requirements.lowercase ? '✓' : '✗'} Lowercase letter
                              </div>
                              <div className={`flex items-center gap-1 ${validation.requirements.uppercase ? 'text-green-600' : 'text-red-500'}`}>
                                {validation.requirements.uppercase ? '✓' : '✗'} Uppercase letter
                              </div>
                              <div className={`flex items-center gap-1 ${validation.requirements.numbers ? 'text-green-600' : 'text-red-500'}`}>
                                {validation.requirements.numbers ? '✓' : '✗'} Number
                              </div>
                              <div className={`flex items-center gap-1 ${validation.requirements.special ? 'text-green-600' : 'text-red-500'}`}>
                                {validation.requirements.special ? '✓' : '✗'} Special character
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value: "admin" | "staff" | "user") => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">
                      <div className="flex items-center">
                        <UserCog className="w-4 h-4 mr-2" />
                        Staff
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="user">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Customer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (Optional)</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                  className="glass"
                />
              </div>

              <Button type="submit" className="w-full">
                {editingId ? "Update User" : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No staff or admin users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.fullName || "-"}</TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
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
  )
}
