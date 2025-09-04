"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Tag } from 'lucide-react'

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

interface RecentMovementsTableProps {
  movements: Movement[];
  apartments: ApartmentSummary[];
  onCreateMovement: () => void;
}

export const RecentMovementsTable: React.FC<RecentMovementsTableProps> = ({ 
  movements, 
  apartments, 
  onCreateMovement 
}) => {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border/30">
        <h2 className="text-xl font-semibold text-foreground mb-1">Mouvements Récents</h2>
        <p className="text-muted-foreground">Derniers déplacements effectués avec catégories</p>
      </div>
      
      <div className="p-6">
        {movements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border/30">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Produit</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Catégorie</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Destination</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Quantité</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Valeur TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {movements.map((movement: Movement) => {
                  const apartmentName = apartments.find((apt: ApartmentSummary) => apt.apartment.id === movement.apartment_id)?.apartment.name || 'Appartement supprimé'
                  
                  return (
                    <tr key={movement.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 text-muted-foreground font-medium">
                        {new Date(movement.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-foreground font-medium">
                            {movement.product_name || 'Produit supprimé'}
                          </p>
                          {movement.product_reference && (
                            <p className="text-xs text-muted-foreground">Réf: {movement.product_reference}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {movement.product_category && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 w-fit text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {movement.product_category}
                            </Badge>
                          )}
                          {movement.product_subcategory && (
                            <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 w-fit text-xs">
                              {movement.product_subcategory}
                            </Badge>
                          )}
                          {!movement.product_category && !movement.product_subcategory && (
                            <span className="text-xs text-muted-foreground">Non catégorisé</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{apartmentName}</td>
                      <td className="p-4">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {movement.quantity}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-emerald-400 font-bold text-lg">
                          €{((movement.pricettc || 0) * movement.quantity).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ArrowRight className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucun mouvement récent</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Commencez à déplacer des produits vers vos appartements pour voir l'historique ici.
            </p>
            <Button 
              onClick={onCreateMovement} 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Créer un mouvement
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}