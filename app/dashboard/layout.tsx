"use client"

import React, { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Home, 
  ShoppingCart, 
  Truck, 
  BarChart2, 
  Bell, 
  HelpCircle, 
  ChevronRight, 
  Star,
  Zap,
  Search,
  User,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'

const ModernDashboardLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Vérifier l'authentification
  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser()
      
      if (error || !data?.user) {
        router.push("/login")
      } else {
        setUser(data.user)
      }
      setLoading(false)
    }

    getUser()
  }, [router])
  
  // Gérer le sidebar responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-foreground">Chargement...</p>
        </div>
      </div>
    )
  }
  
  // Éléments de navigation
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <Home size={20} />, badge: null },
    { name: 'Stock', href: "/dashboard/inventaire", icon: <Package size={20} />, badge: null },
    { name: 'Favoris', href: '/dashboard/favorie', icon: <Star size={20} />, badge: null },
    { name: 'Lieu', href: '/dashboard/mouvements', icon: <BarChart2 size={20} />, badge: null },
  ]
  
  // Déconnexion
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }
  
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      
      <div className="relative z-10 grid lg:grid-cols-[280px_1fr] h-screen">
        {/* Overlay mobile */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 z-40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
        
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-50
            bg-card/60 backdrop-blur-xl border-r border-border/50
            transition-all duration-300 ease-in-out
            flex flex-col h-screen overflow-y-auto
            ${sidebarOpen ? 'w-[280px]' : 'w-0 lg:w-[80px]'}
            ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          `}
        >
          {/* En-tête Sidebar */}
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap size={24} className="text-foreground" />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">BIMS</span>
                  <span className="text-sm text-muted-foreground">Gestion de stock</span>
                </div>
              )}
            </Link>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted lg:hidden"
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 py-6 px-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25' 
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                      ${!sidebarOpen && 'justify-center px-3'}
                    `}
                  >
                    <div className={`${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`}>
                      {item.icon}
                    </div>
                    {sidebarOpen && (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border-0">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
            
            {sidebarOpen && (
              <div className="mt-8">
                <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Paramètres
                </h3>
                <div className="space-y-2">
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-muted-foreground rounded-xl hover:bg-muted/50 hover:text-foreground transition-all group"
                  >
                    <Settings size={20} className="group-hover:rotate-45 transition-transform duration-300" />
                    <span className="font-medium">Paramètres</span>
                  </Link>
                  <Link
                    href="/help"
                    className="flex items-center gap-3 px-4 py-3 text-muted-foreground rounded-xl hover:bg-muted/50 hover:text-foreground transition-all"
                  >
                    <HelpCircle size={20} />
                    <span className="font-medium">Aide & Support</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 rounded-xl hover:bg-red-500/10 hover:text-red-300 transition-all group"
                  >
                    <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                    <span className="font-medium">Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </nav>
        </aside>
        
        {/* Contenu principal - No header, just content */}
        <main className="flex flex-col h-screen overflow-hidden">
          {/* Mobile menu button - only show when sidebar is closed on mobile */}
          {isMobile && !sidebarOpen && (
            <div className="p-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <Menu size={20} />
              </button>
            </div>
          )}
          
          {/* Zone de contenu */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default ModernDashboardLayout