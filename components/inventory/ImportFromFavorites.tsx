"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  Loader2, 
  Package, 
  Sparkles,
  ShoppingCart,
  CheckCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

interface DbCategory {
  id: string; 
  name: string;
  user_id: string;
}

interface DbSubcategory {
  id: string; 
  name: string;
  category_id: string; 
  user_id: string;
}

interface FavoriteProduct {
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
  favorite: true;
  category_name?: string;
  subcategory_name?: string;
}

interface ImportFromFavoritesProps {
  onImportSuccess: () => void;
  user: User;
  categories: DbCategory[];
  subcategories: DbSubcategory[];
}

export const ImportFromFavorites: React.FC<ImportFromFavoritesProps> = ({ 
  onImportSuccess, 
  user, 
  categories, 
  subcategories 
}) => {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [showQuantityStep, setShowQuantityStep] = useState(false)
  const [quantities, setQuantities] = useState<{[key: string]: number}>({})

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('favorite', true)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // Add category and subcategory names
      const favoritesWithNames = (data || []).map(product => {
        const category = categories.find(cat => cat.id === product.category_id);
        const subcategory = subcategories.find(sub => sub.id === product.subcategory_id);
        return {
          ...product,
          category_name: category?.name,
          subcategory_name: subcategory?.name,
        };
      });
      
      setFavorites(favoritesWithNames)
    } catch (error) {
      console.error('Error fetching favorites:', error)
      toast.error("Impossible de charger les favoris")
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (id: string) => {
    setSelectedFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    )
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: quantity
    }))
  }

  const proceedToQuantityStep = () => {
    if (selectedFavorites.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit")
      return
    }

    const initialQuantities: {[key: string]: number} = {}
    selectedFavorites.forEach(id => {
      initialQuantities[id] = 1
    })
    setQuantities(initialQuantities)
    setShowQuantityStep(true)
  }

  const handleImport = async () => {
    try {
      setImporting(true)
      
      const selectedProducts = favorites.filter(fav => 
        selectedFavorites.includes(fav.id)
      )

      const productsToInsert = selectedProducts.map(fav => {
        const priceTTCValue = typeof fav.priceTTC === 'number' ? fav.priceTTC : 0;
        const priceHTValue = priceTTCValue > 0 ? priceTTCValue / 1.20 : 0;
        
        return {
          name: fav.name,
          description: fav.description || null,
          currentStock: quantities[fav.id] || 1,
          imageUrl: fav.imageUrl || null,
          category_id: fav.category_id || null,
          subcategory_id: fav.subcategory_id || null,
          reference: fav.reference || null,
          url: fav.url || null,
          priceHT: priceHTValue,
          priceTTC: priceTTCValue,
          favorite: false,
          user_id: user.id
        }
      })

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert)
      
      if (error) throw error
      
      toast.success(`${selectedFavorites.length} produit(s) importé(s) avec succès`)
      onImportSuccess()
      
      setSelectedFavorites([])
      setQuantities({})
      setShowQuantityStep(false)
    } catch (error: any) {
      console.error('Error importing favorites:', error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  if (showQuantityStep) {
    const selectedProducts = favorites.filter(fav => 
      selectedFavorites.includes(fav.id)
    )

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Définir les quantités</h3>
            <p className="text-sm text-muted-foreground">Spécifiez la quantité initiale pour chaque produit</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowQuantityStep(false)}
            className="bg-card/50 border-border/50 hover:bg-muted/50"
          >
            ← Retour
          </Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto bg-card/30 backdrop-blur-xl border border-border/50 rounded-xl">
          <div className="p-4 space-y-4">
            {selectedProducts.map(product => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {product.description || 'Aucune description'}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {product.category_name && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                          {product.category_name}
                        </Badge>
                      )}
                      {product.subcategory_name && (
                        <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 text-xs">
                          {product.subcategory_name}
                        </Badge>
                      )}
                    </div>
                    {product.priceTTC && (
                      <p className="text-sm text-primary font-medium mt-1">{product.priceTTC.toFixed(2)} €</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`qty-${product.id}`} className="text-sm text-muted-foreground">Quantité:</Label>
                  <Input
                    id={`qty-${product.id}`}
                    type="number"
                    min="1"
                    value={quantities[product.id] || 1}
                    onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                    className="w-20 bg-card/50 border-border/50 text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {selectedProducts.length} produit(s) à importer
            </span>
          </div>
          <Button 
            onClick={handleImport} 
            disabled={importing}
            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground"
          >
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Importer maintenant
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Chargement des favoris...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Aucun produit favori</h3>
          <p className="text-sm text-muted-foreground">Ajoutez des produits à vos favoris pour les importer ici</p>
        </div>
      ) : (
        <>
          <div className="max-h-[400px] overflow-y-auto bg-card/30 backdrop-blur-xl border border-border/50 rounded-xl">
            <div className="p-4 space-y-3">
              {favorites.map(favorite => (
                <div 
                  key={favorite.id} 
                  className={`group flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedFavorites.includes(favorite.id)
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-card/50 border-border/30 hover:bg-muted/50'
                  }`}
                  onClick={() => toggleFavorite(favorite.id)}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox 
                      checked={selectedFavorites.includes(favorite.id)}
                      onChange={() => {}}
                      className="border-border/50"
                    />
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{favorite.name}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {favorite.description || 'Aucune description'}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {favorite.category_name && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                            {favorite.category_name}
                          </Badge>
                        )}
                        {favorite.subcategory_name && (
                          <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 text-xs">
                            {favorite.subcategory_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {favorite.priceTTC && (
                      <p className="text-sm font-medium text-primary">{favorite.priceTTC.toFixed(2)} €</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {selectedFavorites.length} produit(s) sélectionné(s)
              </span>
            </div>
            <Button 
              onClick={proceedToQuantityStep} 
              disabled={selectedFavorites.length === 0}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground disabled:opacity-50"
            >
              <Star className="mr-2 h-4 w-4" />
              Continuer
            </Button>
          </div>
        </>
      )}
    </div>
  )
}