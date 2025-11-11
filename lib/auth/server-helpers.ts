/**
 * Server-side Auth Utilities
 * Helper functions for authentication in Server Components and API Routes
 */

import { createClient } from '@/lib/supabase/server'

export const authServer = {
  async getUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return null
    }

    return user
  },

  async getSession() {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return null
    }

    return session
  },

  async getUserProfile() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return null
    }

    return profile
  },
}
