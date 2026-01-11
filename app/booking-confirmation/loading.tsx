import Loading from "@/components/ui/loading"
import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { PremiumFooter } from "@/components/layout/premium-footer"

export default function BookingConfirmationLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-accent/5 to-background">
      <PremiumNavbar />
      <Loading message="Loading confirmation..." variant="content" />
      <PremiumFooter />
    </div>
  )
}
