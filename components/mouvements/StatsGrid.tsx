"use client"

import React from 'react'
import { Building2, Package, DollarSign, Calendar } from 'lucide-react'

interface Movement {
  id: string
  product_id: string
  apartment_id: string
  quantity: number
  priceht: number
  pricettc: number
  created_at: string
  product_name?: string
  product_description?: string
  user_id: string
  product?: any
  apartment?: any
  product_category?: string
  product_subcategory?: string
  product_reference?: string
}

interface Apartment {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  user_id: string
}

interface ApartmentSummary {
  apartment: Apartment
  totalItems: number
  totalValueHT: number
  totalValueTTC: number
  itemCount: number
}

interface StatsGridProps {
  apartments: ApartmentSummary[];
  recentMovements: Movement[];
}

export const StatsGrid: React.FC<StatsGridProps> = ({ apartments, recentMovements }) => {
  const totalValue = apartments.reduce((sum: number, apt: ApartmentSummary) => sum + apt.totalValueTTC, 0)
  const totalItems = apartments.reduce((sum: number, apt: ApartmentSummary) => sum + apt.totalItems, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Appartements</p>
            <p className="text-3xl font-bold text-foreground mb-1">{apartments.length}</p>
            <p className="text-xs text-muted-foreground">Lieux actifs</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Articles déployés</p>
            <p className="text-3xl font-bold text-foreground mb-1">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Total des items</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Valeur totale TTC</p>
            <p className="text-3xl font-bold text-emerald-400 mb-1">€{totalValue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Valeur déployée</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Mouvements récents</p>
            <p className="text-3xl font-bold text-foreground mb-1">{recentMovements.length}</p>
            <p className="text-xs text-muted-foreground">Ce mois-ci</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>
    </div>
  )
}