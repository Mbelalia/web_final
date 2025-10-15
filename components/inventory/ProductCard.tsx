"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Edit, ExternalLink, Tag, Trash2 } from 'lucide-react'

interface GroupedProduct {
  id: string;
  name: string;
  description?: string | null;
  currentStock: number;
  imageUrl?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  reference?: string | null;
  priceHT?: number | null;
  priceTTC?: number | null;
  url?: string | null;
  user_id: string;
  favorite?: boolean;
  category_name?: string;
  subcategory_name?: string;
  groupedIds?: string[];
  originalProducts?: any[];
}

interface ProductCardProps {
  product: GroupedProduct;
  onEdit: (id: string) => void;
  onDelete: (product: GroupedProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
  const stockStatus = product.currentStock === 0 ? 'out' : product.currentStock < 10 ? 'low' : 'good'

  return (
      <div className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{product.name}</h3>
              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                {product.description || 'Aucune description'}
              </p>
              {product.reference && (
                  <p className="text-xs text-muted-foreground">Réf: {product.reference}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {product.url && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(product.url!, '_blank', 'noopener,noreferrer')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/10"
                >
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                </Button>
            )}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(product.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(product)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stock actuel</span>
            <Badge
                variant={stockStatus === 'out' ? 'destructive' : stockStatus === 'low' ? 'secondary' : 'default'}
                className={`${
                    stockStatus === 'good' ? 'bg-blue-600/30 text-blue-800 border-blue-600/30' :
                        stockStatus === 'low' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
            >
              {product.currentStock} unités
            </Badge>
          </div>

          {product.priceTTC && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prix TTC</span>
                <span className="font-medium text-primary">{product.priceTTC.toFixed(2)} €</span>
              </div>
          )}

          {/* Category and Subcategory badges */}
          <div className="flex gap-2 flex-wrap">
            {product.category_name && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {product.category_name}
                </Badge>
            )}
            {product.subcategory_name && (
                <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 text-xs">
                  {product.subcategory_name}
                </Badge>
            )}
          </div>
        </div>
      </div>
  )
}