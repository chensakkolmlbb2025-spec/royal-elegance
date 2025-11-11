"use client"


import { Suspense } from "react"
import { VerifyEmail } from "@/components/auth/verify-email"
import { useSearchParams } from "next/navigation"


function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || undefined
  return <VerifyEmail email={email} />
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}

