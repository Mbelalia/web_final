// Système de queue pour les tâches longues

import { extractWithPdfJs, normalizeText, takeRelevantExcerpt, Product } from './pdfProcessor';

// Import des fonctions nécessaires depuis le route PDF
// Nous devons extraire ces fonctions dans des modules séparés pour les réutiliser

export interface PdfExtractionJob {
  id: string;
  userId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}



class JobQueue {
  private jobs = new Map<string, PdfExtractionJob>();
  
  async addJob(userId: string, fileName: string, fileBuffer: Buffer): Promise<string> {
    const jobId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: PdfExtractionJob = {
      id: jobId,
      userId,
      fileName,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };
    
    this.jobs.set(jobId, job);
    
    // Démarrer le traitement en arrière-plan
    this.processJob(jobId, fileBuffer).catch(console.error);
    
    return jobId;
  }
  
  private async processJob(jobId: string, fileBuffer: Buffer) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    try {
      job.status = 'processing';
      job.progress = 10;
      
      // Extraction PDF via pdfjs-dist
      const { plainText, pages } = await extractWithPdfJs(fileBuffer);
      job.progress = 30;
      
      // Traitement du texte
      const extractedText = normalizeText(plainText);
      const excerpt = takeRelevantExcerpt(extractedText);
      job.progress = 50;
      
      const products = await this.extractProductsWithAPI(excerpt);
      job.progress = 90;
      
      job.result = { products, extractedText: extractedText.substring(0, 1000), pagesCount: pages.length };
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      
      await this.sendNotification(job);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Erreur inconnue';
      await this.sendNotification(job);
    }
  }
  
  private async extractProductsWithAPI(text: string): Promise<Product[]> {
    // Appel à une route API interne pour éviter la duplication
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/pdf-extract/process-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Failed to extract products:', error);
      return [];
    }
  }
  
  private async sendNotification(job: PdfExtractionJob) {
    // Ici on pourrait utiliser WebSockets, Server-Sent Events, ou une notification push
    console.log(`Notification pour ${job.userId}: Job ${job.id} ${job.status}`);
  }
  
  getJob(jobId: string): PdfExtractionJob | undefined {
    return this.jobs.get(jobId);
  }
  
  getUserJobs(userId: string): PdfExtractionJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }
}

export const jobQueue = new JobQueue();