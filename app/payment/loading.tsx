import { PremiumNavbar } from "@/components/layout/premium-navbar"
import { PremiumFooter } from "@/components/layout/premium-footer"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-accent/5 to-background">
      <PremiumNavbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Processing payment...</p>
        </div>
      </div>
      <PremiumFooter />
    </div>
  )
}
