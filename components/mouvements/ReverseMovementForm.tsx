"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DialogFooter } from "@/components/ui/dialog"
import { 
  Search, 
  Package, 
  ArrowLeft, 
  Building2, 
  Loader2,
  Tag,
  Home,
  ArrowRight,
  CheckSquare,
  Square
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

// Types
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
  product_category?: string
  product_subcategory?: string
  product_reference?: string
  user_id: string
}

interface Apartment {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  user_id: string
}

interface GroupedProduct {
  name: string
  totalQuantity: number
  totalValueHT: number
  totalValueTTC: number
  movements: Movement[]
  category?: string
  subcategory?: string
  description?: string
  reference?: string
}

interface ReverseMovementFormProps {
  onSuccess: () => void
  user: User
  sourceApartmentId?: string // Optional: if called from apartment detail
}

interface SelectedProduct {
  movementId: string
  productName: string
  quantity: number
  maxQuantity: number
  priceht: number
  pricettc: number
}

export const ReverseMovementForm: React.FC<ReverseMovementFormProps> = ({ 
  onSuccess, 
  user, 
  sourceApartmentId 
}) => {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [groupedProducts, setGroupedProducts] = useState<{[key: string]: GroupedProduct}>({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [formData, setFormData] = useState({
    source_apartment_id: sourceApartmentId || '',
    destination_type: 'stock', // 'stock' or 'apartment'
    destination_apartment_id: ''
  })

  useEffect(() => {
    fetchApartments()
    if (formData.source_apartment_id) {
      fetchApartmentMovements(formData.source_apartment_id)
    }
  }, [])

  useEffect(() => {
    if (formData.source_apartment_id) {
      fetchApartmentMovements(formData.source_apartment_id)
    } else {
      setMovements([])
      setGroupedProducts({})
    }
  }, [formData.source_apartment_id])

  const fetchApartments = async () => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setApartments(data || [])
    } catch (error) {
      console.error('Error fetching apartments:', error)
    }
  }

  const fetchApartmentMovements = async (apartmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('movements')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const movementData = data || []
      setMovements(movementData)
      
      // Group movements by product
      const grouped = movementData.reduce((acc: any, movement: Movement) => {
        const productName = movement.product_name || `Produit supprimé (${movement.product_id?.slice(0, 8) || 'inconnu'})`
        
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
      }, {})
      
      setGroupedProducts(grouped)
    } catch (error) {
      console.error('Error fetching movements:', error)
    }
  }

  // Remove these lines (around lines 179-183):
  // const selectedMovement = movements.find(m => m.id === formData.movement_id)
  // const selectedProduct = selectedMovement ? groupedProducts[selectedMovement.product_name || ''] : null
  // const maxQuantity = selectedMovement?.quantity || 0
  // const sourceApartment = apartments.find(a => a.id === formData.source_apartment_id)
  // const destinationApartment = apartments.find(a => a.id === formData.destination_apartment_id)

  const handleProductSelection = (movement: Movement, isSelected: boolean) => {
    if (isSelected) {
      const newProduct: SelectedProduct = {
        movementId: movement.id,
        productName: movement.product_name || '',
        quantity: 1,
        maxQuantity: movement.quantity,
        priceht: movement.priceht || 0,
        pricettc: movement.pricettc || 0
      }
      setSelectedProducts(prev => [...prev, newProduct])
    } else {
      setSelectedProducts(prev => prev.filter(p => p.movementId !== movement.id))
    }
  }

  const updateProductQuantity = (movementId: string, quantity: number) => {
    setSelectedProducts(prev => 
      prev.map(p => 
        p.movementId === movementId 
          ? { ...p, quantity: Math.max(1, Math.min(quantity, p.maxQuantity)) }
          : p
      )
    )
  }

  const selectAllProducts = () => {
    const allProducts = movements
      .filter(m => {
        const product = groupedProducts[m.product_name || '']
        return product && filteredProducts.includes(product)
      })
      .map(movement => ({
        movementId: movement.id,
        productName: movement.product_name || '',
        quantity: 1,
        maxQuantity: movement.quantity,
        priceht: movement.priceht || 0,
        pricettc: movement.pricettc || 0
      }))
    setSelectedProducts(allProducts)
  }

  const clearAllSelections = () => {
    setSelectedProducts([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedProducts.length === 0) {
      toast.error('Veuillez sélectionner au moins un produit')
      return
    }

    if (formData.destination_type === 'apartment' && !formData.destination_apartment_id) {
      toast.error('Veuillez sélectionner un appartement de destination')
      return
    }

    setLoading(true)
    try {
      for (const selectedProduct of selectedProducts) {
        const movement = movements.find(m => m.id === selectedProduct.movementId)
        if (!movement) continue

        // Process each selected product
        if (formData.destination_type === 'stock') {
          await moveToStock(movement, selectedProduct.quantity)
        } else {
          await moveToApartment(movement, selectedProduct.quantity)
        }
        
        await updateOriginalMovement(movement, selectedProduct.quantity)
      }

      toast.success(`${selectedProducts.length} produit(s) déplacé(s) avec succès`)
      setSelectedProducts([])
      setFormData({ 
        source_apartment_id: sourceApartmentId || '',
        destination_type: 'stock',
        destination_apartment_id: ''
      })
      onSuccess()
    } catch (error: any) {
      console.error('Error creating reverse movements:', error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const moveToStock = async (movement: Movement, quantity: number) => {
    // First, we need to fetch categories and subcategories to map names back to IDs
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
    
    const { data: subcategoriesData } = await supabase
      .from('subcategories')
      .select('*')
      .eq('user_id', user.id)
    
    // Find category and subcategory IDs from names
    const category = categoriesData?.find(cat => cat.name === movement.product_category)
    const subcategory = subcategoriesData?.find(sub => sub.name === movement.product_subcategory)
    
    // Check if product already exists in stock
    const { data: existingProducts, error: searchError } = await supabase
      .from('products')
      .select('*')
      .eq('name', movement.product_name)
      .eq('user_id', user.id)
      .eq('favorite', false)
    
    if (searchError) throw searchError
  
    if (existingProducts && existingProducts.length > 0) {
      // Update existing product stock
      const existingProduct = existingProducts[0]
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          currentStock: existingProduct.currentStock + quantity 
        })
        .eq('id', existingProduct.id)
        .eq('user_id', user.id)
      
      if (updateError) throw updateError
    } else {
      // Create new product in stock WITH category information
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          name: movement.product_name || 'Produit sans nom',
          description: movement.product_description || '',
          currentStock: quantity,
          priceHT: movement.priceht || 0,
          priceTTC: movement.pricettc || 0,
          user_id: user.id,
          favorite: false,
          reference: movement.product_reference || null,
          category_id: category?.id || null,  // ✅ ADD THIS
          subcategory_id: subcategory?.id || null  // ✅ ADD THIS
        })
      
      if (insertError) throw insertError
    }
  }

  const moveToApartment = async (movement: Movement, quantity: number) => {
    // Create new movement to destination apartment
    const { error: movementError } = await supabase
      .from('movements')
      .insert({
        product_id: movement.product_id,
        apartment_id: formData.destination_apartment_id,
        quantity: quantity,
        priceht: movement.priceht || 0,
        pricettc: movement.pricettc || 0,
        product_name: movement.product_name,
        product_description: movement.product_description || '',
        product_category: movement.product_category || null,
        product_subcategory: movement.product_subcategory || null,
        product_reference: movement.product_reference || null,
        user_id: user.id
      })
    
    if (movementError) throw movementError
  }

  const updateOriginalMovement = async (movement: Movement, quantity: number) => {
    const remainingQuantity = movement.quantity - quantity
    
    if (remainingQuantity === 0) {
      // Delete the movement if no quantity remains
      const { error: deleteError } = await supabase
        .from('movements')
        .delete()
        .eq('id', movement.id)
        .eq('user_id', user.id)
      
      if (deleteError) throw deleteError
    } else {
      // Update the movement with remaining quantity
      const { error: updateError } = await supabase
        .from('movements')
        .update({ quantity: remainingQuantity })
        .eq('id', movement.id)
        .eq('user_id', user.id)
      
      if (updateError) throw updateError
    }
  }

  const filteredProducts = Object.values(groupedProducts).filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.reference?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Apartment Selection */}
        {!sourceApartmentId && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Appartement source *</label>
            <Select 
              value={formData.source_apartment_id} 
              onValueChange={(value) => {
                setFormData({...formData, source_apartment_id: value})
                setSelectedProducts([])
              }}
            >
              <SelectTrigger className="bg-card/50 border-border/50">
                <SelectValue placeholder="Sélectionner l'appartement source" />
              </SelectTrigger>
              <SelectContent>
                {apartments.map((apartment) => (
                  <SelectItem key={apartment.id} value={apartment.id}>
                    {apartment.name} {apartment.address && `- ${apartment.address}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Product Search */}
        {formData.source_apartment_id && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Rechercher un produit</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                type="text" 
                placeholder="Rechercher par nom, description ou référence..." 
                className="pl-10 bg-card/50 border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Product Selection with Checkboxes */}
        {formData.source_apartment_id && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Produits à déplacer *</label>
              {filteredProducts.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllProducts}
                    className="text-xs"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Tout sélectionner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllSelections}
                    className="text-xs"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Tout désélectionner
                  </Button>
                </div>
              )}
            </div>
            
            {filteredProducts.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-border/30 rounded-lg p-3">
                {movements
                  .filter(m => {
                    const product = groupedProducts[m.product_name || '']
                    return product && filteredProducts.includes(product)
                  })
                  .map((movement) => {
                    const product = groupedProducts[movement.product_name || '']
                    const isSelected = selectedProducts.some(p => p.movementId === movement.id)
                    const selectedProduct = selectedProducts.find(p => p.movementId === movement.id)
                    
                    return (
                      <div key={movement.id} className="flex items-center space-x-3 p-3 bg-card/30 rounded-lg border border-border/20">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleProductSelection(movement, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{movement.product_name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {movement.product_reference && (
                                  <span>Réf: {movement.product_reference}</span>
                                )}
                                {product?.category && (
                                  <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                                )}
                                <span className="font-medium text-blue-800">Disponible: {movement.quantity}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-foreground font-medium">Prix TTC</p>
                              <p className="font-mono text-blue-800">{movement.pricettc?.toFixed(2)}€</p>
                            </div>
                          </div>
                          
                          {isSelected && selectedProduct && (
                            <div className="mt-3 flex items-center gap-2">
                              <label className="text-sm text-foreground font-medium">Quantité:</label>
                              <Input
                                type="number"
                                min="1"
                                max={movement.quantity}
                                value={selectedProduct.quantity}
                                onChange={(e) => updateProductQuantity(movement.id, parseInt(e.target.value) || 1)}
                                className="w-20 h-8 text-sm"
                              />
                              <span className="text-sm text-foreground font-medium">/ {movement.quantity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-muted-foreground text-center">
                {searchTerm ? 'Aucun produit ne correspond à la recherche' : 'Aucun produit dans cet appartement'}
              </div>
            )}
          </div>
        )}

        {/* Selected Products Summary */}
        {selectedProducts.length > 0 && (
          <div className="bg-card/40 backdrop-blur-xl border border-border/30 rounded-xl p-4">
            <h4 className="font-medium text-foreground mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2 text-primary" />
              Produits sélectionnés ({selectedProducts.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedProducts.map((product) => (
                <div key={product.movementId} className="flex justify-between items-center text-sm">
                  <span>{product.productName}</span>
                  <div className="flex items-center gap-2">
                    <span>Qté: {product.quantity}</span>
                    <span className="font-mono text-green-400">
                      {(product.pricettc * product.quantity).toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border/30 flex justify-between items-center font-semibold">
              <span>Total:</span>
              <span className="text-green-400 font-mono">
                {selectedProducts.reduce((sum, p) => sum + (p.pricettc * p.quantity), 0).toFixed(2)}€
              </span>
            </div>
          </div>
        )}

        {/* Destination Type Selection */}
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Destination *</label>
            <Select 
              value={formData.destination_type} 
              onValueChange={(value) => setFormData({...formData, destination_type: value, destination_apartment_id: ''})}
            >
              <SelectTrigger className="bg-card/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">
                  <div className="flex items-center">
                    <Home className="w-4 h-4 mr-2" />
                    Retour au stock
                  </div>
                </SelectItem>
                <SelectItem value="apartment">
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Vers un autre appartement
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Destination Apartment Selection */}
        {formData.destination_type === 'apartment' && selectedProducts.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Appartement de destination *</label>
            <Select 
              value={formData.destination_apartment_id} 
              onValueChange={(value) => setFormData({...formData, destination_apartment_id: value})}
            >
              <SelectTrigger className="bg-card/50 border-border/50">
                <SelectValue placeholder="Sélectionner l'appartement de destination" />
              </SelectTrigger>
              <SelectContent>
                {apartments
                  .filter(apt => apt.id !== formData.source_apartment_id)
                  .map((apartment) => (
                    <SelectItem key={apartment.id} value={apartment.id}>
                      {apartment.name} {apartment.address && `- ${apartment.address}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <DialogFooter className="pt-6 border-t border-border/30">
          <Button variant="outline" onClick={() => {
            setSelectedProducts([])
            setFormData({ 
              source_apartment_id: sourceApartmentId || '',
              destination_type: 'stock',
              destination_apartment_id: ''
            })
            setSearchTerm('')
          }}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={loading || selectedProducts.length === 0 || (formData.destination_type === 'apartment' && !formData.destination_apartment_id)} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <ArrowLeft className="mr-2 h-5 w-5" />
                Déplacer {selectedProducts.length} produit(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </div>
  )
}