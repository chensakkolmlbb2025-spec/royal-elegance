"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { PremiumFooter } from "@/components/layout/premium-footer"
import Loading from "@/components/ui/loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2,
  Check,
  Bed,
  Square,
  Calendar,
  Star,
  Wifi,
  Coffee,
  Bath,
  Wind,
  Tv,
  Car,
  Utensils,
  Phone,
  Sparkles
} from "lucide-react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import type { RoomType, Room, Service } from "@/lib/types"
import { getRoomTypes, getRooms, getServices } from "@/lib/supabase-service"
import { UnifiedBookingForm } from "@/components/booking/unified-booking-form"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

// Amenity icon mapping
const amenityIcons: Record<string, React.ReactNode> = {
  "wifi": <Wifi className="w-4 h-4" />,
  "free wifi": <Wifi className="w-4 h-4" />,
  "complimentary wifi": <Wifi className="w-4 h-4" />,
  "coffee": <Coffee className="w-4 h-4" />,
  "coffee maker": <Coffee className="w-4 h-4" />,
  "minibar": <Coffee className="w-4 h-4" />,
  "bathtub": <Bath className="w-4 h-4" />,
  "bath": <Bath className="w-4 h-4" />,
  "air conditioning": <Wind className="w-4 h-4" />,
  "ac": <Wind className="w-4 h-4" />,
  "tv": <Tv className="w-4 h-4" />,
  "television": <Tv className="w-4 h-4" />,
  "smart tv": <Tv className="w-4 h-4" />,
  "parking": <Car className="w-4 h-4" />,
  "restaurant": <Utensils className="w-4 h-4" />,
  "room service": <Phone className="w-4 h-4" />,
  "24-hour room service": <Phone className="w-4 h-4" />,
  "spa": <Sparkles className="w-4 h-4" />,
}

const getAmenityIcon = (amenity: string) => {
  const lowerAmenity = amenity.toLowerCase()
  for (const [key, icon] of Object.entries(amenityIcons)) {
    if (lowerAmenity.includes(key)) return icon
  }
  return <Check className="w-4 h-4" />
}

export default function RoomDetailPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const roomTypeSlug = params.roomTypeSlug as string
  const roomId = params.roomId as string

  const [roomType, setRoomType] = useState<RoomType | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)

  // Combine room images with room type images
  const allImages = [
    ...(room?.images || []),
    ...(roomType?.images || [])
  ].filter((img, index, arr) => arr.indexOf(img) === index)

  // Auto-rotate images
  useEffect(() => {
    if (allImages.length > 1 && !isGalleryOpen) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [allImages.length, isGalleryOpen])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null)
    })

    const subscription = (data as any)?.subscription ?? data
    return () => subscription?.unsubscribe?.()
  }, [supabase])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomTypes, allRooms, allServices] = await Promise.all([
          getRoomTypes(),
          getRooms(),
          getServices()
        ])

        const foundRoomType = roomTypes.find(rt => rt.slug === roomTypeSlug)
        const foundRoom = allRooms.find(r => r.id === roomId)
        
        if (!foundRoomType || !foundRoom) {
          router.push('/rooms')
          return
        }

        setRoomType(foundRoomType)
        setRoom(foundRoom)
        setServices(allServices)
        
      } catch (error) {
        console.error("Error fetching room data:", error)
        router.push('/rooms')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [roomTypeSlug, roomId, router])

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
  }, [allImages.length])

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }, [allImages.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGalleryOpen) {
        if (e.key === 'ArrowRight') nextImage()
        else if (e.key === 'ArrowLeft') prevImage()
        else if (e.key === 'Escape') setIsGalleryOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGalleryOpen, nextImage, prevImage])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <PremiumNavbar />
        <main className="container mx-auto px-4 py-8" style={{ marginTop: "112px" }}>
          <Loading message="Loading room details..." variant="content" />
        </main>
        <PremiumFooter />
      </div>
    )
  }

  if (!roomType || !room) {
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <PremiumNavbar />
        <main className="container mx-auto px-4 py-8" style={{ marginTop: "112px" }}>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Room not found</h2>
            <Button onClick={() => router.push('/rooms')}>View All Rooms</Button>
          </div>
        </main>
        <PremiumFooter />
      </div>
    )
  }

  const finalPrice = roomType.basePrice + (room.priceModifier || 0)
  const roomSize = roomType.roomSize || 33 // Default 33 sqm
  const bedType = roomType.bedType || "King"

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <PremiumNavbar />
      
      <main className="pt-24">
        {/* Breadcrumb Navigation */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <button 
              onClick={() => router.push('/rooms')}
              className="hover:text-[#1a1a1a] transition-colors"
            >
              Rooms & Suites
            </button>
            <ChevronRight className="w-4 h-4" />
            <button 
              onClick={() => router.push(`/rooms/${roomTypeSlug}`)}
              className="hover:text-[#1a1a1a] transition-colors"
            >
              {roomType.name}
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#1a1a1a]">Room {room.roomNumber}</span>
          </div>
        </div>

        {/* Hero Section - Raffles Style */}
        <section className="relative">
          {/* Full-width Image Gallery */}
          <div className="relative h-[60vh] lg:h-[70vh] bg-slate-900 overflow-hidden">
            {allImages.length > 0 ? (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={allImages[currentImageIndex] || "/placeholder.svg"}
                      alt={`${roomType.name} - Room ${room.roomNumber}`}
                      fill
                      className="object-cover"
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                {/* Navigation Arrows */}
                {allImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Image Counter & Gallery Button */}
                <div className="absolute bottom-6 right-6 flex items-center gap-3">
                  {allImages.length > 1 && (
                    <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm font-medium">
                      {currentImageIndex + 1}/{allImages.length}
                    </div>
                  )}
                  <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                    <DialogTrigger asChild>
                      <button className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium hover:bg-white/30 transition-all flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" />
                        View Gallery
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 bg-black border-none" showCloseButton={false}>
                      <DialogTitle className="sr-only">
                        {roomType.name} Image Gallery
                      </DialogTitle>
                      <div className="relative h-full flex flex-col">
                        {/* Gallery Header */}
                        <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
                          <h3 className="text-white font-medium">{roomType.name} - Room {room.roomNumber}</h3>
                          <button 
                            onClick={() => setIsGalleryOpen(false)}
                            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Main Gallery Image */}
                        <div className="flex-1 relative">
                          <Image
                            src={allImages[currentImageIndex]}
                            alt={`${roomType.name} - Image ${currentImageIndex + 1}`}
                            fill
                            className="object-contain"
                          />
                          
                          {allImages.length > 1 && (
                            <>
                              <button 
                                onClick={prevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
                              >
                                <ChevronLeft className="w-6 h-6" />
                              </button>
                              <button 
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
                              >
                                <ChevronRight className="w-6 h-6" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Thumbnail Strip */}
                        {allImages.length > 1 && (
                          <div className="h-24 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-2 px-4 overflow-x-auto">
                            {allImages.map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                                  idx === currentImageIndex 
                                    ? 'ring-2 ring-[#d4af37] opacity-100' 
                                    : 'opacity-60 hover:opacity-100'
                                }`}
                              >
                                <Image
                                  src={img}
                                  alt={`Thumbnail ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Back Button */}
                <button 
                  onClick={() => router.back()}
                  className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-100">
                <p className="text-slate-400">No images available</p>
              </div>
            )}
          </div>

          {/* Thumbnail Preview (Below Hero) */}
          {allImages.length > 1 && (
            <div className="container mx-auto px-4 -mt-12 relative z-10">
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {allImages.slice(0, 6).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative w-24 h-20 md:w-32 md:h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all shadow-lg ${
                      idx === currentImageIndex 
                        ? 'border-[#d4af37]' 
                        : 'border-white hover:border-slate-300'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Preview ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                    {idx === 5 && allImages.length > 6 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-medium">+{allImages.length - 6}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Room Details Section - Raffles Style */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Left Column - Room Info */}
              <div className="lg:col-span-2 space-y-8">
                {/* Room Title & Status */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {room.status === "available" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        Available
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 border border-slate-200 font-medium capitalize">
                        {room.status}
                      </Badge>
                    )}
                    <span className="text-sm text-slate-500">Room {room.roomNumber}</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl font-serif text-[#1a1a1a] tracking-tight">
                    {roomType.name}
                  </h1>
                  
                  {/* Tagline */}
                  <p className="text-xl text-slate-600 font-light italic">
                    Your sanctuary of comfort and elegance
                  </p>
                </div>

                {/* Key Details - Raffles Style */}
                <div className="flex flex-wrap gap-6 py-6 border-y border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Guests</p>
                      <p className="font-semibold text-[#1a1a1a]">{roomType.maxOccupancy} guests</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center">
                      <Square className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Room Size</p>
                      <p className="font-semibold text-[#1a1a1a]">{roomSize} m² | {Math.round(roomSize * 10.764)} sq. ft.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center">
                      <Bed className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Bed Type</p>
                      <p className="font-semibold text-[#1a1a1a]">{bedType}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {roomType.description}
                  </p>
                  {room.description && (
                    <p className="text-slate-600 leading-relaxed">
                      {room.description}
                    </p>
                  )}
                </div>

                {/* Features Section - Raffles Style */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37] to-transparent" />
                    <h2 className="text-xs uppercase tracking-[0.2em] text-[#d4af37] font-semibold">
                      Features
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-[#d4af37] to-transparent" />
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {roomType.amenities.map((amenity, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-100 hover:border-[#d4af37]/30 hover:shadow-sm transition-all"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37]">
                          {getAmenityIcon(amenity)}
                        </div>
                        <span className="text-slate-700 font-medium">{amenity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Special Features */}
                  {room.specialFeatures && room.specialFeatures.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm uppercase tracking-wide text-slate-500 mb-4">
                        Room-Specific Features
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {room.specialFeatures.map((feature, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="px-4 py-2 text-sm border-[#d4af37]/30 text-[#d4af37] bg-[#d4af37]/5"
                          >
                            <Star className="w-3 h-3 mr-2" />
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Booking Card */}
              <div className="lg:col-span-1">
                <div className="sticky top-32">
                  <Card className="overflow-hidden shadow-xl border-0">
                    {/* Price Header */}
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white p-6">
                      <div className="space-y-2">
                        <p className="text-sm text-white/70 uppercase tracking-wide">Starting from</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-serif">${finalPrice}</span>
                          <span className="text-white/70">/ night</span>
                        </div>
                        {room.priceModifier && room.priceModifier > 0 && (
                          <p className="text-xs text-[#d4af37]">
                            +${room.priceModifier} premium for this specific room
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <CardContent className="p-6 space-y-6 bg-white">
                      {/* Quick Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-[#d4af37]" />
                          <span>Flexible dates</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>Free cancellation</span>
                        </div>
                      </div>

                      <Separator />

                      {/* Booking Button */}
                      {room.status === "available" ? (
                        <div className="space-y-3">
                          <Button 
                            className="w-full h-12 bg-[#d4af37] hover:bg-[#b8962f] text-white font-semibold text-base shadow-lg shadow-[#d4af37]/25 transition-all"
                            onClick={() => {
                              if (!user) {
                                router.push(`/auth/login?next=${encodeURIComponent(`/rooms/${roomTypeSlug}/${roomId}`)}`)
                              } else {
                                setShowBookingForm(true)
                              }
                            }}
                          >
                            <Calendar className="w-5 h-5 mr-2" />
                            Book Now
                          </Button>
                          <p className="text-center text-xs text-slate-500">
                            Best price guarantee • Instant confirmation
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button 
                            className="w-full h-12"
                            disabled
                          >
                            Room Not Available
                          </Button>
                          <p className="text-center text-sm text-slate-500">
                            This room is currently {room.status}
                          </p>
                        </div>
                      )}

                      <Separator />

                      {/* Contact Info */}
                      <div className="text-center space-y-2">
                        <p className="text-sm text-slate-500">Need assistance?</p>
                        <a 
                          href="tel:+855-23-981-888" 
                          className="text-[#d4af37] font-medium hover:underline flex items-center justify-center gap-2"
                        >
                          <Phone className="w-4 h-4" />
                          +855 23 981 888
                        </a>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trust Badges */}
                  <div className="mt-6 flex justify-center gap-6 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-500" />
                      Secure Booking
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#d4af37]" />
                      5-Star Service
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Booking Form Section */}
        <AnimatePresence>
          {showBookingForm && user && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white border-t border-slate-200"
            >
              <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-serif text-[#1a1a1a] mb-2">Complete Your Reservation</h2>
                    <p className="text-slate-600">Book {roomType.name} - Room {room.roomNumber}</p>
                  </div>
                  <UnifiedBookingForm
                    user={user}
                    roomType={roomType}
                    room={room}
                    services={services}
                    onCancel={() => setShowBookingForm(false)}
                  />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
      
      <PremiumFooter />
    </div>
  )
}
