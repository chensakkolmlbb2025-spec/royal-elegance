"use client"

import { validateSupabaseConfig } from "@/lib/supabase-config"
import Link from "next/link"

export function EnvBanner() {
  const ok = validateSupabaseConfig()
  if (ok) return null

  return (
    <div className="w-full bg-amber-100 text-amber-900 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2 text-sm flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
        <span className="font-medium">Supabase is not configured.</span>
        <span>
          Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code className="font-mono">.env.local</code>.
        </span>
        <span className="ml-auto">
          <Link href="/" onClick={(e) => e.stopPropagation()} className="underline hover:no-underline">View setup guide</Link>
          <span className="mx-1">·</span>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline hover:no-underline">Open Supabase Dashboard</a>
        </span>
      </div>
    </div>
  )
}

