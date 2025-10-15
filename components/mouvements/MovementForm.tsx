"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DialogFooter } from "@/components/ui/dialog"
import { 
  Search, 
  Package, 
  ArrowRight, 
  Building2, 
  Loader2,
  Tag,
  ChevronDown,
  X,
  Filter,
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

// Types
interface DbCategory {
  id: string
  name: string
  user_id: string
}

interface DbSubcategory {
  id: string
  name: string
  category_id: string
  user_id: string
}

interface Product {
  id: string
  name: string
  description?: string
  currentStock: number
  priceHT?: number
  priceTTC?: number
  imageUrl?: string
  user_id: string
  category_id?: string | null
  subcategory_id?: string | null
  reference?: string | null
  url?: string | null
  category_name?: string
  subcategory_name?: string
}

interface Apartment {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  user_id: string
}

interface MovementFormProps {
  onSuccess: () => void
  user: User
}

interface FormData {
  product_id: string
  apartment_id: string
  quantity: number
}

interface FormErrors {
  product_id?: string
  apartment_id?: string
  quantity?: string
  general?: string
}

// Custom hook for data fetching
const useMovementData = (user: User) => {
  const [products, setProducts] = useState<Product[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [subcategories, setSubcategories] = useState<DbSubcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [categoriesRes, subcategoriesRes, apartmentsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
        supabase.from('subcategories').select('*').eq('user_id', user.id).order('name'),
        supabase.from('apartments').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])

      if (categoriesRes.error) throw categoriesRes.error
      if (subcategoriesRes.error) throw subcategoriesRes.error
      if (apartmentsRes.error) throw apartmentsRes.error

      setCategories(categoriesRes.data || [])
      setSubcategories(subcategoriesRes.data || [])
      setApartments(apartmentsRes.data || [])

      // Fetch products after categories are loaded
      const productsRes = await supabase
        .from('products')
        .select('*')
        .eq('favorite', false)
        .eq('user_id', user.id)
        .gt('currentStock', 0)
        .order('name')

      if (productsRes.error) throw productsRes.error

      const productsWithNames = (productsRes.data || []).map((product: any) => {
        const category = categoriesRes.data?.find((cat: DbCategory) => cat.id === product.category_id)
        const subcategory = subcategoriesRes.data?.find((sub: DbSubcategory) => sub.id === product.subcategory_id)
        
        return {
          ...product,
          category_name: category?.name,
          subcategory_name: subcategory?.name,
        }
      })

      setProducts(productsWithNames)
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load data')
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { products, apartments, categories, subcategories, loading, error, refetch: fetchData }
}

// Custom hook for filtering
const useProductFilters = (products: Product[]) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    let filtered = products

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.reference?.toLowerCase().includes(term)
      )
    }

    if (selectedCategoryId) {
      filtered = filtered.filter((product) => product.category_id === selectedCategoryId)
    }

    if (selectedSubcategoryId) {
      filtered = filtered.filter((product) => product.subcategory_id === selectedSubcategoryId)
    }

    return filtered
  }, [products, searchTerm, selectedCategoryId, selectedSubcategoryId])

  const clearFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedCategoryId(null)
    setSelectedSubcategoryId(null)
  }, [])

  const hasActiveFilters = searchTerm || selectedCategoryId || selectedSubcategoryId

  return {
    searchTerm,
    setSearchTerm,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedSubcategoryId,
    setSelectedSubcategoryId,
    filteredProducts,
    clearFilters,
    hasActiveFilters
  }
}

export const MovementForm: React.FC<MovementFormProps> = ({ onSuccess, user }) => {
  const { products, apartments, categories, subcategories, loading: dataLoading, error: dataError } = useMovementData(user)
  const {
    searchTerm,
    setSearchTerm,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedSubcategoryId,
    setSelectedSubcategoryId,
    filteredProducts,
    clearFilters,
    hasActiveFilters
  } = useProductFilters(products)

  const [formData, setFormData] = useState<FormData>({
    product_id: '',
    apartment_id: '',
    quantity: 1
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  // Memoized selections
  const selectedProduct = useMemo(() => 
    products.find((p) => p.id === formData.product_id),
    [products, formData.product_id]
  )
  
  const selectedApartment = useMemo(() => 
    apartments.find((a) => a.id === formData.apartment_id),
    [apartments, formData.apartment_id]
  )

  const maxQuantity = selectedProduct?.currentStock || 0

  // Form validation
  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {}

    if (!formData.product_id) {
      errors.product_id = 'Veuillez sélectionner un produit'
    }

    if (!formData.apartment_id) {
      errors.apartment_id = 'Veuillez sélectionner un appartement'
    }

    if (formData.quantity <= 0) {
      errors.quantity = 'La quantité doit être supérieure à 0'
    } else if (formData.quantity > maxQuantity) {
      errors.quantity = `La quantité ne peut pas dépasser le stock disponible (${maxQuantity})`
    }

    return errors
  }, [formData, maxQuantity])

  // Real-time validation
  useEffect(() => {
    const errors = validateForm()
    setFormErrors(errors)
  }, [validateForm])

  const handleQuantityChange = useCallback((delta: number) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(1, Math.min(maxQuantity, prev.quantity + delta))
    }))
  }, [maxQuantity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    if (!selectedProduct) return
    
    setSubmitting(true)
    setFormErrors({})
    
    try {
      // Create movement record
      const { error: movementError } = await supabase
        .from('movements')
        .insert({
          product_id: formData.product_id,
          apartment_id: formData.apartment_id,
          quantity: formData.quantity,
          priceht: selectedProduct.priceHT || 0,
          pricettc: selectedProduct.priceTTC || 0,
          product_name: selectedProduct.name,
          product_description: selectedProduct.description || '',
          product_category: selectedProduct.category_name || null,
          product_subcategory: selectedProduct.subcategory_name || null,
          product_reference: selectedProduct.reference || null,
          user_id: user.id
        })
      
      if (movementError) throw movementError

      // Update product stock
      const newStock = selectedProduct.currentStock - formData.quantity
      
      if (newStock === 0) {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', formData.product_id)
          .eq('user_id', user.id)
        
        if (deleteError) throw deleteError
      } else {
        const { error: updateError } = await supabase
          .from('products')
          .update({ currentStock: newStock })
          .eq('id', formData.product_id)
          .eq('user_id', user.id)
        
        if (updateError) throw updateError
      }
      
      toast.success(
        `${formData.quantity} ${selectedProduct.name} déplacé(s) vers ${selectedApartment?.name} avec succès`,
        {
          description: newStock === 0 ? 'Produit épuisé et retiré du stock' : `Stock restant: ${newStock}`,
          duration: 5000
        }
      )
      
      // Reset form
      setFormData({ product_id: '', apartment_id: '', quantity: 1 })
      clearFilters()
      onSuccess()
    } catch (error: any) {
      console.error('Error creating movement:', error)
      setFormErrors({ general: error.message || 'Une erreur est survenue' })
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = useCallback(() => {
    setFormData({ product_id: '', apartment_id: '', quantity: 1 })
    setFormErrors({})
    clearFilters()
  }, [clearFilters])

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement: {dataError}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* General Error */}
      {formErrors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formErrors.general}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters - Redesigned */}
      <div className="space-y-4">
        {/* Main Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input 
            type="text" 
            placeholder="Rechercher un produit par nom, référence ou description..." 
            className="pl-12 pr-4 py-3 text-base border-2 focus:border-primary transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un produit"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Filtrer par:</span>
          
          {/* Category Filter Chip */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={selectedCategoryId ? "default" : "outline"} 
                size="sm" 
                className="h-8 gap-1"
              >
                <Tag className="h-3 w-3" />
                {selectedCategoryId 
                  ? categories.find(c => c.id === selectedCategoryId)?.name 
                  : "Catégorie"
                }
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1">
                <Button
                  variant={!selectedCategoryId ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedCategoryId(null)
                    setSelectedSubcategoryId(null)
                  }}
                >
                  Toutes les catégories
                </Button>
                {categories.map((category) => {
                  const productCount = products.filter(p => p.category_id === category.id).length
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategoryId === category.id ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => {
                        setSelectedCategoryId(category.id)
                        setSelectedSubcategoryId(null)
                      }}
                    >
                      <span>{category.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {productCount}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Subcategory Filter Chip */}
          {selectedCategoryId && (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={selectedSubcategoryId ? "default" : "outline"} 
                  size="sm" 
                  className="h-8 gap-1"
                >
                  <Tag className="h-3 w-3" />
                  {selectedSubcategoryId 
                    ? subcategories.find(s => s.id === selectedSubcategoryId)?.name 
                    : "Sous-catégorie"
                  }
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  <Button
                    variant={!selectedSubcategoryId ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedSubcategoryId(null)}
                  >
                    Toutes les sous-catégories
                  </Button>
                  {subcategories
                    .filter(sub => sub.category_id === selectedCategoryId)
                    .map((subcategory) => {
                      const productCount = products.filter(p => p.subcategory_id === subcategory.id).length
                      return (
                        <Button
                          key={subcategory.id}
                          variant={selectedSubcategoryId === subcategory.id ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-between"
                          onClick={() => setSelectedSubcategoryId(subcategory.id)}
                        >
                          <span>{subcategory.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {productCount}
                          </Badge>
                        </Button>
                      )
                    })}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Effacer
            </Button>
          )}

          {/* Results Count */}
          <div className="ml-auto">
            <Badge variant="secondary" className="text-xs">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Active Filters Summary (Optional - can be removed if chips are enough) */}
        {hasActiveFilters && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-primary" />
              <span className="font-medium">Filtres actifs:</span>
              <div className="flex flex-wrap gap-1">
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    \"{searchTerm}\"
                  </Badge>
                )}
                {selectedCategoryId && (
                  <Badge variant="secondary" className="text-xs">
                    {categories.find((c) => c.id === selectedCategoryId)?.name}
                  </Badge>
                )}
                {selectedSubcategoryId && (
                  <Badge variant="secondary" className="text-xs">
                    {subcategories.find((s) => s.id === selectedSubcategoryId)?.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label htmlFor="product">Produit à déplacer *</Label>
          {filteredProducts.length > 0 ? (
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({...formData, product_id: value, quantity: 1})}
            >
              <SelectTrigger className={formErrors.product_id ? 'border-destructive' : ''}>
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.reference && `Réf: ${product.reference} • `}
                        {product.category_name && `${product.category_name}`}
                        {product.subcategory_name && ` > ${product.subcategory_name}`}
                        {` • Stock: ${product.currentStock}`}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="w-full rounded-md border border-input bg-background px-3 py-2 text-muted-foreground text-center">
              {hasActiveFilters ? 'Aucun produit ne correspond aux filtres' : 'Aucun produit disponible'}
            </div>
          )}
          {formErrors.product_id && (
            <p className="text-sm text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {formErrors.product_id}
            </p>
          )}
        </div>

        {/* Selected Product Info */}
        {selectedProduct && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Produit sélectionné
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground">Nom:</span>
                    <span className="ml-2 font-medium">{selectedProduct.name}</span>
                  </div>
                  {selectedProduct.description && (
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <span className="ml-2">{selectedProduct.description}</span>
                    </div>
                  )}
                  {selectedProduct.reference && (
                    <div>
                      <span className="text-muted-foreground">Référence:</span>
                      <span className="ml-2">{selectedProduct.reference}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedProduct.category_name && (
                    <div>
                      <span className="text-muted-foreground">Catégorie:</span>
                      <Badge variant="outline" className="ml-2">{selectedProduct.category_name}</Badge>
                    </div>
                  )}
                  {selectedProduct.subcategory_name && (
                    <div>
                      <span className="text-muted-foreground">Sous-catégorie:</span>
                      <Badge variant="outline" className="ml-2">{selectedProduct.subcategory_name}</Badge>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Stock disponible:</span>
                    <span className="ml-2 font-medium text-green-600">{selectedProduct.currentStock}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apartment Selection */}
        <div className="space-y-2">
          <Label htmlFor="apartment">Appartement de destination *</Label>
          <Select
            value={formData.apartment_id}
            onValueChange={(value) => setFormData({...formData, apartment_id: value})}
          >
            <SelectTrigger className={formErrors.apartment_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Sélectionner un appartement" />
            </SelectTrigger>
            <SelectContent>
              {apartments.map((apartment) => (
                <SelectItem key={apartment.id} value={apartment.id}>
                  <div className="flex flex-col items-start">
                    <div className="font-medium">{apartment.name}</div>
                    {apartment.address && (
                      <div className="text-sm text-muted-foreground">{apartment.address}</div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.apartment_id && (
            <p className="text-sm text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {formErrors.apartment_id}
            </p>
          )}
        </div>

        {/* Quantity Selection */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantité *</Label>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={formData.quantity <= 1}
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input 
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              className={`text-center ${formErrors.quantity ? 'border-destructive' : ''}`}
              aria-label="Quantité"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={formData.quantity >= maxQuantity}
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {selectedProduct && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Stock disponible: {selectedProduct.currentStock}</span>
              {selectedProduct.priceTTC && (
                <span className="font-medium text-green-600">
                  {selectedProduct.priceTTC.toFixed(2)}€ TTC/unité
                </span>
              )}
            </div>
          )}
          {formErrors.quantity && (
            <p className="text-sm text-destructive flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {formErrors.quantity}
            </p>
          )}
        </div>

        {/* Movement Summary */}
        {selectedProduct && selectedApartment && formData.quantity > 0 && Object.keys(formErrors).length === 0 && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center text-green-700">
                <ArrowRight className="h-5 w-5 mr-2" />
                Résumé du mouvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="text-muted-foreground text-sm">Produit:</span>
                    <span className="font-medium ml-2">{selectedProduct.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="text-muted-foreground text-sm">Destination:</span>
                    <span className="font-medium ml-2">{selectedApartment.name}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-4 w-4 bg-primary rounded mr-2" />
                    <span className="text-muted-foreground text-sm">Quantité:</span>
                    <span className="font-medium ml-2">{formData.quantity}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Valeur HT:</span>
                    <span className="font-mono">
                      {((selectedProduct.priceHT || 0) * formData.quantity).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Valeur TTC:</span>
                    <span className="font-mono font-semibold text-blue-800">
                      {((selectedProduct.priceTTC || 0) * formData.quantity).toFixed(2)}€
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-600 text-sm">Stock restant:</span>
                      <span className="font-medium text-amber-600">
                        {selectedProduct.currentStock - formData.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <DialogFooter className="pt-6 border-t">
          <Button type="button" variant="outline" onClick={resetForm}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={submitting || Object.keys(formErrors).length > 0 || !formData.product_id || !formData.apartment_id}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Effectuer le mouvement
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </div>
  )
}