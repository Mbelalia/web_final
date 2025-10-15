"use client"

import React, { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
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
import { 
  Search, 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Tag
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from "sonner"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"

// Import the split components from index
import { 
  ApartmentForm,
  MovementForm,
  ReverseMovementForm,
  ApartmentCard,
  ApartmentDetailModal,
  RecentMovementsTable,
  DeleteConfirmationModal,
  StatsGrid,
  Apartment,
  Movement,
  ApartmentSummary
} from '@/components/mouvements/index'

export default function MovementsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [apartments, setApartments] = useState<ApartmentSummary[]>([])
  const [recentMovements, setRecentMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [createApartmentOpen, setCreateApartmentOpen] = useState(false)
  const [createMovementOpen, setCreateMovementOpen] = useState(false)
  const [reverseMovementOpen, setReverseMovementOpen] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<ApartmentSummary | null>(null)
  const [apartmentDetailOpen, setApartmentDetailOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [apartmentToDelete, setApartmentToDelete] = useState<ApartmentSummary | null>(null)

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

    // Listen for auth changes
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

  const fetchData = async () => {
    if (!user) return
    
    await Promise.all([
      fetchApartmentsSummary(),
      fetchRecentMovements()
    ])
    setLoading(false)
  }

  const fetchApartmentsSummary = async () => {
    if (!user) return
    
    try {
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (apartmentsError) throw apartmentsError

      if (!apartmentsData || apartmentsData.length === 0) {
        setApartments([])
        return
      }

      // Get movements for each apartment
      const apartmentSummaries: ApartmentSummary[] = await Promise.all(
        apartmentsData.map(async (apartment: Apartment) => {
        const { data: movements, error: movementsError } = await supabase
            .from('movements')
            .select('quantity, priceht, pricettc')
            .eq('apartment_id', apartment.id)
            .eq('user_id', user.id)
          
          if (movementsError) {
            console.error('Error fetching movements for apartment:', apartment.id, movementsError)
          }

          const totalItems = movements?.reduce((sum: number, m: any) => sum + m.quantity, 0) || 0
          const totalValueHT = movements?.reduce((sum: number, m: any) => sum + (m.priceht * m.quantity), 0) || 0
          const totalValueTTC = movements?.reduce((sum: number, m: any) => sum + (m.pricettc * m.quantity), 0) || 0
          const itemCount = movements?.length || 0

          return {
            apartment,
            totalItems,
            totalValueHT,
            totalValueTTC,
            itemCount
          }
        })
      )

      setApartments(apartmentSummaries)
    } catch (error) {
      console.error('Error fetching apartments:', error)
      toast.error('Erreur lors du chargement des appartements')
    }
  }

  const fetchRecentMovements = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      setRecentMovements(data || [])
    } catch (error) {
      console.error('Error fetching recent movements:', error)
    }
  }

  const handleCreateSuccess = () => {
    setCreateApartmentOpen(false)
    setCreateMovementOpen(false)
    fetchData()
  }

  const openApartmentDetail = (apartment: ApartmentSummary) => {
    setSelectedApartment(apartment)
    setApartmentDetailOpen(true)
  }

  const handleDeleteRequest = (apartment: ApartmentSummary) => {
    setApartmentToDelete(apartment)
    setDeleteConfirmOpen(true)
    setApartmentDetailOpen(false)
  }

  // Enhanced PDF generation with category information
  // Enhanced PDF generation with French best practices and proper encoding
  const generatePDF = (apartment: ApartmentSummary, products: any[]) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      floatPrecision: 16 // or "smart", default is 16
    })
    
    // Configuration des couleurs avec types tuple corrects
    const primaryColor: [number, number, number] = [41, 128, 185] // Bleu professionnel
    const secondaryColor: [number, number, number] = [52, 73, 94] // Gris foncé
    const accentColor: [number, number, number] = [231, 76, 60] // Rouge pour les montants
    const lightGray: [number, number, number] = [236, 240, 241] // Gris clair pour les séparateurs
    
    let yPosition = 20
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 20
    
    // === EN-TÊTE AVEC LOGO/DESIGN ===
    // Bande de couleur en haut
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 15, 'F')
    
    yPosition = 35
    
    // Titre principal avec style
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(...primaryColor)
    doc.text('RAPPORT D\'INVENTAIRE', margin, yPosition)
    
    // Sous-titre
    doc.setFontSize(12)
    doc.setTextColor(...secondaryColor)
    doc.text('Document officiel d\'état des stocks', margin, yPosition + 8)
    
    yPosition += 25
    
    // === INFORMATIONS GÉNÉRALES DANS UN CADRE ===
    // Cadre pour les informations de l'appartement
    doc.setDrawColor(...lightGray)
    doc.setLineWidth(0.5)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 45)
    
    // Titre de section
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...primaryColor)
    doc.text('INFORMATIONS DE L\'APPARTEMENT', margin + 5, yPosition + 10)
    
    // Informations de l'appartement avec icônes (sans emojis pour éviter les problèmes d'encodage)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...secondaryColor)
    
    const apartmentInfo = [
      `Nom : ${apartment.apartment.name}`,
      `Adresse : ${apartment.apartment.address || 'Non renseignée'}`,
      `Description : ${apartment.apartment.description || 'Aucune description'}`,
      `Date d'export : ${new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
    ]
    
    apartmentInfo.forEach((info, index) => {
      doc.text(info, margin + 10, yPosition + 20 + (index * 7))
    })
    
    yPosition += 60
    
    // === RÉSUMÉ FINANCIER AVEC MISE EN VALEUR ===
    // Titre de section avec ligne décorative
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...primaryColor)
    doc.text('RÉSUMÉ FINANCIER', margin, yPosition)
    
    // Ligne décorative
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(2)
    doc.line(margin, yPosition + 3, margin + 80, yPosition + 3)
    
    yPosition += 15
    
    // Statistiques dans des boîtes colorées
    const stats = [
      { label: 'Types de produits', value: products.length.toString() },
      { label: 'Articles totaux', value: apartment.totalItems.toString() },
      { label: 'Valeur TTC', value: `${apartment.totalValueTTC.toFixed(2)} €`, highlight: true },
      { label: 'Valeur HT', value: `${apartment.totalValueHT.toFixed(2)} €` }
    ]
    
    stats.forEach((stat, index) => {
      const boxWidth = (pageWidth - 3 * margin) / 2
      const boxHeight = 25
      const xPos = margin + (index % 2) * (boxWidth + 10)
      const yPos = yPosition + Math.floor(index / 2) * (boxHeight + 5)
      
      // Boîte avec couleur spéciale pour la valeur TTC
      if (stat.highlight) {
        doc.setFillColor(...accentColor)
        doc.setTextColor(255, 255, 255)
      } else {
        doc.setFillColor(...lightGray)
        doc.setTextColor(...secondaryColor)
      }
      
      doc.rect(xPos, yPos, boxWidth, boxHeight, 'F')
      
      // Texte dans la boîte
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(stat.label, xPos + 5, yPos + 8)
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(stat.value, xPos + 5, yPos + 18)
    })
    
    yPosition += 65
    
    // === DÉTAIL DES PRODUITS AVEC TABLEAU ===
    if (yPosition > pageHeight - 100) {
      doc.addPage()
      yPosition = 30
    }
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...primaryColor)
    doc.text('DÉTAIL DES PRODUITS', margin, yPosition)
    
    // Ligne décorative
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(2)
    doc.line(margin, yPosition + 3, margin + 80, yPosition + 3)
    
    yPosition += 20
    
    // En-tête du tableau
    const tableHeaders = ['Produit', 'Catégorie', 'Quantité', 'Valeur TTC']
    const colWidths = [60, 50, 25, 35]
    let xPos = margin
    
    // Fond de l'en-tête
    doc.setFillColor(...primaryColor)
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    
    tableHeaders.forEach((header, index) => {
      doc.text(header, xPos + 2, yPosition + 8)
      xPos += colWidths[index]
    })
    
    yPosition += 15
    
    // Lignes du tableau
    products.forEach((product: any, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = 30
      }
      
      // Alternance de couleurs pour les lignes
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250)
        doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, 12, 'F')
      }
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...secondaryColor)
      
      xPos = margin
      // Dans la section du tableau des produits (ligne ~400)
      const rowData = [
        product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name,
        // Correction : utiliser la bonne structure de données
        (product.category && product.subcategory) 
          ? `${product.category} > ${product.subcategory}`
          : product.category || 'Non catégorisé',
        product.totalQuantity.toString(),
        `${product.totalValueTTC.toFixed(2)} €`
      ]
      
      rowData.forEach((data, colIndex) => {
        doc.text(data, xPos + 2, yPosition + 6)
        xPos += colWidths[colIndex]
      })
      
      yPosition += 12
    })
    
    yPosition += 20
    
    // === ANALYSE PAR CATÉGORIE AVEC GRAPHIQUE TEXTUEL ===
    if (yPosition > pageHeight - 100) {
      doc.addPage()
      yPosition = 30
    }
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...primaryColor)
    doc.text('ANALYSE PAR CATÉGORIE', margin, yPosition)
    
    // Ligne décorative
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(2)
    doc.line(margin, yPosition + 3, margin + 80, yPosition + 3)
    
    yPosition += 20
    
    // Dans la section d'analyse par catégorie (ligne ~430)
    const categoryStats = products.reduce((acc: any, product: any) => {
    // Correction : utiliser la structure correcte
    const category = product.category || 'Non catégorisé'
    const subcategory = product.subcategory
    
    // Créer une clé combinée si sous-catégorie existe
    const categoryKey = subcategory ? `${category} > ${subcategory}` : category
    
    if (!acc[categoryKey]) {
      acc[categoryKey] = {
        count: 0,
        totalQuantity: 0,
        totalValueTTC: 0
      }
    }
    acc[categoryKey].count += 1
    acc[categoryKey].totalQuantity += product.totalQuantity
    acc[categoryKey].totalValueTTC += product.totalValueTTC
    return acc
    }, {} as any)
    
    const maxValue = Math.max(...Object.values(categoryStats).map((stat: any) => stat.totalValueTTC))
    
    Object.entries(categoryStats).forEach(([category, stats]: [string, any]) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = 30
      }
      
      // Nom de la catégorie
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...secondaryColor)
      doc.text(`${category}`, margin, yPosition)
      
      // Barre de progression visuelle
      const barWidth = (stats.totalValueTTC / maxValue) * 100
      doc.setFillColor(...primaryColor)
      doc.rect(margin + 5, yPosition + 5, barWidth, 4, 'F')
      
      // Statistiques détaillées
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...secondaryColor)
      
      const categoryDetails = [
        `   • ${stats.count} type(s) de produit(s)`,
        `   • ${stats.totalQuantity} article(s) au total`,
        `   • ${stats.totalValueTTC.toFixed(2)} € TTC (${((stats.totalValueTTC / apartment.totalValueTTC) * 100).toFixed(1)}% du total)`
      ]
      
      categoryDetails.forEach((detail, detailIndex) => {
        doc.text(detail, margin, yPosition + 15 + (detailIndex * 6))
      })
      
      yPosition += 40
    })
    
    // === PIED DE PAGE PROFESSIONNEL ===
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      
      // Ligne de séparation
      doc.setDrawColor(...lightGray)
      doc.setLineWidth(0.5)
      doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25)
      
      // Informations du pied de page
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      
      // Gauche : informations du document
      doc.text(
        `Rapport généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
        margin,
        pageHeight - 15
      )
      
      // Centre : nom de l'appartement
      const centerText = `Appartement: ${apartment.apartment.name}`
      const centerX = (pageWidth - doc.getTextWidth(centerText)) / 2
      doc.text(centerText, centerX, pageHeight - 15)
      
      // Droite : numéro de page
      const pageText = `Page ${i} sur ${totalPages}`
      const pageX = pageWidth - margin - doc.getTextWidth(pageText)
      doc.text(pageText, pageX, pageHeight - 15)
      
      // Informations de confidentialité
      doc.setFontSize(7)
      doc.text(
        'Document confidentiel - Usage interne uniquement',
        margin,
        pageHeight - 8
      )
    }
    
    // === SAUVEGARDE AVEC NOM FRANÇAIS ===
    const fileName = `Inventaire_${apartment.apartment.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    
    toast.success('Rapport d\'inventaire PDF généré avec succès !')
  }

  const handleDeleteApartment = async (apartment: ApartmentSummary) => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.")
      return
    }
    
    try {
      // First delete all movements for this apartment
      const { error: movementsError } = await supabase
        .from('movements')
        .delete()
        .eq('apartment_id', apartment.apartment.id)
        .eq('user_id', user.id)
      
      if (movementsError) throw movementsError

      // Then delete the apartment
      const { error: apartmentError } = await supabase
        .from('apartments')
        .delete()
        .eq('id', apartment.apartment.id)
        .eq('user_id', user.id)
      
      if (apartmentError) throw apartmentError

      toast.success(`Appartement "${apartment.apartment.name}" supprimé avec succès`)
      setDeleteConfirmOpen(false)
      setApartmentToDelete(null)
      fetchData()
    } catch (error: any) {
      console.error('Error deleting apartment:', error)
      toast.error(`Erreur lors de la suppression: ${error.message}`)
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

  // Don't render anything if user is not authenticated
  if (!user) {
    return null
  }

  const filteredApartments = apartments.filter((apt: ApartmentSummary) =>
    apt.apartment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.apartment.address?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-8">
        <Toaster position="top-right" richColors />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Lieu avec Catégories
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>Gérez vos déploiements par lieu avec organisation par catégories</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={createApartmentOpen} onOpenChange={setCreateApartmentOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/30">
                  <Building2 className="mr-2 h-4 w-4" />
                  Nouvel appartement
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Créer un nouveau lieu</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouvel appartement ou lieu de déploiement.
                  </DialogDescription>
                </DialogHeader>
                <ApartmentForm onSuccess={handleCreateSuccess} user={user} />
              </DialogContent>
            </Dialog>
            
            <Dialog open={createMovementOpen} onOpenChange={setCreateMovementOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-chart-1 to-primary hover:from-primary hover:to-chart-1 text-primary-foreground">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Déplacer des produits
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Déplacer des produits</DialogTitle>
                  <DialogDescription>
                    Déplacez des produits de l'inventaire vers un appartement. Utilisez les filtres pour rechercher par catégorie.
                  </DialogDescription>
                </DialogHeader>
                <MovementForm onSuccess={handleCreateSuccess} user={user} />
              </DialogContent>
            </Dialog>

            <Dialog open={reverseMovementOpen} onOpenChange={setReverseMovementOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-blue-600/80 text-white border-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour/Transfert
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Retour au stock ou transfert</DialogTitle>
                  <DialogDescription>
                    Déplacez des produits d'un appartement vers le stock ou vers un autre appartement.
                  </DialogDescription>
                </DialogHeader>
                <ReverseMovementForm onSuccess={handleCreateSuccess} user={user} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Stats */}
        <StatsGrid apartments={apartments} recentMovements={recentMovements} />

        {/* Search and Refresh */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                type="text" 
                placeholder="Rechercher un appartement..." 
                className="pl-10 bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => fetchData()}
              className="border-border/50 hover:bg-muted/50"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Apartments List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium text-foreground">Chargement des appartements...</p>
          </div>
        ) : filteredApartments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApartments.map((apartment: ApartmentSummary) => (
              <ApartmentCard 
                key={apartment.apartment.id} 
                apartment={apartment} 
                onClick={openApartmentDetail}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? "Aucun appartement trouvé" : "Aucun appartement"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                {searchTerm ? "Aucun appartement ne correspond à votre recherche." : "Créez votre premier lieu de déploiement pour commencer."}
              </p>
              <Button 
                onClick={() => setCreateApartmentOpen(true)} 
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <Building2 className="mr-2 h-5 w-5" />
                Créer un appartement
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Recent Movements with Categories */}
        <RecentMovementsTable 
          movements={recentMovements}
          apartments={apartments}
          onCreateMovement={() => setCreateMovementOpen(true)}
        />

        {/* Apartment Detail Modal */}
        <ApartmentDetailModal 
          apartment={selectedApartment} 
          isOpen={apartmentDetailOpen} 
          onClose={() => setApartmentDetailOpen(false)}
          onDelete={handleDeleteRequest}
          onExportPDF={generatePDF}
          onMovementDeleted={fetchData} // Add this callback to refresh apartment data
          user={user}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal 
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          apartment={apartmentToDelete}
          onConfirm={handleDeleteApartment}
        />
      </div>
    </div>
  )
}