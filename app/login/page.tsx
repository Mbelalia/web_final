"use client"

import { ArrowLeft, Zap } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.2),transparent_50%)]"></div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-r from-secondary/20 to-accent/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card transition-all duration-300">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour</span>
        </Link>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full flex flex-col items-center gap-6 lg:gap-8">
          {/* Logo Header with Gradient */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 sm:gap-3 lg:gap-4 mb-4 lg:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-primary to-secondary rounded-xl sm:rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-foreground" />
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                BIMS
              </h1>
            </div>
          </div>
          
          {/* Login Form - Now properly responsive */}
          <LoginForm />
        </div>
      </div>
    </div>
  )
}