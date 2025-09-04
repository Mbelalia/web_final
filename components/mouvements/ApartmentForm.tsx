"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogFooter } from "@/components/ui/dialog"
import { Building2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

interface ApartmentFormProps {
  onSuccess: () => void;
  user: User;
}

export const ApartmentForm: React.FC<ApartmentFormProps> = ({ onSuccess, user }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      console.log('Creating apartment with data:', formData)
      
      const { data, error } = await supabase
        .from('apartments')
        .insert({
          ...formData,
          user_id: user.id
        })
        .select()
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Apartment created successfully:', data)
      toast.success("Appartement créé avec succès")
      setFormData({ name: '', address: '', description: '' })
      onSuccess()
    } catch (error: any) {
      console.error('Error creating apartment:', error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
      <div className="space-y-2">
        <label htmlFor="apt-name" className="text-sm font-medium text-foreground">Nom de l'appartement *</label>
        <Input 
          id="apt-name"
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          required 
          placeholder="Ex: Appartement T2 Centre-ville"
          className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="apt-address" className="text-sm font-medium text-foreground">Adresse</label>
        <Input 
          id="apt-address"
          value={formData.address} 
          onChange={(e) => setFormData({...formData, address: e.target.value})} 
          placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
          className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="apt-description" className="text-sm font-medium text-foreground">Description</label>
        <Input 
          id="apt-description"
          value={formData.description} 
          onChange={(e) => setFormData({...formData, description: e.target.value})} 
          placeholder="Ex: Appartement 2 pièces, meublé"
          className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
        />
      </div>
      
      <DialogFooter className="pt-6 border-t border-border/30">
        <Button variant="outline" onClick={() => setFormData({ name: '', address: '', description: '' })}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
          Créer l'appartement
        </Button>
      </DialogFooter>
    </form>
  )
}