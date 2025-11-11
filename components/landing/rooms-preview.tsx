"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Maximize } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const roomTypes = [
  {
    name: "Deluxe Room",
    description: "Elegant comfort with stunning city views",
    price: 299,
    image: "/luxury-hotel-deluxe-room.png",
    maxOccupancy: 2,
    size: "35 m²",
  },
  {
    name: "Executive Suite",
    description: "Spacious luxury with separate living area",
    price: 499,
    image: "/luxury-hotel-executive-suite.jpg",
    maxOccupancy: 4,
    size: "65 m²",
  },
  {
    name: "Presidential Suite",
    description: "Ultimate opulence with panoramic views",
    price: 999,
    image: "/luxury-hotel-presidential-suite.png",
    maxOccupancy: 6,
    size: "120 m²",
  },
]

export function RoomsPreview() {
  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-display font-bold mb-4 text-balance">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Exquisite Accommodations
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Choose from our carefully curated selection of rooms and suites
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {roomTypes.map((room) => (
            <div
              key={room.name}
              className="group rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={room.image || "/placeholder.svg"}
                  alt={room.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{room.maxOccupancy} Guests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" />
                      <span>{room.size}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-semibold mb-2">{room.name}</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">{room.description}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-primary">${room.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/night</span>
                  </div>
                  <Button variant="outline" size="sm" className="group/btn bg-transparent">
                    View Details
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/rooms">
            <Button size="lg" className="text-lg px-8 py-6 rounded-full">
              View All Rooms
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
