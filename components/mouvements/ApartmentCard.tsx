"use client"

import React from 'react'
import { MapPin, Eye } from 'lucide-react'

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

interface ApartmentCardProps {
  apartment: ApartmentSummary;
  onClick: (apartment: ApartmentSummary) => void;
}

export const ApartmentCard: React.FC<ApartmentCardProps> = ({ apartment, onClick }) => {
  return (
    <div 
      className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={() => onClick(apartment)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors mb-1">
              {apartment.apartment.name}
            </h3>
            {apartment.apartment.address && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="line-clamp-1">{apartment.apartment.address}</span>
              </div>
            )}
            {apartment.apartment.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {apartment.apartment.description}
              </p>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 p-3 rounded-xl">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Articles</p>
            <p className="text-xl font-bold text-foreground">{apartment.totalItems}</p>
          </div>
          <div className="bg-muted/30 p-3 rounded-xl">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Valeur TTC</p>
            <p className="text-xl font-bold text-emerald-400">€{apartment.totalValueTTC.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}