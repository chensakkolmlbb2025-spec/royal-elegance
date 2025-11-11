"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, Award, Sparkles, MapPin, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

export function PremiumHeroSection() {
  const introSection = useScrollAnimation({ threshold: 0.2 })
  const statsSection = useScrollAnimation({ threshold: 0.1 })
  const roomsSection = useScrollAnimation({ threshold: 0.1 })
  const diningSection = useScrollAnimation({ threshold: 0.2 })
  const experiencesSection = useScrollAnimation({ threshold: 0.1 })
  const finalCtaSection = useScrollAnimation({ threshold: 0.2 })

  return (
    <>
      {/* Hero Section - Full Screen with Premium Parallax */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Premium Background with Video-like Effect */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/luxury-hotel-lobby.png')] bg-cover bg-center bg-fixed" />
          {/* Multi-layered gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-slate-950/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          {/* Subtle vignette effect */}
          <div className="absolute inset-0 shadow-inner" style={{
            boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.6)'
          }} />
        </div>

        {/* Animated Premium Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Floating luxury accents */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4af37]/3 rounded-full blur-3xl animate-pulse animation-delay-1000" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          {/* Premium Subtitle Badge */}
          <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full glass mb-6 mt-16z animate-fade-in-scale border border-white/20 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-colors duration-300">
            <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-pulse" />
            <Award className="w-4 h-4 text-[#d4af37]" />
            <span className="text-xs text-white tracking-[0.2em] uppercase font-light">Est. 1929 • Heritage of Excellence</span>
            <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full animate-pulse" />
          </div>

          {/* Premium Main Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-light mb-8 text-white leading-tight tracking-tight animate-fade-in-up drop-shadow-2xl">
            YOUR HISTORIC SANCTUARY
            <br />
            <span className="font-semibold text-transparent bg-gradient-to-r from-white via-white to-[#d4af37] bg-clip-text">
              OF TIMELESS ELEGANCE
            </span>
          </h1>

          {/* Premium Description */}
          <p className="text-lg md:text-xl text-white/85 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200 font-light drop-shadow-lg">
            Where centuries of heritage embrace contemporary refinement. 
            Discover an unparalleled sanctuary of sophistication, impeccable service, 
            and the kind of luxury that transcends expectation.
          </p>

          {/* Premium Accent Line */}
          <div className="flex items-center justify-center gap-4 mb-6 animate-fade-in-up animation-delay-300">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4af37]" />
            <span className="text-[#d4af37] text-xs tracking-[0.15em] uppercase">Experience Excellence</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4af37]" />
          </div>

          {/* Premium CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up animation-delay-400">
            <Link href="/rooms">
              <Button size="lg" className="group text-sm px-10 py-6 rounded-sm bg-white text-slate-900 hover:bg-[#d4af37] border-2 border-white hover:border-[#d4af37] transition-all duration-300 shadow-lg hover:shadow-xl">
                <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                RESERVE YOUR STAY
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/services">
              <Button
                size="lg"
                className="group text-sm px-10 py-6 rounded-sm bg-transparent text-white border-2 border-white/60 hover:bg-white hover:text-slate-900 hover:border-[#d4af37] transition-all duration-300 shadow-lg"
              >
                <Award className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                DISCOVER EXPERIENCES
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex justify-center items-center gap-8 text-white/70 animate-fade-in-up animation-delay-500 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
              <span>5-Star Luxury</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
              <span>95+ Years Heritage</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
              <span>Award-Winning Service</span>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Quick Info Bar */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white py-8 border-y border-[#d4af37]/20 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex items-center justify-center gap-4 group p-4 rounded-lg hover:bg-white/5 transition-all duration-300">
              <div className="p-3 rounded-full bg-[#d4af37]/10 group-hover:bg-[#d4af37]/20 transition-colors">
                <MapPin className="w-6 h-6 text-[#d4af37]" />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-widest text-slate-400 font-light">Location</div>
                <div className="text-sm font-light group-hover:text-[#d4af37] transition-colors">Downtown Historic District</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 group p-4 rounded-lg hover:bg-white/5 transition-all duration-300">
              <div className="p-3 rounded-full bg-[#d4af37]/10 group-hover:bg-[#d4af37]/20 transition-colors">
                <Clock className="w-6 h-6 text-[#d4af37]" />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-widest text-slate-400 font-light">Check-in / Out</div>
                <div className="text-sm font-light group-hover:text-[#d4af37] transition-colors">3:00 PM / 12:00 PM</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 group p-4 rounded-lg hover:bg-white/5 transition-all duration-300">
              <div className="p-3 rounded-full bg-[#d4af37]/10 group-hover:bg-[#d4af37]/20 transition-colors">
                <Calendar className="w-6 h-6 text-[#d4af37]" />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-widest text-slate-400 font-light">Reservations</div>
                <div className="text-sm font-light group-hover:text-[#d4af37] transition-colors">+1 (234) 567-890</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Intro Section */}
      <section 
        ref={introSection.ref}
        className="py-32 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden"
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-3">
          <div style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #d4af37 1px, transparent 0)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Decorative top element */}
            <div className={`flex justify-center mb-10 ${introSection.isVisible ? 'scroll-fade-in' : ''}`}>
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            </div>

            <div className="text-center">
              <span className={`text-xs uppercase tracking-[0.2em] text-[#d4af37] font-light mb-6 block ${introSection.isVisible ? 'scroll-fade-in scroll-stagger-1' : ''}`}>Our Heritage</span>
              <h2 className={`text-4xl md:text-5xl lg:text-6xl font-display font-light mb-12 text-slate-900 leading-tight ${introSection.isVisible ? 'scroll-fade-in-up scroll-stagger-2' : ''}`}>
                Where <span className="text-[#d4af37] font-semibold">Timeless Heritage</span> Meets <span className="font-semibold">Modern Luxury</span>
              </h2>
              <p className={`text-base md:text-lg text-slate-600 leading-relaxed mb-6 font-light ${introSection.isVisible ? 'scroll-fade-in-up scroll-stagger-3' : ''}`}>
                Since 1929, our hotel has stood as an enduring beacon of refined elegance and impeccable service. 
                Meticulously restored to honour colonial grandeur while embracing contemporary comfort, 
                we offer an experience that reveres tradition while celebrating innovation.
              </p>
              <p className={`text-base md:text-lg text-slate-600 leading-relaxed font-light ${introSection.isVisible ? 'scroll-fade-in-up scroll-stagger-4' : ''}`}>
                Every detail—from our exquisitely appointed rooms to our award-winning culinary experiences—
                is designed to create moments of sublime tranquility and memories that endure a lifetime.
              </p>

              {/* Decorative bottom element */}
              <div className={`flex justify-center mt-10 ${introSection.isVisible ? 'scroll-fade-in' : ''}`}>
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Stats Section */}
      <section 
        ref={statsSection.ref}
        className="py-32 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className={`text-xs uppercase tracking-[0.2em] text-[#d4af37] font-light ${statsSection.isVisible ? 'scroll-fade-in' : ''}`}>Excellence by Numbers</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
            {[
              { value: "95", label: "Years of Excellence", suffix: "+" },
              { value: "175", label: "Luxury Rooms & Suites", suffix: "" },
              { value: "4.9", label: "Guest Rating", suffix: "/5" },
              { value: "24/7", label: "Butler Service", suffix: "" },
            ].map((stat, index) => (
              <div
                key={index}
                className={`text-center group relative ${statsSection.isVisible ? 'scroll-scale-up' : ''}`}
                style={{ animationDelay: statsSection.isVisible ? `${index * 0.15}s` : undefined }}
              >
                {/* Decorative background */}
                <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                
                <div className="py-8 md:py-12">
                  <div className="text-6xl md:text-7xl font-display font-light text-[#d4af37] mb-3 group-hover:scale-110 transition-transform duration-300">
                    {stat.value}
                    <span className="text-3xl md:text-4xl text-white/70">{stat.suffix}</span>
                  </div>
                  <div className="text-xs md:text-sm uppercase tracking-wider text-slate-400 font-light group-hover:text-white transition-colors">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Featured Rooms Preview */}
      <section 
        ref={roomsSection.ref}
        className="py-32 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden"
      >
        {/* Decorative top line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />

        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className={`text-xs uppercase tracking-[0.2em] text-[#d4af37] font-light mb-6 block ${roomsSection.isVisible ? 'scroll-fade-in' : ''}`}>Accommodations</span>
            <h2 className={`text-4xl md:text-5xl lg:text-6xl font-display font-light mb-8 text-slate-900 leading-tight ${roomsSection.isVisible ? 'scroll-fade-in-up scroll-stagger-1' : ''}`}>
              Your Stay in <span className="font-semibold">Supreme Comfort</span>
            </h2>
            <p className={`text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-light ${roomsSection.isVisible ? 'scroll-fade-in-up scroll-stagger-2' : ''}`}>
              An exquisite fusion of authentic heritage and contemporary luxury in every meticulously designed room and suite
            </p>
          </div>

          {/* Premium Room Cards */}
          <div className="grid md:grid-cols-3 gap-10 mb-16">
            {[
              { name: "Deluxe Room", size: "35 sqm", guests: "2", image: "/room-deluxe.jpg" },
              { name: "Executive Suite", size: "65 sqm", guests: "4", image: "/room-suite.jpg" },
              { name: "Presidential Suite", size: "120 sqm", guests: "6", image: "/room-presidential.jpg" },
            ].map((room, index) => (
              <div
                key={index}
                className={`group glass-card overflow-hidden border border-white/50 hover:border-[#d4af37] transition-all duration-500 shadow-lg hover:shadow-2xl ${roomsSection.isVisible ? 'scroll-fade-in-up' : ''}`}
                style={{ animationDelay: roomsSection.isVisible ? `${index * 0.15}s` : undefined }}
              >
                <div className="relative h-72 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/95" />
                  <div className="absolute inset-0 bg-[#d4af37]/0 group-hover:bg-[#d4af37]/15 transition-all duration-500" />
                  
                  {/* Room info overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-8">
                    <h3 className="text-3xl font-display font-light text-white mb-3 group-hover:text-[#d4af37] transition-colors duration-300">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-4 text-white/80 text-sm font-light">
                      <span className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#d4af37] rounded-full" />
                        {room.guests} Guests
                      </span>
                      <span className="text-[#d4af37]">•</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#d4af37] rounded-full" />
                        {room.size}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-8 bg-white/95 backdrop-blur-sm">
                  <p className="text-slate-600 text-sm mb-6 line-clamp-3 font-light leading-relaxed">
                    Exquisitely appointed with premium amenities, air-conditioning, elegant fixtures, and authentic colonial charm blended with modern convenience.
                  </p>
                  <Button variant="link" className="p-0 text-[#d4af37] hover:text-slate-900 group-hover:gap-3 transition-all font-light">
                    Explore Details
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/rooms">
              <Button size="lg" variant="outline" className="rounded-sm px-12 py-6 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white hover:border-[#d4af37] transition-all duration-300">
                VIEW ALL ROOMS & SUITES
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Premium Dining Section */}
      <section 
        ref={diningSection.ref}
        className="py-32 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#d4af37]/3 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className={`text-xs uppercase tracking-[0.2em] text-[#d4af37] font-light mb-6 block ${diningSection.isVisible ? 'scroll-fade-in' : ''}`}>Culinary Excellence</span>
              <h2 className={`text-4xl md:text-5xl lg:text-6xl font-display font-light mb-8 ${diningSection.isVisible ? 'scroll-fade-in-left' : ''}`}>
                Royal Flavours <span className="font-semibold text-transparent bg-gradient-to-r from-[#d4af37] to-white bg-clip-text">Crafted with Heritage</span>
              </h2>
              <p className={`text-base md:text-lg text-slate-300 mb-8 leading-relaxed font-light ${diningSection.isVisible ? 'scroll-fade-in-up scroll-stagger-1' : ''}`}>
                Experience elevated culinary artistry in our signature restaurants, where time-honoured recipes 
                meet contemporary techniques and the finest ingredients. From intimate fine dining to grand celebratory occasions, 
                each meal is a masterclass in gastronomy and an unforgettable journey for the senses.
              </p>
              <Link href="/services">
                <Button size="lg" className={`rounded-sm border-white text-white hover:bg-white hover:text-slate-900 hover:border-[#d4af37] transition-all duration-300 px-10 py-6 border-2 ${diningSection.isVisible ? 'scroll-fade-in-up scroll-stagger-2' : ''}`}>
                  EXPLORE DINING EXPERIENCES
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className={`relative h-96 bg-gradient-to-br from-slate-800 to-slate-900 rounded-sm overflow-hidden glass-banner border border-white/10 group ${diningSection.isVisible ? 'scroll-fade-in-right' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />
              <div className="absolute inset-0 bg-[#d4af37]/0 group-hover:bg-[#d4af37]/10 transition-all duration-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 text-[#d4af37]/50 mx-auto mb-4" />
                  <p className="text-white/60 text-sm font-light">Culinary Artistry</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Experiences Grid */}
      <section 
        ref={experiencesSection.ref}
        className="py-32 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden"
      >
        {/* Decorative line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className={`text-xs uppercase tracking-[0.2em] text-[#d4af37] font-light mb-6 block ${experiencesSection.isVisible ? 'scroll-fade-in' : ''}`}>Premium Services</span>
            <h2 className={`text-4xl md:text-5xl lg:text-6xl font-display font-light mb-8 text-slate-900 leading-tight ${experiencesSection.isVisible ? 'scroll-fade-in-up scroll-stagger-1' : ''}`}>
              Curated <span className="font-semibold">Experiences</span> & <span className="font-semibold">Encounters</span>
            </h2>
            <p className={`text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-light ${experiencesSection.isVisible ? 'scroll-fade-in-up scroll-stagger-2' : ''}`}>
              Handcrafted services for the discerning traveller and the culturally curious
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: "Spa & Wellness", icon: "💆", desc: "Restorative treatments in a sanctuary of serenity and tranquility" },
              { title: "Butler Service", icon: "🛎️", desc: "24/7 personalized concierge ensuring every moment is perfected" },
              { title: "Cultural Tours", icon: "🏛️", desc: "Discover the rich heritage and stories of our historic city" },
            ].map((exp, index) => (
              <div 
                key={index} 
                className={`glass-card p-10 text-center group cursor-pointer border border-white/50 hover:border-[#d4af37] transition-all duration-500 hover:shadow-xl ${experiencesSection.isVisible ? 'scroll-fade-in-up' : ''}`}
                style={{ animationDelay: experiencesSection.isVisible ? `${index * 0.15}s` : undefined }}
              >
                <div className="text-7xl mb-6 group-hover:scale-125 transition-transform duration-500 group-hover:rotate-6">{exp.icon}</div>
                <h3 className="text-xl md:text-2xl font-display font-light mb-4 text-slate-900 group-hover:text-[#d4af37] transition-colors">
                  {exp.title}
                </h3>
                <p className="text-slate-600 mb-6 font-light leading-relaxed text-sm md:text-base">{exp.desc}</p>
                <Button variant="link" className="text-[#d4af37] hover:text-slate-900 p-0 group-hover:gap-2 transition-all font-light text-sm">
                  Explore
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Final CTA Section */}
      <section 
        ref={finalCtaSection.ref}
        className="py-40 bg-gradient-to-br from-black via-slate-950 to-black text-white text-center relative overflow-hidden"
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        {/* Floating luxury accents */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-[#d4af37]/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#d4af37]/5 rounded-full blur-3xl animate-pulse animation-delay-1000" />

        <div className={`relative z-10 container mx-auto px-4 ${finalCtaSection.isVisible ? 'scroll-fade-in-up' : ''}`}>
          <Sparkles className={`w-14 h-14 mx-auto mb-8 text-[#d4af37] animate-pulse ${finalCtaSection.isVisible ? 'scroll-fade-in' : ''}`} />
          
          <h2 className={`text-4xl md:text-5xl lg:text-7xl font-display font-light mb-8 leading-tight ${finalCtaSection.isVisible ? 'scroll-fade-in-up scroll-stagger-1' : ''}`}>
            Begin Your <span className="font-semibold text-transparent bg-gradient-to-r from-[#d4af37] to-white bg-clip-text">Extraordinary Journey</span>
          </h2>
          
          <p className={`text-lg md:text-xl text-slate-300 mb-12 max-w-3xl mx-auto font-light leading-relaxed ${finalCtaSection.isVisible ? 'scroll-fade-in-up scroll-stagger-2' : ''}`}>
            Reserve your stay today and discover why discerning guests return to us again and again. 
            Your escape to timeless elegance awaits.
          </p>

          {/* Trust badges */}
          <div className={`flex flex-wrap justify-center gap-6 mb-12 text-xs md:text-sm text-slate-400 font-light ${finalCtaSection.isVisible ? 'scroll-fade-in-up scroll-stagger-3' : ''}`}>
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>5-Star Luxury</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>95+ Years Excellence</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Award-Winning Service</span>
            </div>
          </div>

          <Link href="/rooms">
            <Button size="lg" className={`rounded-sm px-12 py-6 text-base bg-white text-slate-900 hover:bg-[#d4af37] hover:text-black transition-all duration-300 shadow-lg hover:shadow-xl ${finalCtaSection.isVisible ? 'scroll-fade-in-up scroll-stagger-4' : ''}`}>
              <Calendar className="w-4 h-4 mr-2" />
              BOOK YOUR STAY
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
