"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, AlertCircle, CheckCircle, XCircle } from "lucide-react"

export function TestCardInfo() {
  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg">Test Mode - Use Test Cards</CardTitle>
        </div>
        <CardDescription>
          Use the following test cards to simulate different payment scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-mono text-sm font-semibold">4242 4242 4242 4242</p>
              <p className="text-xs text-muted-foreground">Success - Payment will complete</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-mono text-sm font-semibold">4000 0000 0000 0002</p>
              <p className="text-xs text-muted-foreground">Decline - Card declined</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-mono text-sm font-semibold">4000 0000 0000 9995</p>
              <p className="text-xs text-muted-foreground">Decline - Insufficient funds</p>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">For all test cards:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Use any future expiration date (e.g., 12/34)</li>
                <li>Use any 3-digit CVC (e.g., 123)</li>
                <li>Use any 5-digit ZIP code (e.g., 12345)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
