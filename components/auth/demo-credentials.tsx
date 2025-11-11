"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Crown, Briefcase, User, Copy, Check } from "lucide-react"
import { useState } from "react"

interface DemoAccount {
  role: string
  email: string
  name: string
  icon: React.ReactNode
  color: string
  description: string
  features: string[]
}

const demoAccounts: DemoAccount[] = [
  {
    role: "Admin",
    email: "admin@luxuryhotel.com",
    name: "Admin User",
    icon: <Crown className="h-5 w-5" />,
    color: "bg-purple-500",
    description: "Full administrative access",
    features: [
      "Manage floors, rooms, services",
      "View revenue analytics",
      "Full booking management",
      "Database seeding",
    ],
  },
  {
    role: "Staff",
    email: "staff@luxuryhotel.com",
    name: "Staff Member",
    icon: <Briefcase className="h-5 w-5" />,
    color: "bg-blue-500",
    description: "Staff operations access",
    features: [
      "View bookings & calendar",
      "Manage check-ins/outs",
      "Room status overview",
      "Today's statistics",
    ],
  },
  {
    role: "Guest",
    email: "guest@example.com",
    name: "Guest User",
    icon: <User className="h-5 w-5" />,
    color: "bg-green-500",
    description: "Customer access",
    features: [
      "Browse available rooms",
      "Make bookings",
      "Select services",
      "View booking history",
    ],
  },
]

export function DemoCredentials({ onSelectEmail }: { onSelectEmail?: (email: string) => void }) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const handleUseAccount = (email: string) => {
    if (onSelectEmail) {
      onSelectEmail(email)
    }
  }

  return (
    <Card className="glass border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🎭</span>
          Demo Accounts
        </CardTitle>
        <CardDescription>
          Use any of these accounts to explore the system. Any password works!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {demoAccounts.map((account) => (
          <Card key={account.email} className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`${account.color} p-3 rounded-lg text-white`}>
                  {account.icon}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{account.name}</h3>
                    <Badge variant="outline">{account.role}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{account.description}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                      {account.email}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyEmail(account.email)}
                      className="shrink-0"
                    >
                      {copiedEmail === account.email ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {onSelectEmail && (
                      <Button
                        size="sm"
                        onClick={() => handleUseAccount(account.email)}
                        className="shrink-0"
                      >
                        Use
                      </Button>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Features:</p>
                    <ul className="text-xs space-y-1">
                      {account.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="text-primary">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>💡 Tip:</strong> Enter any password - authentication is mocked for demo purposes!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

