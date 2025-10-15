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
import { Trash2 } from 'lucide-react'

interface Apartment {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  user_id: string
}

interface ApartmentSummary {
  apartment: Apartment
  totalItems: number
  totalValueHT: number
  totalValueTTC: number
  itemCount: number
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: ApartmentSummary | null;
  onConfirm: (apartment: ApartmentSummary) => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  apartment,
  onConfirm
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-400">Supprimer l'appartement</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer cet appartement ? Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        
        {apartment && (
          <div className="bg-card/50 border border-border/30 p-4 rounded-xl mb-4">
            <h4 className="font-medium text-foreground">{apartment.apartment.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {apartment.apartment.address}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Articles: </span>
                <span className="text-foreground font-medium">{apartment.totalItems}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valeur: </span>
                <span className="text-blue-800 font-medium">{apartment.totalValueTTC.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">
            ⚠️ Cette action supprimera définitivement l'appartement et tout son historique de mouvements.
          </p>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-border/50 text-muted-foreground hover:bg-muted/50"
          >
            Annuler
          </Button>
          <Button 
            onClick={() => apartment && onConfirm(apartment)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}