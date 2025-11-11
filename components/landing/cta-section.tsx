"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20" />
          <div className="absolute inset-0 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-[url('/luxury-hotel-lobby.png')] bg-cover bg-center opacity-10" />

          {/* Content */}
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 text-balance">
              Ready to Experience
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Luxury Living?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance leading-relaxed">
              Book your stay today and discover why guests return to us time and time again
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/rooms">
                <Button size="lg" className="group text-lg px-8 py-6 rounded-full">
                  Book Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 rounded-full backdrop-blur-sm bg-transparent"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
