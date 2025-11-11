"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import type { RoomType } from "@/lib/types"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface RoomCardProps {
  roomType: RoomType
  onBook: (roomType: RoomType) => void
}

export function RoomCard({ roomType, onBook }: RoomCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/rooms/${roomType.slug}`)
  }

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click when booking
    onBook(roomType)
  }

  return (
    <Card 
      className="bg-white hover:shadow-xl transition-all duration-300 border border-gray-100 rounded-xl overflow-hidden group cursor-pointer" 
      onClick={handleCardClick}
    >
      {/* Clean Image Section */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={roomType.images[0] || "/placeholder.svg?height=400&width=600"}
          alt={roomType.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Simple Price Badge */}
        <div className="absolute top-4 right-4">
          <div className="bg-white px-3 py-1 rounded-full shadow-md">
            <span className="text-lg font-bold text-gray-900">${roomType.basePrice}</span>
            <span className="text-sm text-gray-600">/night</span>
          </div>
        </div>
      </div>

      {/* Clean Content Section */}
      <div className="p-6 space-y-4">
        {/* Title and Description */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{roomType.name}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{roomType.description}</p>
        </div>

        {/* Guest Info */}
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span className="text-sm">Up to {roomType.maxOccupancy} guests</span>
        </div>

        {/* Key Amenities - Simplified */}
        <div className="flex flex-wrap gap-2">
          {roomType.amenities.slice(0, 3).map((amenity) => (
            <span key={amenity} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
              {amenity}
            </span>
          ))}
          {roomType.amenities.length > 3 && (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
              +{roomType.amenities.length - 3} more
            </span>
          )}
        </div>

        {/* Clean Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleCardClick} 
            variant="outline" 
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            View Details
          </Button>
          <Button 
            onClick={handleBookClick} 
            className="flex-1 booking-button"
          >
            Book Now
          </Button>
        </div>
      </div>
    </Card>
  )
}
