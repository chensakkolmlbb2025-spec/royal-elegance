"use client"

import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, DollarSign, Sparkles } from "lucide-react"
import type { Service } from "@/lib/types"

interface ServiceCardProps {
  service: Service
  onBook: (service: Service) => void
}

const categoryIcons: Record<Service['category'], string> = {
  spa: "💆",
  dining: "🍽️",
  transport: "🚗",
  room_service: "🛎️",
  laundry: "👔",
  other: "✨",
}

const categoryColors: Record<Service['category'], string> = {
  spa: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  dining: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  transport: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  room_service: "bg-green-500/20 text-green-700 border-green-500/30",
  laundry: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
  other: "bg-gray-500/20 text-gray-700 border-gray-500/30",
}

// Helper function to get category icon (supports both enum and new categories)
const getCategoryIcon = (service: Service): string => {
  return categoryIcons[service.category] || "📋"
}

// Helper function to get category color (supports both enum and new categories)
const getCategoryColor = (service: Service): string => {
  return categoryColors[service.category] || "bg-gray-500/20 text-gray-700 border-gray-500/30"
}

export function ServiceCard({ service, onBook }: ServiceCardProps) {
  const imageUrl = service.thumbnailUrl || service.images?.[0] || '/placeholder-service.jpg'
  
  return (
    <Card className="bg-white hover:shadow-xl transition-all duration-300 border border-gray-100 rounded-xl overflow-hidden group">
      {/* Clean Image Section */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={service.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Simple Category Icon */}
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-md">
            {getCategoryIcon(service)}
          </div>
        </div>
        
        {/* Availability Status */}
        {!service.available && (
          <div className="absolute top-4 right-4">
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium">
              Unavailable
            </div>
          </div>
        )}
      </div>
      
      {/* Clean Content Section */}
      <div className="p-6 space-y-4">
        {/* Category and Title */}
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            {service.category.replace('_', ' ')}
          </div>
          <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{service.description}</p>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-2xl font-bold text-gray-900">
            ${service.price}
          </div>
          <Button 
            onClick={() => onBook(service)} 
            className="booking-button px-6"
            disabled={!service.available}
            size="sm"
          >
            {service.available ? "Book Now" : "Unavailable"}
          </Button>
        </div>
      </div>
    </Card>
  )
}

