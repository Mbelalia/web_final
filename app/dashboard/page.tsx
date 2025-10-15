"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { Package, ShoppingCart, AlertTriangle, DollarSign, BarChart2, Clock, Plus, TrendingUp, Star, Zap, ArrowUpRight, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Types pour les données - Updated to match your actual schema
interface Product {
  id: string
  name: string
  description?: string
  currentStock: number
  minStock?: number
  priceHT?: number
  priceTTC?: number
  imageUrl?: string
  category_id?: string | null
  subcategory_id?: string | null
  favorite: boolean
  user_id: string
}

interface InventoryMovement {
  id: string
  product: Product
  quantity: number
  type: 'IN' | 'OUT'
  reference: string
  created_at: string
  user_id: string
  user: {
    name: string
  }
}

export default function ModernDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInventoryProducts: 0,
    totalFavoriteProducts: 0,
    productsToOrder: 0,
    lowStockProducts: 0,
    inventoryValueHT: 0,
    inventoryValueTTC: 0,
    favoriteValueHT: 0,
    favoriteValueTTC: 0
  })
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([])

  // Check authentication status
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

  // Fetch data when user is available
  useEffect(() => {
    if (user && !authLoading) {
      fetchData()
    }
  }, [user, authLoading])

  async function fetchData() {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
      
      if (productsError) throw productsError

      if (!allProducts) {
        setLoading(false)
        return
      }

      const inventoryProducts = allProducts.filter(p => !p.favorite)
      const favoriteProducts = allProducts.filter(p => p.favorite)

      const outOfStock = inventoryProducts.filter(p => p.currentStock === 0)
      const lowStock = inventoryProducts.filter(p => 
        p.currentStock > 0 && 
        p.minStock && 
        p.currentStock < p.minStock
      )

      const inventoryValueHT = inventoryProducts.reduce((total, product) => {
        const priceHT = product.priceHT || 0
        return total + (product.currentStock * priceHT)
      }, 0)

      const inventoryValueTTC = inventoryProducts.reduce((total, product) => {
        const priceTTC = product.priceTTC || 0
        return total + (product.currentStock * priceTTC)
      }, 0)

      const favoriteValueHT = favoriteProducts.reduce((total, product) => {
        const priceHT = product.priceHT || 0
        return total + priceHT
      }, 0)

      const favoriteValueTTC = favoriteProducts.reduce((total, product) => {
        const priceTTC = product.priceTTC || 0
        return total + priceTTC
      }, 0)

      setStats({
        totalProducts: allProducts.length,
        totalInventoryProducts: inventoryProducts.length,
        totalFavoriteProducts: favoriteProducts.length,
        productsToOrder: outOfStock.length,
        lowStockProducts: lowStock.length,
        inventoryValueHT,
        inventoryValueTTC,
        favoriteValueHT,
        favoriteValueTTC
      })

      setLowStockProducts(lowStock)
      setOutOfStockProducts(outOfStock)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.")
      return
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${productName}" ?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success(`Produit "${productName}" supprimé avec succès`)
      fetchData()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast.error(`Erreur lors de la suppression: ${error.message}`)
    }
  }

  const handleDeleteAllOutOfStock = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.")
      return
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer tous les ${outOfStockProducts.length} produits en rupture ?`)) {
      return
    }

    try {
      const productIds = outOfStockProducts.map(p => p.id)
      
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', productIds)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success(`${outOfStockProducts.length} produits en rupture supprimés avec succès`)
      fetchData()
    } catch (error: any) {
      console.error('Error deleting out of stock products:', error)
      toast.error(`Erreur lors de la suppression: ${error.message}`)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Inventory Products */}
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02]">
            
            <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Produits en stock</p>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.totalInventoryProducts}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-chart-2/20 to-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-chart-2" />
              </div>
            </div>
          </div>
          
          {/* Products to Order */}
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Produits en rupture</p>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.productsToOrder}</p>
                
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
          
          {/* Low Stock */}
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Stock faible</p>
                <p className="text-3xl font-bold text-foreground mb-1">{stats.lowStockProducts}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>
          
          {/* Inventory Value */}
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Valeur inventaire</p>
                <p className="text-3xl font-bold text-foreground mb-1">€{stats.inventoryValueTTC.toFixed(2)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <ArrowUpRight className="w-3 h-3 text-blue-800" />
                <span className="text-blue-800">HT: €{stats.inventoryValueHT.toFixed(2)}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600/30 to-blue-700/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-blue-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Favorites */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                
                <div className="w-10 h-10 bg-gradient-to-br from-chart-3/20 to-accent/20 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Produits favoris</h3>
                  <p className="text-sm text-muted-foreground">Catalogue de référence</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-foreground">{stats.totalFavoriteProducts}</span>
            </div>
          </div>

          {/* Average Value */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-chart-2/20 to-primary/20 rounded-lg flex items-center justify-center">
                  <BarChart2 className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Valeur moyenne</h3>
                  <p className="text-sm text-muted-foreground">Par produit TTC</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-foreground">
                €{stats.totalInventoryProducts > 0 ? (stats.inventoryValueTTC / stats.totalInventoryProducts).toFixed(2) : '0'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Actions rapides</h3>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start text-left h-auto p-3 hover:bg-primary/10">
                <Plus className="w-4 h-4 mr-3 text-primary" />
                <div>
                  <div className="font-medium">Ajouter un produit</div>
                  <div className="text-xs text-muted-foreground">Nouveau produit à l'inventaire</div>
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-left h-auto p-3 hover:bg-secondary/10">
                <BarChart2 className="w-4 h-4 mr-3 text-secondary" />
                <div>
                  <div className="font-medium">Voir les rapports</div>
                  <div className="text-xs text-muted-foreground">Analyses détaillées</div>
                </div>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Out of Stock Products */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Produits en rupture</h3>
                  <p className="text-sm text-muted-foreground">Produits avec un stock de 0</p>
                </div>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                  onClick={handleDeleteAllOutOfStock}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer tout
                  </Button>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {outOfStockProducts.length > 0 ? (
                <div className="p-6 space-y-4">
                  {outOfStockProducts.map((product, index) => (
                    <div key={product.id} className="group flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">Stock: {product.currentStock}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                          Rupture
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-green-600/30 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-green-700" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Aucune rupture de stock</h4>
                  <p className="text-sm text-muted-foreground">Tous vos produits sont disponibles</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Low Stock Products */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Stock faible</h3>
                <p className="text-sm text-muted-foreground">Produits sous le seuil minimal</p>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {lowStockProducts.length > 0 ? (
                <div className="p-6 space-y-4">
                  {lowStockProducts.map((product, index) => (
                    // Amber colors for low stock items
                    <div key={product.id} className="flex items-center justify-between p-4 bg-chart-4/5 border border-chart-4/10 rounded-xl hover:bg-chart-4/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-chart-4/20 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-chart-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Stock: {product.currentStock} / Min: {product.minStock || 0}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-chart-4/20 text-chart-4 text-xs font-medium rounded-full">
                        Stock faible
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-green-600/30 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-chart-1" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Stock optimal</h4>
                  <p className="text-sm text-muted-foreground">Aucun produit en dessous du seuil</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Inventory Overview */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Vue d'ensemble de l'inventaire</h3>
                <p className="text-sm text-muted-foreground">Statistiques détaillées de votre stock</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="text-2xl font-bold text-primary mb-1">{stats.totalInventoryProducts}</div>
                <div className="text-sm text-muted-foreground">Produits total</div>
              </div>
              <div className="text-center p-4 bg-blue-600/15 rounded-xl border border-blue-600/20">
              <div className="text-2xl font-bold text-blue-800 mb-1">€{stats.inventoryValueTTC.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Valeur TTC</div>
              </div>
              <div className="text-center p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <div className="text-2xl font-bold text-blue-500 mb-1">€{stats.inventoryValueHT.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Valeur HT</div>
              </div>
              <div className="text-center p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                <div className="text-2xl font-bold text-purple-500 mb-1">{stats.totalFavoriteProducts}</div>
                <div className="text-sm text-muted-foreground">Favoris</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}