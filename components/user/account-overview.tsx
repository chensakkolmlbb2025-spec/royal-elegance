"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Settings, 
  Bell, 
  CreditCard, 
  Shield, 
  Globe, 
  Moon,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Mail,
  Key,
  Users,
  Heart,
  Star
} from "lucide-react"

interface QuickAccessCard {
  title: string
  description: string
  icon: React.ReactNode
  status?: 'complete' | 'incomplete' | 'warning'
  progress?: number
  action: string
  onClick: () => void
}

interface AccountOverviewProps {
  user: any
  onNavigateToTab: (tab: string) => void
}

export function AccountOverview({ user, onNavigateToTab }: AccountOverviewProps) {
  const quickAccessCards: QuickAccessCard[] = [
    {
      title: "Profile Information",
      description: "Update your personal details and contact information",
      icon: <Settings className="w-5 h-5" />,
      status: user?.fullName && user?.phone ? 'complete' : 'incomplete',
      progress: user?.fullName && user?.phone ? 100 : 50,
      action: "Update Profile",
      onClick: () => onNavigateToTab('profile')
    },
    {
      title: "Account Security",
      description: "Password, two-factor authentication, and login sessions",
      icon: <Shield className="w-5 h-5" />,
      status: user?.mfaEnabled ? 'complete' : 'warning',
      progress: user?.mfaEnabled ? 100 : 60,
      action: "Secure Account",
      onClick: () => onNavigateToTab('security')
    },
    {
      title: "Verification Status",
      description: "Verify your email and phone number for better security",
      icon: <CheckCircle className="w-5 h-5" />,
      status: user?.emailVerified && user?.phoneVerified ? 'complete' : 'incomplete',
      progress: (user?.emailVerified ? 50 : 0) + (user?.phoneVerified ? 50 : 0),
      action: "Complete Verification",
      onClick: () => onNavigateToTab('verification')
    },
    {
      title: "Active Sessions",
      description: "Manage your logged-in devices and security sessions",
      icon: <Smartphone className="w-5 h-5" />,
      status: 'complete',
      action: "Manage Sessions",
      onClick: () => onNavigateToTab('sessions')
    }
  ]

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'incomplete':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'incomplete':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Email Status</p>
                <p className="text-sm text-muted-foreground">
                  {user?.emailVerified ? 'Verified' : 'Needs Verification'}
                </p>
              </div>
              {getStatusIcon(user?.emailVerified ? 'complete' : 'incomplete')}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Phone Status</p>
                <p className="text-sm text-muted-foreground">
                  {user?.phoneVerified ? 'Verified' : user?.phone ? 'Unverified' : 'Not Added'}
                </p>
              </div>
              {getStatusIcon(user?.phoneVerified ? 'complete' : 'incomplete')}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Two-Factor Auth</p>
                <p className="text-sm text-muted-foreground">
                  {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              {getStatusIcon(user?.mfaEnabled ? 'complete' : 'warning')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickAccessCards.map((card, index) => (
          <Card key={index} className="glass-card hover:bg-card/80 transition-colors cursor-pointer" onClick={card.onClick}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {card.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
                {card.status && getStatusIcon(card.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {card.progress !== undefined && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className={`font-medium ${getStatusColor(card.status)}`}>
                      {card.progress}%
                    </span>
                  </div>
                  <Progress value={card.progress} className="h-2" />
                </div>
              )}
              <Button variant="ghost" className="w-full justify-between p-0 h-auto font-normal">
                <span>{card.action}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>Customize your experience and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center w-full">
                <Bell className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Notifications</div>
                  <div className="text-sm text-muted-foreground">Email and push preferences</div>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center w-full">
                <CreditCard className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Payment Methods</div>
                  <div className="text-sm text-muted-foreground">Saved cards and billing</div>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center w-full">
                <Globe className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Language & Region</div>
                  <div className="text-sm text-muted-foreground">Localization settings</div>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center w-full">
                <Moon className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Theme & Display</div>
                  <div className="text-sm text-muted-foreground">Dark mode and UI preferences</div>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center w-full">
                <Heart className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Preferences</div>
                  <div className="text-sm text-muted-foreground">Room and service preferences</div>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center w-full">
                <Star className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Loyalty Program</div>
                  <div className="text-sm text-muted-foreground">Rewards and benefits</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}