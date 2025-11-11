"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SeedDatabaseButton() {
  const [isSeeding, setIsSeeding] = useState(false)
  const { toast } = useToast()

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const response = await fetch("/api/seed-database", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: `Database seeded: ${data.results.floors} floors, ${data.results.roomTypes} room types, ${data.results.rooms} rooms, ${data.results.services} services`,
        })
      } else {
        toast({
          title: "Error",
          description: data.message || data.error || "Failed to seed database",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to seed database",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <Button onClick={handleSeed} disabled={isSeeding} className="gap-2">
      {isSeeding ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Seeding Database...
        </>
      ) : (
        <>
          <Database className="h-4 w-4" />
          Seed Database
        </>
      )}
    </Button>
  )
}
