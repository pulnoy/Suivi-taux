'use client';

import { INDEX_EDUCATION, CATEGORY_CONFIG } from '@/lib/educational-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Info, Lightbulb, AlertCircle, TrendingUp } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
}

interface IndexInfoModalProps {
  indexKey: string | null;
  value?: number;
  suffix?: string;
  historique?: DataPoint[];
  isOpen: boolean;
  onClose: () => void;
}

export function IndexInfoModal({
  indexKey,
  value,
  suffix,
  historique,
  isOpen,
  onClose
}: IndexInfoModalProps) {
  if (!indexKey) return null;
  
  const education = INDEX_EDUCATION[indexKey];
  if (!education) return null;

  const categoryConfig = CATEGORY_CONFIG[education.category];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${education.color}20` }}
            >
              {categoryConfig?.icon}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                {education.title}
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: `${education.color}15`,
                    color: education.color 
                  }}
                >
                  {education.categoryLabel}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {education.shortDescription}
              </DialogDescription>
              
              {value !== undefined && (
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: education.color }}>
                    {value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-lg text-muted-foreground">{suffix}</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        {/* Description complète */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <Info className="h-4 w-4" style={{ color: education.color }} />
              Qu'est-ce que c'est ?
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {education.fullDescription}
            </p>
          </div>

          <Separator />

          {/* Importance */}
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" style={{ color: education.color }} />
              Pourquoi c'est important ?
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {education.importance}
            </p>
          </div>

          <Separator />

          {/* Facteurs d'influence */}
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" style={{ color: education.color }} />
              Facteurs d'influence
            </h4>
            <ul className="space-y-1.5">
              {education.factors.map((factor, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span 
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: education.color }}
                  />
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Points clés */}
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4" style={{ color: education.color }} />
              À retenir
            </h4>
            <div className="space-y-2">
              {education.insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="text-sm p-2 rounded-lg"
                  style={{ backgroundColor: `${education.color}10` }}
                >
                  {insight}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Source */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Source : {education.source}</span>
            {education.sourceUrl && (
              <a 
                href={education.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                Voir la source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
