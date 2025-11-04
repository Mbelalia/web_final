"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Plus,
  Search,
  Star,
  ArrowUpDown,
  Package,
  TrendingUp,
  Grid3X3,
  List,
  AlertCircle,
  Tag,
  Settings2,
  ChevronDown,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast, Toaster } from "sonner"
import { User } from "@supabase/supabase-js"
import { parseInventoryPdf, type InventoryPdfData } from '@/lib/inventoryPdf'

// Import components and types from index
import {
  ProductForm,
  ProductCard,
  ProductTable,
  ImportFromFavorites,
  EditProductModal,
  CategoryManagement,
  DeleteProductModal,
  type DbCategory,
  type DbSubcategory,
  type Product,
  type GroupedProduct
} from '@/components/inventory/index'

// Add DeleteProductModal component - now imported from index instead of defined inline

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core states
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [favoritesImportOpen, setFavoritesImportOpen] = useState(false);
  const [autoOpenedFromQuery, setAutoOpenedFromQuery] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hideZeroStock, setHideZeroStock] = useState(true);
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Delete states
  const [productToDelete, setProductToDelete] = useState<GroupedProduct | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // PDF import states
  const [pdfImportOpen, setPdfImportOpen] = useState(false)
  const [pdfProcessing, setPdfProcessing] = useState(false)
  const [extractedPdfData, setExtractedPdfData] = useState<InventoryPdfData | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [editableProducts, setEditableProducts] = useState<InventoryPdfData['products']>([])

  // Category states
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [subcategories, setSubcategories] = useState<DbSubcategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);
  const [manageCategoriesDialogOpen, setManageCategoriesDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error

        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Fetch categories and subcategories
  const fetchDbCategories = useCallback(async () => {
    if (!user) return;

    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error("Impossible de charger les catégories.");
    } finally {
      setLoadingCategories(false);
    }
  }, [user]);

  const fetchDbSubcategories = useCallback(async () => {
    if (!user) return;

    setLoadingSubcategories(true);
    try {
      const { data, error } = await supabase
          .from('subcategories')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error("Impossible de charger les sous-catégories.");
    } finally {
      setLoadingSubcategories(false);
    }
  }, [user]);

  // Fetch data when user is available
  useEffect(() => {
    if (user && !authLoading) {
      fetchDbCategories();
      fetchDbSubcategories();
    }
  }, [user, authLoading, fetchDbCategories, fetchDbSubcategories]);

  // Fetch products with category names
  const fetchProducts = useCallback(async () => {
    if (!user || loadingCategories || loadingSubcategories) return

    try {
      setLoading(true);
      const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('favorite', false)
          .eq('user_id', user.id);

      if (error) throw error;

      // Add category and subcategory names
      const productsWithNames = (data || []).map(product => {
        const category = categories.find(cat => cat.id === product.category_id);
        const subcategory = subcategories.find(sub => sub.id === product.subcategory_id);
        return {
          ...product,
          category_name: category?.name,
          subcategory_name: subcategory?.name,
        };
      });

      setProducts(productsWithNames);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error("Impossible de charger les produits. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [user, categories, subcategories, loadingCategories, loadingSubcategories]);

  useEffect(() => {
    if (!loadingCategories && !loadingSubcategories && user) {
      fetchProducts();
    }
  }, [loadingCategories, loadingSubcategories, fetchProducts, user]);

  useEffect(() => {
    if (products.length > 0) {
      const grouped = groupProductsByName(products);
      setGroupedProducts(grouped);
    } else {
      setGroupedProducts([]);
    }
  }, [products]);

  // Check if URL has showAll parameter
  useEffect(() => {
    const showAll = searchParams.get('showAll');
    if (showAll === 'true') {
      setHideZeroStock(false);
    }
  }, [searchParams]);

  // Check if URL has openAdd parameter to open the add product dialog once and then remove the param
  useEffect(() => {
    const openAdd = searchParams.get('openAdd');
    if (
      openAdd === 'true' &&
      !autoOpenedFromQuery &&
      !loadingCategories &&
      !loadingSubcategories &&
      user
    ) {
      setAutoOpenedFromQuery(true);
      setOpen(true);
      router.replace('/dashboard/inventaire', { scroll: false });
    }
  }, [searchParams, autoOpenedFromQuery, loadingCategories, loadingSubcategories, user, router]);

  // Event handlers
  const handleFormSuccess = () => {
    setOpen(false);
    fetchProducts();
  };

  const handleFavoritesImportSuccess = () => {
    setFavoritesImportOpen(false);
    fetchProducts();
  };

  const handleCategoriesUpdate = () => {
    fetchDbCategories();
    fetchDbSubcategories();
    // Reset category filters when categories are updated
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    // Refetch products to update category names
    setTimeout(() => fetchProducts(), 100);
  };

  const groupProductsByName = (products: Product[]): GroupedProduct[] => {
    const groupedProducts = products.reduce((acc, product) => {
      const existingProduct = acc.find(p => p.name === product.name);

      if (existingProduct) {
        existingProduct.currentStock = (existingProduct.currentStock || 0) + (product.currentStock || 0);
        existingProduct.groupedIds = existingProduct.groupedIds || [existingProduct.id];
        existingProduct.groupedIds.push(product.id);
        existingProduct.originalProducts = existingProduct.originalProducts || [existingProduct];
        existingProduct.originalProducts.push(product);
      } else {
        acc.push({
          ...product,
          groupedIds: [product.id],
          originalProducts: [product]
        });
      }

      return acc;
    }, [] as GroupedProduct[]);

    return groupedProducts;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingProductId(null)
    fetchProducts()
  }

  const handleDeleteProduct = (product: GroupedProduct) => {
    setProductToDelete(product)
    setIsDeleteModalOpen(true)
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setProductToDelete(null)
  }

  // PDF import handlers
  const handlePdfUpload = async (file: File) => {
    if (!user) {
      toast.error("Vous devez être connecté pour importer un PDF")
      return
    }

    setPdfProcessing(true)
    try {
      const pdfData = await parseInventoryPdf(file)
      setExtractedPdfData(pdfData)
      // Initialiser tous les produits comme sélectionnés et éditables
      setSelectedProducts(pdfData.products.map((_, index) => index))
      setEditableProducts([...pdfData.products])
      toast.success("PDF analysé avec succès!")
    } catch (error: any) {
      console.error('Erreur lors de l\'analyse du PDF:', error)
      toast.error(`Erreur: ${error.message}`)
      setExtractedPdfData(null)
      setSelectedProducts([])
      setEditableProducts([])
    } finally {
      setPdfProcessing(false)
    }
  }

  const handlePdfImportConfirm = async () => {
    if (!extractedPdfData || !user || selectedProducts.length === 0) return

    try {
      // Traiter seulement les produits sélectionnés
      const productsToAdd = selectedProducts.map(index => editableProducts[index])
      
      for (const product of productsToAdd) {
        // Validation des données
        if (!product.productName.trim()) {
          toast.error(`Le nom du produit ne peut pas être vide`)
          return
        }
        
        if (product.price <= 0) {
          toast.error(`Le prix de "${product.productName}" doit être supérieur à 0`)
          return
        }
        
        const productData = {
          name: product.productName.trim(),
          description: product.description.trim() || 'Importé depuis PDF',
          currentStock: product.quantity || 1, // Use extracted quantity instead of hardcoded 1
          priceTTC: product.price,
          priceHT: product.price / 1.2,
          user_id: user.id,
          favorite: false
        }

        const { error } = await supabase
          .from('products')
          .insert([productData])

        if (error) throw error
      }

      toast.success(`${productsToAdd.length} produit(s) ajouté(s) avec succès!`)
      setPdfImportOpen(false)
      setExtractedPdfData(null)
      setSelectedProducts([])
      setEditableProducts([])
      fetchProducts()
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout des produits:', error)
      toast.error(`Erreur lors de l\'ajout: ${error.message}`)
    }
  }

  const handleConfirmDelete = async (product: GroupedProduct) => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.")
      return
    }

    setIsDeleting(true)

    try {
      // If it's a grouped product, delete all instances
      const idsToDelete = product.groupedIds || [product.id]

      const { error } = await supabase
          .from('products')
          .delete()
          .in('id', idsToDelete)
          .eq('user_id', user.id)

      if (error) throw error

      toast.success(
          idsToDelete.length > 1
              ? `${idsToDelete.length} exemplaires de "${product.name}" supprimés avec succès`
              : `"${product.name}" supprimé avec succès`
      )

      handleCloseDeleteModal()
      fetchProducts()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast.error(`Erreur lors de la suppression: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-foreground">Vérification de l'authentification...</p>
          </div>
        </div>
    )
  }

  if (!user) {
    return null
  }

  // Filter products based on search term, category, subcategory and hide zero stock option
  const filteredProducts = groupedProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStock = !hideZeroStock || product.currentStock > 0;
    const matchesCategory = !selectedCategoryId || product.category_id === selectedCategoryId;
    const matchesSubcategory = !selectedSubcategoryId || product.subcategory_id === selectedSubcategoryId;
    return matchesSearch && matchesStock && matchesCategory && matchesSubcategory;
  });

  // Sort products based on sort field and direction
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aValue = a[sortField as keyof GroupedProduct];
    const bValue = b[sortField as keyof GroupedProduct];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  // Calculate enhanced stats
  const totalProducts = sortedProducts.length;
  const outOfStock = sortedProducts.filter(p => p.currentStock === 0).length;
  const lowStock = sortedProducts.filter(p => p.currentStock > 0 && p.currentStock < 10).length;
  const totalValue = sortedProducts.reduce((sum, p) => sum + (p.priceTTC || 0) * p.currentStock, 0);
  const categoriesCount = new Set(sortedProducts.map(p => p.category_id).filter(Boolean)).size;

  return (
      <div className="min-h-screen bg-background relative overflow-hidden">

        <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                Stock avec Catégories
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>Gestion organisée de votre inventaire</span>
              </p>
            </div>
            <div className="flex gap-3">
              {/* Manage Categories Button */}
              <Button
                  onClick={() => setManageCategoriesDialogOpen(true)}
                  className="bg-blue-700 text-white border border-blue-700 hover:bg-blue-800 font-medium shadow-sm"
                  variant="default"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Gérer catégories
              </Button>

              <Dialog open={favoritesImportOpen} onOpenChange={setFavoritesImportOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600/40 text-amber-200 border-amber-500/60 hover:bg-amber-600/50 font-medium" variant="outline">
                    <Star className="w-4 h-4 mr-2" />
                    Importer favoris
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[700px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Importer depuis les favoris</DialogTitle>
                    <DialogDescription>
                      Sélectionnez les produits favoris que vous souhaitez ajouter à votre stock.
                    </DialogDescription>
                  </DialogHeader>
                  <ImportFromFavorites
                      onImportSuccess={handleFavoritesImportSuccess}
                      user={user}
                      categories={categories}
                      subcategories={subcategories}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={pdfImportOpen} onOpenChange={setPdfImportOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600/40 text-blue-200 border-blue-500/60 hover:bg-blue-600/50 font-medium" variant="outline">
                    <Package className="w-4 h-4 mr-2" />
                    Importer PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground !w-[70vw] !max-w-none !h-[90vh] !max-h-none overflow-hidden flex flex-col !m-0 !rounded-lg !border !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !p-0">
                  <DialogHeader className="flex-shrink-0 px-16 py-6 border-b border-border/20">
                    <DialogTitle className="text-3xl font-semibold">Importer depuis un PDF</DialogTitle>
                    <DialogDescription className="text-lg">
                      Téléchargez un PDF contenant des informations produit pour l'analyser automatiquement.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto px-16 py-8">
                    <div className="space-y-8">
                      {!extractedPdfData && !pdfProcessing && (
                        <div className="border-2 border-dashed border-border/50 rounded-lg p-20 text-center max-w-4xl mx-auto">
                          <Package className="w-24 h-24 mx-auto mb-10 text-muted-foreground" />
                          <h3 className="text-3xl font-semibold mb-6">Sélectionner un PDF</h3>
                          <p className="text-xl text-muted-foreground mb-10">
                            Formats supportés: Factures, bons de livraison, catalogues produits
                          </p>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handlePdfUpload(e.target.files[0])
                              }
                            }}
                            className="hidden"
                            id="pdf-upload-input"
                          />
                          <Button 
                            type="button" 
                            size="lg"
                            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 px-12 py-5 text-xl"
                            onClick={() => {
                              const fileInput = document.getElementById('pdf-upload-input') as HTMLInputElement;
                              if (fileInput) {
                                fileInput.click();
                              }
                            }}
                          >
                            <Plus className="w-7 h-7 mr-5" />
                            Choisir un fichier PDF
                          </Button>
                        </div>
                      )}
                      
                      {pdfProcessing && (
                        <div className="flex flex-col items-center justify-center py-24">
                          <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin mb-10"></div>
                          <p className="text-2xl text-muted-foreground">Analyse du PDF en cours...</p>
                        </div>
                      )}
                      
                      {extractedPdfData && (
                        <div className="space-y-8">
                          {/* Header with stats and actions - More horizontal */}
                          <div className="bg-muted/20 rounded-lg p-8">
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-12">
                                <h3 className="text-2xl font-semibold text-foreground">Données extraites</h3>
                                <Badge variant="secondary" className="font-medium text-lg px-8 py-3">
                                  {extractedPdfData.products.length} produits
                                </Badge>
                                <Badge variant={selectedProducts.length > 0 ? "default" : "outline"} className="font-medium text-lg px-8 py-3">
                                  {selectedProducts.length} sélectionnés
                                </Badge>
                              </div>
                              <div className="flex gap-8">
                                <Button 
                                  variant="outline" 
                                  size="lg"
                                  onClick={() => setSelectedProducts(editableProducts.map((_, index) => index))}
                                  className="px-10 py-3 text-lg"
                                >
                                  Tout sélectionner
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="lg"
                                  onClick={() => setSelectedProducts([])}
                                  className="px-10 py-3 text-lg"
                                >
                                  Tout désélectionner
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Products Grid - Two Column Layout */}
                          {editableProducts.length > 0 ? (
                            <div className="grid grid-cols-2 gap-6">
                              {editableProducts.map((product, index) => {
                                const isSelected = selectedProducts.includes(index)
                                return (
                                  <div 
                                    key={index} 
                                    className={`relative p-4 border rounded-lg transition-all duration-200 hover:shadow-lg ${
                                      isSelected 
                                        ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/30' 
                                        : 'border-border hover:border-primary/40 hover:shadow-md'
                                    }`}
                                  >
                                    {/* Selection Checkbox */}
                                    <div className="absolute top-3 right-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedProducts([...selectedProducts, index])
                                          } else {
                                            setSelectedProducts(selectedProducts.filter(i => i !== index))
                                          }
                                        }}
                                        className="h-5 w-5"
                                      />
                                    </div>
                                    
                                    {/* Product Content - Compact Vertical Layout */}
                                    <div className="space-y-3 pr-8">
                                      {/* Product Name */}
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Nom du produit</Label>
                                        <Input
                                          value={product.productName}
                                          onChange={(e) => {
                                            const updated = [...editableProducts]
                                            updated[index] = { ...updated[index], productName: e.target.value }
                                            setEditableProducts(updated)
                                          }}
                                          className="border border-border/50 bg-background/50 px-3 py-2 h-auto text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md w-full"
                                          placeholder="Nom du produit"
                                        />
                                      </div>
                                      
                                      {/* Price and Quantity Row */}
                                      <div className="grid grid-cols-2 gap-3">
                                        {/* Price */}
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Prix</Label>
                                          <div className="flex items-center">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={product.price || 0}
                                              onChange={(e) => {
                                                const updated = [...editableProducts]
                                                updated[index] = { ...updated[index], price: parseFloat(e.target.value) || 0 }
                                                setEditableProducts(updated)
                                              }}
                                              className="border border-border/50 bg-background/50 px-3 py-2 h-auto text-lg font-bold focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md w-full"
                                              placeholder="0.00"
                                            />
                                            <span className="text-lg font-bold text-muted-foreground ml-2">€</span>
                                          </div>
                                        </div>
                                        
                                        {/* Quantity */}
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Quantité</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            value={product.quantity || 0}
                                            onChange={(e) => {
                                              const updated = [...editableProducts]
                                              updated[index] = { ...updated[index], quantity: parseInt(e.target.value) || 0 }
                                              setEditableProducts(updated)
                                            }}
                                            className="border border-border/50 bg-background/50 px-3 py-2 h-auto text-lg font-bold focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md w-full"
                                            placeholder="0"
                                          />
                                        </div>
                                      </div>
                                      
                                      {/* Description */}
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Description</Label>
                                        <textarea
                                          value={product.description}
                                          onChange={(e) => {
                                            const updated = [...editableProducts]
                                            updated[index] = { ...updated[index], description: e.target.value }
                                            setEditableProducts(updated)
                                          }}
                                          className="w-full border border-border/50 bg-background/50 px-3 py-2 text-sm text-foreground resize-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md h-16 leading-relaxed"
                                          placeholder="Description du produit"
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Selection Indicator */}
                                    {isSelected && (
                                      <div className="absolute bottom-3 right-3">
                                        <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                              <Package className="w-20 h-20 text-muted-foreground/50 mb-6" />
                              <p className="text-lg text-muted-foreground">Aucun produit détecté</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {extractedPdfData && (
                    <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur-sm px-10 py-8">
                      <div className="flex gap-8 justify-between items-center">
                        <p className="text-lg text-muted-foreground font-medium">
                          {selectedProducts.length} produit(s) sélectionné(s) sur {editableProducts.length}
                        </p>
                        <div className="flex gap-6">
                          <Button 
                            variant="outline" 
                            size="lg"
                            onClick={() => {
                              setExtractedPdfData(null)
                              setSelectedProducts([])
                              setEditableProducts([])
                              setPdfImportOpen(false)
                            }}
                            className="px-10 py-3 text-lg"
                          >
                            Annuler
                          </Button>
                          <Button 
                            onClick={handlePdfImportConfirm}
                            disabled={selectedProducts.length === 0}
                            size="lg"
                            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 px-8 py-2 text-base"
                          >
                            Ajouter {selectedProducts.length} produit(s)
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau produit
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Ajouter un nouveau produit</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations du produit ci-dessous.
                    </DialogDescription>
                  </DialogHeader>
                  <ProductForm
                      onSuccess={handleFormSuccess}
                      user={user}
                      categories={categories}
                      subcategories={subcategories}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Enhanced Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02]">
              
              <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total produits</p>
                  <p className="text-3xl font-bold text-foreground">{totalProducts}</p>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <Package className="w-3 h-3 text-chart-2" />
                    <span className="text-chart-2">En stock</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-chart-2/20 to-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-chart-2" />
                </div>
              </div>
            </div>

            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">En rupture</p>
                  <p className="text-3xl font-bold text-foreground">{outOfStock}</p>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    <span className="text-red-500">À réapprovisionner</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </div>

            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Stock faible</p>
                  <p className="text-3xl font-bold text-foreground">{lowStock}</p>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <TrendingUp className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-500">Attention requise</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </div>

            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Valeur totale</p>
                  <p className="text-3xl font-bold text-foreground">€{totalValue.toFixed(2)}</p>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <TrendingUp className="w-3 h-3 text-green-700" />
                <span className="text-green-700">TTC incluse</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-600/30 to-emerald-600/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-green-700" />
                </div>
              </div>
            </div>

            <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Catégories</p>
                  <p className="text-3xl font-bold text-foreground">{categoriesCount}</p>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <Tag className="w-3 h-3 text-purple-500" />
                    <span className="text-purple-500">Organisées</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Tag className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Controls with Category Filtering */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    type="text"
                    placeholder="Rechercher un produit..."
                    className="pl-10 bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                      id="hideZeroStock"
                      checked={hideZeroStock}
                      onCheckedChange={(checked) => setHideZeroStock(checked === true)}
                      className="border-border/50"
                  />
                  <Label htmlFor="hideZeroStock" className="text-muted-foreground cursor-pointer text-sm">
                    Masquer ruptures
                  </Label>
                </div>

                {/* Category Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="border-border/50 hover:bg-muted/50">
                      <Tag className="w-4 h-4 mr-2" />
                      {selectedCategoryId ? categories.find(c=>c.id === selectedCategoryId)?.name : "Catégories"}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0 bg-card/80 backdrop-blur-xl border-border/50 text-foreground">
                    <div className="p-4 max-h-[50vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-sm">Filtrer par catégorie</h4>
                        <Badge variant="secondary" className="text-xs">
                          {categories.length} catégories
                        </Badge>
                      </div>
                      <Button
                          variant={!selectedCategoryId ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start mb-2"
                          onClick={() => { setSelectedCategoryId(null); setSelectedSubcategoryId(null); }}
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Toutes les catégories
                      </Button>
                      {categories.length === 0 ? (
                          <div className="text-center py-6">
                            <Tag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Aucune catégorie</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary mt-2"
                                onClick={() => setManageCategoriesDialogOpen(true)}
                            >
                              Créer une catégorie
                            </Button>
                          </div>
                      ) : (
                          categories.map(cat => (
                              <div key={cat.id} className="space-y-1">
                                <Button
                                    variant={selectedCategoryId === cat.id ? "secondary" : "ghost"}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => { setSelectedCategoryId(cat.id); setSelectedSubcategoryId(null); }}
                                >
                                  <Tag className="w-4 h-4 mr-2" />
                                  {cat.name}
                                  <Badge variant="outline" className="ml-auto text-xs">
                                    {sortedProducts.filter(p => p.category_id === cat.id).length}
                                  </Badge>
                                </Button>
                                {selectedCategoryId === cat.id && subcategories.filter(s => s.category_id === cat.id).length > 0 && (
                                    <div className="pl-6 space-y-1 border-l border-border/30 ml-2">
                                      <Button
                                          variant={!selectedSubcategoryId ? "secondary" : "ghost"}
                                          size="sm"
                                          className="w-full justify-start text-xs"
                                          onClick={() => setSelectedSubcategoryId(null)}
                                      >
                                        Toutes les sous-catégories
                                      </Button>
                                      {subcategories.filter(s => s.category_id === cat.id).map(sub => (
                                          <Button
                                              key={sub.id}
                                              variant={selectedSubcategoryId === sub.id ? "secondary" : "ghost"}
                                              size="sm"
                                              className="w-full justify-start text-xs"
                                              onClick={() => setSelectedSubcategoryId(sub.id)}
                                          >
                                            {sub.name}
                                            <Badge variant="outline" className="ml-auto text-xs">
                                              {sortedProducts.filter(p => p.subcategory_id === sub.id).length}
                                            </Badge>
                                          </Button>
                                      ))}
                                    </div>
                                )}
                              </div>
                          ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex gap-2">
                  <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/50 hover:bg-muted/50'}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className={viewMode === 'table' ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/50 hover:bg-muted/50'}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSort('currentStock')}
                      className="border-border/50 text-muted-foreground hover:bg-muted/50"
                  >
                    Stock <ArrowUpDown className={`ml-2 h-3 w-3 ${sortField === 'currentStock' ? 'text-primary' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Products Display */}
          {loading || loadingCategories || loadingSubcategories ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-medium text-foreground">Chargement des produits...</p>
              </div>
          ) : sortedProducts.length > 0 ? (
              <>
                {/* Category Filter Summary */}
                {(selectedCategoryId || selectedSubcategoryId) && (
                    <div className="bg-card/40 backdrop-blur-xl border border-border/30 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Tag className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Filtré par: {selectedCategoryId && categories.find(c => c.id === selectedCategoryId)?.name}
                              {selectedSubcategoryId && ` → ${subcategories.find(s => s.id === selectedSubcategoryId)?.name}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sortedProducts.length} produit(s) dans cette catégorie
                            </p>
                          </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {setSelectedCategoryId(null); setSelectedSubcategoryId(null);}}
                            className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Effacer filtres
                        </Button>
                      </div>
                    </div>
                )}

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {sortedProducts.map((product: GroupedProduct) => (
                          <ProductCard
                              key={product.id}
                              product={product}
                              onEdit={handleEditProduct}
                              onDelete={handleDeleteProduct}
                          />
                      ))}
                    </div>
                ) : (
                    <ProductTable
                        products={sortedProducts}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                    />
                )}
              </>
          ) : (
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl">
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    {searchTerm || selectedCategoryId ? (
                        <Search className="h-10 w-10 text-muted-foreground" />
                    ) : (
                        <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm || selectedCategoryId ? "Aucun produit trouvé" : "Votre stock est vide"}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    {searchTerm ?
                        "Aucun produit ne correspond à votre recherche." :
                        selectedCategoryId ?
                            "Aucun produit dans cette catégorie." :
                            "Commencez par ajouter des produits à votre stock."
                    }
                  </p>
                  <div className="flex gap-3 justify-center">
                    {searchTerm || selectedCategoryId ? (
                        <Button
                            onClick={() => {setSearchTerm(''); setSelectedCategoryId(null); setSelectedSubcategoryId(null);}}
                            variant="outline"
                            className="border-border/50 hover:bg-muted/50"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Effacer les filtres
                        </Button>
                    ) : null}
                    <Button
                        onClick={() => setOpen(true)}
                        className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un produit
                    </Button>
                    {categories.length === 0 && (
                        <Button
                            onClick={() => setManageCategoriesDialogOpen(true)}
                            variant="outline"
                            className="border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          Créer des catégories
                        </Button>
                    )}
                  </div>
                </div>
              </div>
          )}
        </div>

        {/* Category Management Modal */}
        <CategoryManagement
            isOpen={manageCategoriesDialogOpen}
            onClose={() => setManageCategoriesDialogOpen(false)}
            categories={categories}
            subcategories={subcategories}
            onCategoriesUpdate={handleCategoriesUpdate}
            user={user}
        />

        {/* Edit Product Modal */}
        <EditProductModal
            productId={editingProductId}
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            user={user}
            categories={categories}
            subcategories={subcategories}
        />

        {/* Delete Product Modal */}
        <DeleteProductModal
            isOpen={isDeleteModalOpen}
            onClose={handleCloseDeleteModal}
            product={productToDelete}
            onConfirm={handleConfirmDelete}
            isDeleting={isDeleting}
        />

        <Toaster position="top-right" richColors />
      </div>
  )
}