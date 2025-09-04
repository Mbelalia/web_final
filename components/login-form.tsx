"use client"

import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabase"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const handleEmailLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message || "Une erreur est survenue lors de la connexion")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
    } catch (error: any) {
      setError(error.message || "Une erreur est survenue avec Google")
      setLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
    } catch (error: any) {
      setError(error.message || "Une erreur est survenue avec Apple")
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md lg:max-w-md xl:max-w-md mx-auto">
      {/* Main Card */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl sm:rounded-3xl lg:rounded-[2rem] p-6 sm:p-8 lg:p-10 xl:p-12 shadow-2xl shadow-primary/5">
        <div className="text-center mb-6 lg:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 lg:mb-4">Bon retour parmi nous</h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Connectez-vous pour accéder à votre tableau de bord
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-2xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 sm:space-y-4 lg:space-y-5 mb-6 lg:mb-8">
          <button 
            onClick={handleAppleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 lg:gap-4 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 bg-black text-white rounded-xl sm:rounded-2xl lg:rounded-3xl font-medium hover:bg-black/90 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none text-sm sm:text-base lg:text-lg"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
            </svg>
            Continuer avec Apple
          </button>
          
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 lg:gap-4 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 bg-white text-gray-900 border border-border rounded-xl sm:rounded-2xl lg:rounded-3xl font-medium hover:bg-gray-50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none text-sm sm:text-base lg:text-lg"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              <path fill="#34A853" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              <path fill="#FBBC05" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              <path fill="#EA4335" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
            Continuer avec Google
          </button>
        </div>

        {/* Divider */}
        <div className="relative text-center text-sm lg:text-base text-muted-foreground mb-6 lg:mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50"></div>
          </div>
          <div className="relative bg-card px-4 lg:px-6">
            Ou continuer avec votre email
          </div>
        </div>

        {/* Email Form */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Email Field */}
          <div className="space-y-2 lg:space-y-3">
            <label htmlFor="email" className="text-sm lg:text-base font-medium text-foreground">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 sm:left-4 lg:left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full pl-10 sm:pl-12 lg:pl-16 pr-3 sm:pr-4 lg:pr-6 py-3 sm:py-4 lg:py-5 bg-muted/50 border border-border rounded-xl sm:rounded-2xl lg:rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 disabled:opacity-50 text-sm sm:text-base lg:text-lg"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2 lg:space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm lg:text-base font-medium text-foreground">
                Mot de passe
              </label>
              <button
                type="button"
                className="text-xs sm:text-sm lg:text-base text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 sm:left-4 lg:left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full pl-10 sm:pl-12 lg:pl-16 pr-10 sm:pr-12 lg:pr-16 py-3 sm:py-4 lg:py-5 bg-muted/50 border border-border rounded-xl sm:rounded-2xl lg:rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 disabled:opacity-50 text-sm sm:text-base lg:text-lg"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 sm:right-4 lg:right-5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleEmailLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground py-3 sm:py-4 lg:py-5 rounded-xl sm:rounded-2xl lg:rounded-3xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2 lg:gap-3 text-sm sm:text-base lg:text-lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-4 sm:mt-6 lg:mt-8">
          <p className="text-sm lg:text-base text-muted-foreground">
            Vous n'avez pas de compte ?{" "}
            <button 
              onClick={() => router.push('/sign-up')}
              className="text-primary hover:underline font-medium"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>

      {/* Terms */}
      <div className="text-center mt-4 sm:mt-6 lg:mt-8">
        <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          En vous connectant, vous acceptez nos{" "}
          <button className="text-primary hover:underline">
            Conditions d'utilisation
          </button>{" "}
          et notre{" "}
          <button className="text-primary hover:underline">
            Politique de confidentialité
          </button>
        </p>
      </div>
    </div>
  )
}