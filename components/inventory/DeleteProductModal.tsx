"use client"

import React from 'react'
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
import { Trash2, AlertTriangle, Tag } from 'lucide-react'

interface Product {
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
}

interface GroupedProduct extends Product {
    groupedIds?: string[];
    originalProducts?: Product[];
}

interface DeleteProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: GroupedProduct | null;
    onConfirm: (product: GroupedProduct) => void;
    isDeleting: boolean;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
                                                                          isOpen,
                                                                          onClose,
                                                                          product,
                                                                          onConfirm,
                                                                          isDeleting
                                                                      }) => {
    if (!product) return null

    const isGrouped = product.groupedIds && product.groupedIds.length > 1
    const totalValue = product.priceTTC ? (product.priceTTC * product.currentStock) : 0

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-red-400 flex items-center">
                        <Trash2 className="w-5 h-5 mr-2" />
                        Supprimer le produit
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {isGrouped
                            ? "Êtes-vous sûr de vouloir supprimer tous les exemplaires de ce produit ?"
                            : "Êtes-vous sûr de vouloir supprimer ce produit ?"
                        } Cette action est irréversible.
                    </DialogDescription>
                </DialogHeader>

                {/* Product Info */}
                <div className="bg-card/50 border border-border/30 p-4 rounded-xl mb-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h4 className="font-medium text-foreground text-lg">{product.name}</h4>
                            {product.description && (
                                <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                            )}
                            {product.reference && (
                                <p className="text-xs text-muted-foreground">Réf: {product.reference}</p>
                            )}
                        </div>
                    </div>

                    {/* Category and Subcategory badges */}
                    <div className="flex gap-2 mb-3">
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

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Stock total: </span>
                            <span className="text-foreground font-medium">{product.currentStock} unités</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Valeur TTC: </span>
                            <span className="text-blue-800 font-medium">{totalValue.toFixed(2)}€</span>
                        </div>
                        {isGrouped && (
                            <>
                                <div>
                                    <span className="text-muted-foreground">Groupés: </span>
                                    <span className="text-blue-400 font-medium">{product.groupedIds?.length} exemplaires</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Prix unitaire: </span>
                                    <span className="text-foreground font-medium">{product.priceTTC?.toFixed(2) || '0.00'}€</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                    <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-red-400 text-sm font-medium mb-1">
                                ⚠️ Suppression définitive
                            </p>
                            <p className="text-red-400 text-xs">
                                {isGrouped
                                    ? `Cette action supprimera définitivement tous les ${product.groupedIds?.length} exemplaires de ce produit et toutes les données associées.`
                                    : "Cette action supprimera définitivement ce produit et toutes les données associées."
                                }
                            </p>
                            {product.currentStock > 0 && (
                                <p className="text-red-400 text-xs mt-1">
                                    Le stock de {product.currentStock} unité(s) sera perdu.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="border-border/50 text-muted-foreground hover:bg-muted/50"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={() => onConfirm(product)}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Suppression...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer définitivement
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}