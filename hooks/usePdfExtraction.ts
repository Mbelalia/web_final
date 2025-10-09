import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function usePdfExtraction() {
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  
  const startExtraction = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('async', 'true');
    
    const response = await fetch('/api/pdf-extract', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      setActiveJobs(prev => [...prev, data.jobId]);
      toast.info('Extraction PDF démarrée...', {
        description: 'Vous recevrez une notification une fois terminée.'
      });
      return data.jobId;
    }
    
    throw new Error(data.error);
  };
  
  // Polling pour vérifier le statut
  useEffect(() => {
    if (activeJobs.length === 0) return;
    
    const interval = setInterval(async () => {
      for (const jobId of activeJobs) {
        try {
          const response = await fetch(`/api/pdf-extract/status?jobId=${jobId}`);
          const job = await response.json();
          
          if (job.status === 'completed') {
            toast.success('Extraction PDF terminée !', {
              description: `${job.result.products.length} produits extraits de ${job.fileName}`,
              action: {
                label: 'Voir les résultats',
                onClick: () => {
                  // Rediriger vers la page des résultats
                  window.location.href = `/dashboard/inventaire?import=${jobId}`;
                }
              }
            });
            
            setActiveJobs(prev => prev.filter(id => id !== jobId));
          } else if (job.status === 'failed') {
            toast.error('Erreur lors de l\'extraction', {
              description: job.error
            });
            
            setActiveJobs(prev => prev.filter(id => id !== jobId));
          }
        } catch (error) {
          console.error('Error checking job status:', error);
        }
      }
    }, 3000); // Vérifier toutes les 3 secondes
    
    return () => clearInterval(interval);
  }, [activeJobs]);
  
  return {
    startExtraction,
    activeJobs
  };
}