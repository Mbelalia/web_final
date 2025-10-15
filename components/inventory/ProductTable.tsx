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

interface ProductTableProps {
  products: GroupedProduct[];
  onEdit: (id: string) => void;
  onDelete: (product: GroupedProduct) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ products, onEdit, onDelete }) => {
  return (
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border/50">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-foreground">Produit</th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">Description</th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">Catégorie</th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">Stock</th>
              <th className="text-left p-4 text-sm font-semibold text-foreground">Prix TTC</th>
              <th className="text-right p-4 text-sm font-semibold text-foreground">Actions</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
            {products.map(product => {
              const stockStatus = product.currentStock === 0 ? 'out' : product.currentStock < 10 ? 'low' : 'good'

              return (
                  <tr key={product.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          {product.reference && (
                              <p className="text-xs text-muted-foreground">Réf: {product.reference}</p>
                          )}
                          {product.url && (
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 text-xs text-blue-500 hover:text-blue-400"
                                  onClick={() => window.open(product.url!, '_blank', 'noopener,noreferrer')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Voir le produit
                              </Button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-muted-foreground truncate max-w-[200px]">
                        {product.description || 'Aucune description'}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {product.category_name ? (
                            <Badge className="bg-primary/20 text-primary border-primary/30 w-fit text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {product.category_name}
                            </Badge>
                        ) : (
                            <span className="text-xs text-muted-foreground">Aucune catégorie</span>
                        )}
                        {product.subcategory_name && (
                            <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 w-fit text-xs">
                              {product.subcategory_name}
                            </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
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
                    </td>
                    <td className="p-4">
                      <div>
                      <span className="font-medium text-primary">
                        {product.priceTTC ? `${product.priceTTC.toFixed(2)} €` : '-'}
                      </span>
                        {product.priceHT && (
                            <p className="text-xs text-muted-foreground">HT: {product.priceHT.toFixed(2)} €</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {product.url && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(product.url!, '_blank', 'noopener,noreferrer')}
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/10 text-blue-500"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(product.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(product)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      </div>
  )
}