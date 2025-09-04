"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession()
      
      if (error) {
        console.error("Erreur d'authentification:", error.message)
        router.push("/login?error=auth")
      } else {
        router.push("/dashboard")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-chart-2 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-2">Redirection en cours...</span>
    </div>
  )
}