"use client"

import { Wifi, Utensils, Dumbbell, Sparkles, Car, Shield } from "lucide-react"

const features = [
  {
    icon: Wifi,
    title: "High-Speed WiFi",
    description: "Stay connected with complimentary ultra-fast internet throughout the property",
  },
  {
    icon: Utensils,
    title: "Fine Dining",
    description: "Michelin-starred cuisine and 24/7 room service at your fingertips",
  },
  {
    icon: Dumbbell,
    title: "Wellness Center",
    description: "State-of-the-art fitness facilities and rejuvenating spa treatments",
  },
  {
    icon: Sparkles,
    title: "Luxury Amenities",
    description: "Premium toiletries, plush linens, and thoughtful touches in every room",
  },
  {
    icon: Car,
    title: "Valet Service",
    description: "Complimentary valet parking and luxury airport transfers available",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Advanced security systems ensuring your safety and privacy",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-display font-bold mb-4 text-balance">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Unmatched Amenities
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Every detail crafted to perfection for an extraordinary experience
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group p-8 rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
