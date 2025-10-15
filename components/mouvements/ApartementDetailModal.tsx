"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Package, 
  Calendar,
  FileText,
  Trash2,
  Loader2,
  Tag,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

interface Apartment {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  user_id: string
}

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
  apartment?: Apartment
  product_category?: string
  product_subcategory?: string
  product_reference?: string
}

interface ApartmentSummary {
  apartment: Apartment
  totalItems: number
  totalValueHT: number
  totalValueTTC: number
  itemCount: number
}

interface ApartmentDetailModalProps {
  apartment: ApartmentSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (apartment: ApartmentSummary) => void;
  onExportPDF: (apartment: ApartmentSummary, products: any[]) => void;
  onMovementDeleted?: () => void; // Add callback for when a movement is deleted
  onOpenReverseMovement?: (apartmentId: string) => void;
  user: User;
}

export const ApartmentDetailModal: React.FC<ApartmentDetailModalProps> = ({ 
  apartment, 
  isOpen, 
  onClose, 
  onDelete, 
  onExportPDF,
  onMovementDeleted,
  onOpenReverseMovement,
  user
}) => {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(false)
  const [groupedProducts, setGroupedProducts] = useState<{[key: string]: {name: string, totalQuantity: number, totalValueHT: number, totalValueTTC: number, movements: Movement[], category?: string, subcategory?: string, description?: string, reference?: string}}>({})
  const [deleteMovementId, setDeleteMovementId] = useState<string | null>(null)
  const [deletingMovement, setDeletingMovement] = useState(false)
  const [currentApartmentSummary, setCurrentApartmentSummary] = useState<ApartmentSummary | null>(apartment)

  useEffect(() => {
    if (isOpen && apartment) {
      fetchApartmentMovements()
    }
  }, [isOpen, apartment])

  // Update current apartment summary when movements change
  useEffect(() => {
    if (movements.length > 0) {
      const totalItems = movements.reduce((sum, m) => sum + m.quantity, 0)
      const totalValueHT = movements.reduce((sum, m) => sum + (m.priceht * m.quantity), 0)
      const totalValueTTC = movements.reduce((sum, m) => sum + (m.pricettc * m.quantity), 0)
      const itemCount = movements.length

      setCurrentApartmentSummary(apartment ? {
        ...apartment,
        totalItems,
        totalValueHT,
        totalValueTTC,
        itemCount
      } : null)
    } else if (apartment) {
      // If no movements, reset to zero values
      setCurrentApartmentSummary({
        ...apartment,
        totalItems: 0,
        totalValueHT: 0,
        totalValueTTC: 0,
        itemCount: 0
      })
    }
  }, [movements, apartment])

  const fetchApartmentMovements = async () => {
    if (!apartment) return
    
    setLoading(true)
    
    try {
      const { data: movementData, error: movementError } = await supabase
        .from('movements')
        .select(`
          id,
          product_id,
          apartment_id,
          quantity,
          priceht,
          pricettc,
          created_at,
          product_name,
          product_description,
          product_category,
          product_subcategory,
          product_reference,
          user_id
        `)
        .eq('apartment_id', apartment.apartment.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (movementError) throw movementError
      
      setMovements(movementData || [])

      const movementsWithProducts = movementData?.map((movement: any) => ({
        ...movement,
        product: {
          name: movement.product_name || 'Produit supprimé',
          description: movement.product_description || ''
        }
      })) || []

      // Group movements by product with enhanced category information
      const grouped = movementsWithProducts.reduce((acc: any, movement: any) => {
        const productName = movement.product?.name || `Produit supprimé (${movement.product_id?.slice(0, 8) || 'inconnu'})`
        
        if (!acc[productName]) {
          acc[productName] = {
            name: productName,
            totalQuantity: 0,
            totalValueHT: 0,
            totalValueTTC: 0,
            movements: [],
            category: movement.product_category || undefined,
            subcategory: movement.product_subcategory || undefined,
            description: movement.product_description || undefined,
            reference: movement.product_reference || undefined
          }
        }
        
        acc[productName].totalQuantity += movement.quantity || 0
        acc[productName].totalValueHT += (movement.priceht || 0) * (movement.quantity || 0)
        acc[productName].totalValueTTC += (movement.pricettc || 0) * (movement.quantity || 0)
        acc[productName].movements.push(movement)
        
        return acc
      }, {} as {[key: string]: {name: string, totalQuantity: number, totalValueHT: number, totalValueTTC: number, movements: any[], category?: string, subcategory?: string, description?: string, reference?: string}})

      setGroupedProducts(grouped)
      
    } catch (error: any) {
      console.error('Error fetching movements:', error)
      toast.error(`Erreur: ${error.message}`)
      setMovements([])
      setGroupedProducts({})
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMovement = async (movementId: string) => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.")
      return
    }

    setDeletingMovement(true)
    
    try {
      const { error } = await supabase
        .from('movements')
        .delete()
        .eq('id', movementId)
        .eq('user_id', user.id)
      
      if (error) throw error

      toast.success('Article supprimé avec succès')
      setDeleteMovementId(null)
      
      // Refresh the local data
      await fetchApartmentMovements()
      
      // Notify parent component to refresh apartment data
      if (onMovementDeleted) {
        onMovementDeleted()
      }
      
    } catch (error: any) {
      console.error('Error deleting movement:', error)
      toast.error(`Erreur lors de la suppression: ${error.message}`)
    } finally {
      setDeletingMovement(false)
    }
  }

  if (!apartment) return null

  const productList = Object.values(groupedProducts)
  const movementToDelete = movements.find(m => m.id === deleteMovementId)
  const displayApartment = currentApartmentSummary || apartment

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[800px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl text-foreground">{displayApartment.apartment.name}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {displayApartment.apartment.address && `📍 ${displayApartment.apartment.address}`}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (productList && productList.length >= 0) {
                      onExportPDF(displayApartment, productList)
                    } else {
                      toast.error('Aucune donnée à exporter')
                    }
                  }}
                  className="border-blue-600/30 text-blue-400 hover:bg-blue-600/20"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Open reverse movement modal for this apartment
                    // You'll need to pass this function from the parent
                    onOpenReverseMovement?.(displayApartment.apartment.id)
                  }}
                  className="border-green-600/30 text-green-400 hover:bg-green-600/20"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour/Transfert
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(displayApartment)}
                  className="border-red-600/30 text-red-400 hover:bg-red-600/20"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Summary Stats - Now using real-time calculated values */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative text-center">
                <p className="text-lg font-bold text-blue-400">{productList.length}</p>
                <p className="text-xs text-muted-foreground">Types de produits</p>
              </div>
            </div>
            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative text-center">
                <p className="text-lg font-bold text-foreground">{displayApartment.totalItems}</p>
                <p className="text-xs text-muted-foreground">Articles totaux</p>
              </div>
            </div>
            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative text-center">
                <p className="text-lg font-bold text-blue-800">{displayApartment.totalValueTTC.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">Valeur TTC</p>
              </div>
            </div>
            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative text-center">
                <p className="text-lg font-bold text-blue-300">{displayApartment.totalValueHT.toFixed(2)}€</p>
                <p className="text-xs text-muted-foreground">Valeur HT</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto max-h-[50vh]">
              {/* Products Summary with Categories */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-400" />
                  Produits dans cet appartement
                </h3>
                
                {productList && productList.length > 0 ? (
                  <div className="space-y-3">
                    {productList.map((product, index) => (
                      <div key={`product-${index}`} className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground mb-1">{product.name || 'Produit sans nom'}</h4>
                              {product.description && (
                                <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                              )}
                              {product.reference && (
                                <p className="text-xs text-muted-foreground">Réf: {product.reference}</p>
                              )}
                              {/* Category and Subcategory badges */}
                              <div className="flex gap-2 mt-2">
                                {product.category && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {product.category}
                                  </Badge>
                                )}
                                {product.subcategory && (
                                  <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 text-xs">
                                    {product.subcategory}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                Qté: {product.totalQuantity || 0}
                              </Badge>
                              <div className="text-right">
                                <div className="text-blue-800 font-bold">
                                  {(product.totalValueTTC || 0).toFixed(2)}€ TTC
                                </div>
                                <div className="text-blue-300 text-sm">
                                  {(product.totalValueHT || 0).toFixed(2)}€ HT
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Movement details for this product */}
                          {product.movements && product.movements.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Historique des mouvements:</p>
                              {product.movements.map((movement: any, movIndex: number) => (
                                <div key={`movement-${movIndex}`} className="flex items-center justify-between text-sm bg-muted/30 px-3 py-2 rounded-lg">
                                  <span className="text-muted-foreground">
                                    {new Date(movement.created_at).toLocaleDateString('fr-FR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className="text-foreground">
                                    +{movement.quantity || 0} article(s)
                                  </span>
                                  <span className="text-blue-800 font-medium">
                                    {((movement.pricettc || 0) * (movement.quantity || 0)).toFixed(2)}€
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteMovementId(movement.id)}
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Aucun produit dans cet appartement</p>
                  </div>
                )}
              </div>

              {/* All Movements History */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-amber-400" />
                  Historique complet des mouvements
                </h3>
                
                {movements.length > 0 ? (
                  <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Produit</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Catégorie</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Qté</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Valeur TTC</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {movements.map((movement: Movement) => (
                          <tr key={movement.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3 text-muted-foreground">
                              {new Date(movement.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="text-foreground font-medium">
                                  {movement.product?.name || movement.product_name || 'Produit supprimé'}
                                </p>
                                {movement.product_reference && (
                                  <p className="text-xs text-muted-foreground">Réf: {movement.product_reference}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                {movement.product_category && (
                                  <Badge className="bg-primary/20 text-primary border-primary/30 w-fit text-xs">
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
                            <td className="p-3">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                {movement.quantity}
                              </Badge>
                            </td>
                            <td className="p-3 text-blue-800 font-medium">
                              {(movement.pricettc * movement.quantity).toFixed(2)}€
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteMovementId(movement.id)}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Aucun mouvement enregistré</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 pt-4 border-t border-border/30">
            <Button variant="outline" onClick={onClose} className="border-border/50 text-muted-foreground hover:bg-muted/50">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Movement Confirmation Modal */}
      <Dialog open={!!deleteMovementId} onOpenChange={() => setDeleteMovementId(null)}>
        <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer cet article de l'appartement ? Cette action recalculera automatiquement les totaux.
            </DialogDescription>
          </DialogHeader>
          
          {movementToDelete && (
            <div className="bg-muted/30 rounded-lg p-4 my-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium text-foreground">Produit:</span>{' '}
                  <span className="text-muted-foreground">
                    {movementToDelete.product?.name || movementToDelete.product_name || 'Produit supprimé'}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-foreground">Quantité:</span>{' '}
                  <span className="text-muted-foreground">{movementToDelete.quantity}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-foreground">Valeur:</span>{' '}
                  <span className="text-muted-foreground">
                    {(movementToDelete.pricettc * movementToDelete.quantity).toFixed(2)}€ TTC
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-foreground">Date:</span>{' '}
                  <span className="text-muted-foreground">
                    {new Date(movementToDelete.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteMovementId(null)}
              disabled={deletingMovement}
              className="border-border/50 text-muted-foreground hover:bg-muted/50"
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMovementId && handleDeleteMovement(deleteMovementId)}
              disabled={deletingMovement}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingMovement ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}