import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="glass-card border-0 group animate-fade-in-up hover:scale-105 transition-transform duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-white/95 to-background-accent/20">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        <div className="w-10 h-10 rounded-full glass flex items-center justify-center group-hover:border-[#d4af37] transition-colors">
          <Icon className="w-5 h-5 text-[#d4af37] group-hover:scale-110 transition-transform" />
        </div>
      </CardHeader>
      <CardContent className="bg-white/95">
        <div className="text-3xl font-display font-bold text-slate-900 group-hover:text-[#d4af37] transition-colors">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className={`inline-flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded-full glass ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            <span className="font-semibold">{trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
