# Premium Landing Page & Navbar - Raffles Inspired

## 🎨 Design Philosophy

Inspired by **Raffles Hotel** (https://www.raffles.com/phnom-penh/), this redesign embodies:
- **Timeless Elegance**: Colonial heritage meets modern luxury
- **Minimalist Sophistication**: Clean lines, refined typography
- **Premium Experience**: Every detail speaks luxury

## ✨ New Components

### 1. Premium Navbar (`/components/layout/premium-navbar.tsx`)

**Features:**
- **Dual Layer Design**:
  - Top bar: Contact info (phone, email), sign in/out
  - Main nav: Logo, navigation, CTA button
  
- **Smart Scroll Behavior**:
  - Transparent on hero section
  - Solid white with shadow when scrolled
  - Smooth transitions

- **Typography**:
  - Logo: "ROYAL ELEGANCE" with subtitle "Luxury Hotel & Residences"
  - Uppercase tracking for navigation
  - Clean, sophisticated font display

- **Mobile Responsive**:
  - Hamburger menu
  - Full-screen overlay navigation
  - Touch-friendly buttons

### 2. Premium Hero Section (`/components/landing/premium-hero-section.tsx`)

**Sections Included:**

#### A. Hero Banner (Full Screen)
- Parallax background image
- Soft dark grey gradient overlay (40-60% opacity)
- Animated subtitle badge "Est. 1929 - Historic Luxury"
- Large heading: "YOUR HISTORIC OASIS IN THE HEART OF ELEGANCE"
- Elegant description text
- Dual CTA buttons (solid + outline)
- Animated scroll indicator

#### B. Quick Info Bar
- Dark slate background
- 3 columns: Location, Check-in times, Reservations
- Icon + text layout

#### C. Story Section
- "Our Story" label
- Heritage narrative
- White to slate gradient background
- Centered layout, max-width constrained

#### D. Stats Section
- Dark background with white text
- 4 key metrics: 95+ years, 175 rooms, 4.9 rating, 24/7 service
- Large display numbers with primary color
- Separated by subtle borders

#### E. Featured Rooms Preview
- "Your Stay in Sublime Comfort" heading
- 3 room cards: Deluxe, Executive Suite, Presidential Suite
- Image overlay with gradient
- Guest capacity + room size
- Hover effects
- "View All Rooms" CTA

#### F. Dining Section
- Dark background with image
- "Royal Flavours Crafted with Heritage" heading
- Description + CTA button
- Grid layout (text + image)

#### G. Experiences Grid
- 3 curated experiences: Spa, Butler Service, Cultural Tours
- Icon-based cards
- Glass-card styling
- Hover animations

#### H. Final CTA Section
- Dark gradient background with pattern overlay
- Sparkles icon
- "Begin Your Extraordinary Journey" heading
- Large "Book Your Stay" button

## 🎯 Key Design Elements

### Color Palette
- **Background**: #dec9c3 (warm beige) - eye comfort
- **Primary**: Blue/Primary color
- **Dark Sections**: Slate-900, Slate-800
- **Text**: White on dark, Slate-900 on light
- **Accents**: Primary color for highlights

### Typography
- **Headings**: Font Display, Light/Semibold mix
- **Body**: Clean sans-serif
- **Navigation**: Uppercase, wide tracking
- **Sizes**: 
  - Hero: 5xl to 8xl
  - Sections: 4xl to 5xl
  - Body: lg to xl

### Spacing
- **Sections**: py-24 (consistent rhythm)
- **Container**: max-w-7xl centered
- **Grid gaps**: 8 (2rem)

### Effects
- **Glassmorphism**: Enhanced contrast (95% opacity, thicker borders)
- **Shadows**: shadow-2xl for depth
- **Transitions**: 300-500ms duration
- **Hover**: Scale, translate, shadow changes
- **Animations**: Fade-in, fade-in-up with delays

## 📱 Responsive Design

- **Mobile**: Single column, stacked elements
- **Tablet (md)**: 2-3 columns
- **Desktop (lg)**: Full multi-column layouts
- **Navigation**: Hamburger → Full menu on mobile

## 🚀 Usage

### Homepage
```tsx
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { PremiumHeroSection } from "@/components/landing/premium-hero-section"

<PremiumNavbar />
<PremiumHeroSection />
```

### Other Pages
Apply `PremiumNavbar` to any page for consistent navigation:
```tsx
<PremiumNavbar />
<YourPageContent />
```

## 🎬 Animations

Custom animations added to `globals.css`:
- **fade-in**: Opacity 0 → 1
- **fade-in-up**: Opacity + translateY animation
- **animation-delay-200/400**: Staggered entrance

## ✅ Build Status

- ✅ All components compile successfully
- ✅ No TypeScript errors
- ✅ Mobile responsive
- ✅ Performance optimized
- ✅ Accessibility considered

## 🎨 Raffles-Inspired Features

✅ **Minimalist Navigation** - Clean, uncluttered header
✅ **Large Hero Images** - Full-screen impact
✅ **Elegant Typography** - Font Display with proper hierarchy
✅ **Section Rhythm** - Consistent vertical spacing
✅ **Dark/Light Contrast** - Alternating section backgrounds
✅ **Premium CTAs** - Clear, sophisticated call-to-actions
✅ **Grid Layouts** - Organized, balanced content
✅ **Subtle Animations** - Refined, not distracting
✅ **Heritage Storytelling** - Narrative-driven content
✅ **Experience Focus** - Highlighting unique offerings

## 📝 Notes

- Replace placeholder images with actual hotel photos
- Update contact information (phone, email, address)
- Customize room/suite details
- Add real dining/spa images
- Connect booking system to CTAs
- Add Google Maps integration for location

## 🔄 Future Enhancements

- [ ] Add image gallery/lightbox
- [ ] Integrate booking calendar
- [ ] Add testimonials carousel
- [ ] Implement Instagram feed
- [ ] Add virtual tour section
- [ ] Multi-language support
- [ ] Dark mode variant
