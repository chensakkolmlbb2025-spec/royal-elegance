"use client"

import React, { Suspense, useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { getBookingsByUser } from "@/lib/supabase-service"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { ProfileSettings } from "@/components/user/profile-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { 
  User, 
  Settings, 
  Calendar,
  Shield,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  Camera,
  Upload
} from "lucide-react"
import type { Booking } from "@/lib/types"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string | null
  avatar_url: string | null
  email_verified: boolean
  created_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState("profile")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }
        setUser(user)

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        setProfile(profileData)
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) router.push("/login")
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  useEffect(() => {
    if (user?.id) {
      loadBookings()
    }
  }, [user?.id])

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (profile?.avatar_url?.startsWith('blob:')) {
        URL.revokeObjectURL(profile.avatar_url)
      }
    }
  }, [profile?.avatar_url])

  const loadBookings = async () => {
    if (!user?.id) return

    setIsLoadingBookings(true)
    try {
      const userBookings = await getBookingsByUser(user.id)
      setBookings(userBookings.slice(0, 5)) // Show only recent 5 bookings
    } catch (error) {
      console.error("Error loading bookings:", error)
    } finally {
      setIsLoadingBookings(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-700">Confirmed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-700">Pending</Badge>
      case 'checked_out':
        return <Badge className="bg-blue-500/20 text-blue-700">Completed</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-700">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset file input to allow same file selection again
    event.target.value = ''

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, GIF, etc.).",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingAvatar(true)

    try {
      // Clean up previous blob URL if it exists
      if (profile?.avatar_url?.startsWith('blob:')) {
        URL.revokeObjectURL(profile.avatar_url)
      }

      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file)
      
      // Update profile with new avatar URL
      await supabase
        .from("profiles")
        .update({ avatar_url: previewUrl })
        .eq("id", user!.id)

      setProfile(prev => prev ? { ...prev, avatar_url: previewUrl } : null)

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      })

      // Note: In a production app, you would upload the file to cloud storage
      // and use the permanent URL instead of a temporary blob URL
      
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to update avatar.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
        <PremiumNavbar />
        <div className="container mx-auto px-4 py-8" style={{ marginTop: "112px" }}>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <PremiumNavbar />
      <main className="container mx-auto px-4 py-8" style={{ marginTop: "112px" }}>
        <div className="space-y-6">
          {/* Simple Profile Header */}
          <Card className="glass-card-primary">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 ring-4 ring-background shadow-lg">
                    <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "Profile"} />
                    <AvatarFallback className="text-xl font-bold">
                      {profile?.full_name ? getInitials(profile.full_name) : <User className="w-8 h-8" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    title={isUploadingAvatar ? "Uploading..." : "Click to change profile picture"}
                  >
                    {isUploadingAvatar ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                        <span className="text-xs font-medium">Uploading</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Camera className="w-6 h-6" />
                        <span className="text-xs font-medium">Change</span>
                      </div>
                    )}
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="mt-2 text-xs"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        Change Photo
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-center sm:text-left flex-1">
                  <h1 className="text-3xl font-bold mb-2">
                    {profile?.full_name || `${user?.email?.split('@')[0] || 'User'}`}
                  </h1>
                  <p className="text-muted-foreground mb-3">{user?.email}</p>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                    <Badge variant="outline" className="capitalize">
                      {profile?.role || "Guest"}
                    </Badge>
                    {profile?.email_verified ? (
                      <Badge className="bg-green-500/20 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <Clock className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Member since {profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {bookings.length} bookings
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simple Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Bookings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
              <ProfileSettings />
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6 mt-6">
              <Card className="glass-card-accent">
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                          <Skeleton className="w-12 h-12 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-6 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
                      <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                      <p className="text-sm">Your booking history will appear here</p>
                      <Button className="mt-4" onClick={() => router.push('/rooms')}>
                        Browse Rooms
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div key={booking.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                          <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">Booking #{booking.id.slice(-8)}</h4>
                              {getStatusBadge(booking.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
                            </div>
                            <div className="text-sm font-medium text-primary">
                              ${booking.totalPrice}
                            </div>
                          </div>
                        </div>
                      ))}
                      {bookings.length >= 5 && (
                        <Button variant="outline" className="w-full" onClick={() => router.push('/bookings')}>
                          View All Bookings
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

