'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Calendar,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CrisisImpact {
  index: string;
  change: string;
  positive: boolean;
}

interface Crisis {
  id: string;
  period: string;
  startYear: number;
  endYear: number;
  title: string;
  shortDescription: string;
  fullDescription: string;
  severity: 'critical' | 'major' | 'moderate';
  impacts: CrisisImpact[];
  keyFacts: string[];
}

const CRISES_DATA: Crisis[] = [
  {
    id: 'dotcom',
    period: '2000-2002',
    startYear: 2000,
    endYear: 2002,
    title: 'Bulle Internet (Dot-com)',
    shortDescription: 'Éclatement de la bulle spéculative des entreprises technologiques',
    fullDescription: 'La bulle Internet s\'est formée durant la fin des années 90 avec une spéculation massive sur les entreprises liées à Internet. Le NASDAQ a perdu près de 80% de sa valeur entre mars 2000 et octobre 2002. De nombreuses startups ont fait faillite, entraînant des pertes massives pour les investisseurs.',
    severity: 'critical',
    impacts: [
      { index: 'NASDAQ', change: '-78%', positive: false },
      { index: 'CAC 40', change: '-65%', positive: false },
      { index: 'S&P 500', change: '-49%', positive: false },
      { index: 'Or', change: '+12%', positive: true },
    ],
    keyFacts: [
      'Le NASDAQ a atteint un pic de 5 048 points en mars 2000',
      'Plus de 500 milliards $ de capitalisation évaporés',
      'Faillite de nombreuses startups (Pets.com, Webvan...)',
    ]
  },
  {
    id: 'subprimes',
    period: '2007-2009',
    startYear: 2007,
    endYear: 2009,
    title: 'Crise des Subprimes',
    shortDescription: 'Crise financière mondiale déclenchée par les crédits immobiliers américains',
    fullDescription: 'La crise des subprimes a été déclenchée par l\'effondrement du marché immobilier américain. Les prêts hypothécaires à risque (subprimes) accordés massivement ont créé une bulle immobilière. La faillite de Lehman Brothers en septembre 2008 a provoqué une panique mondiale sur les marchés financiers.',
    severity: 'critical',
    impacts: [
      { index: 'CAC 40', change: '-59%', positive: false },
      { index: 'S&P 500', change: '-57%', positive: false },
      { index: 'Or', change: '+25%', positive: true },
      { index: 'OAT 10 ans', change: '-2 pts', positive: true },
    ],
    keyFacts: [
      'Faillite de Lehman Brothers le 15 septembre 2008',
      'Les banques centrales ont injecté des milliers de milliards',
      'Création du terme "Too Big to Fail"',
    ]
  },
  {
    id: 'euro-debt',
    period: '2010-2012',
    startYear: 2010,
    endYear: 2012,
    title: 'Crise de la Dette Européenne',
    shortDescription: 'Crise souveraine touchant la Grèce, l\'Irlande, le Portugal, l\'Espagne et l\'Italie',
    fullDescription: 'Après la crise de 2008, plusieurs pays européens ont vu leur dette publique exploser. La Grèce a été la première touchée, suivie par l\'Irlande, le Portugal, l\'Espagne et l\'Italie (les "PIIGS"). Cette crise a menacé l\'existence même de l\'euro et a conduit à des plans d\'austérité drastiques.',
    severity: 'major',
    impacts: [
      { index: 'Euro Stoxx 50', change: '-35%', positive: false },
      { index: 'CAC 40', change: '-30%', positive: false },
      { index: 'EUR/USD', change: '-20%', positive: false },
      { index: 'Or', change: '+50%', positive: true },
    ],
    keyFacts: [
      'Taux grecs à 10 ans au-dessus de 35%',
      'Création du MES (Mécanisme Européen de Stabilité)',
      '"Whatever it takes" de Mario Draghi en juillet 2012',
    ]
  },
  {
    id: 'emerging-oil',
    period: '2015-2016',
    startYear: 2015,
    endYear: 2016,
    title: 'Crise des Marchés Émergents',
    shortDescription: 'Chute des matières premières et ralentissement chinois',
    fullDescription: 'La chute des prix du pétrole (de 100$ à 27$ le baril) combinée au ralentissement de l\'économie chinoise a provoqué une crise des marchés émergents. Les pays exportateurs de matières premières (Brésil, Russie, Afrique du Sud) ont été particulièrement touchés.',
    severity: 'moderate',
    impacts: [
      { index: 'Pétrole Brent', change: '-75%', positive: false },
      { index: 'Émergents', change: '-35%', positive: false },
      { index: 'CAC 40', change: '-20%', positive: false },
      { index: 'Or', change: '+8%', positive: true },
    ],
    keyFacts: [
      'Baril de pétrole à 27$ en janvier 2016',
      'Dévaluation du yuan chinois',
      'Récession au Brésil et en Russie',
    ]
  },
  {
    id: 'covid',
    period: '2020',
    startYear: 2020,
    endYear: 2020,
    title: 'Krach COVID-19',
    shortDescription: 'Effondrement éclair des marchés suite à la pandémie mondiale',
    fullDescription: 'La pandémie de COVID-19 a provoqué le krach boursier le plus rapide de l\'histoire. En mars 2020, les marchés ont chuté de plus de 30% en quelques semaines. La réponse massive des banques centrales et des gouvernements a permis un rebond spectaculaire, avec des records historiques atteints dès fin 2020.',
    severity: 'critical',
    impacts: [
      { index: 'CAC 40', change: '-40%', positive: false },
      { index: 'Pétrole', change: '-65%', positive: false },
      { index: 'Or', change: '+25%', positive: true },
      { index: 'Bitcoin', change: '+300%', positive: true },
    ],
    keyFacts: [
      'Krach de -12% du CAC 40 le 12 mars 2020 (record)',
      'Pétrole WTI en négatif (-37$/baril) le 20 avril 2020',
      'Plans de relance de plusieurs milliers de milliards',
    ]
  },
  {
    id: 'inflation-ukraine',
    period: '2022',
    startYear: 2022,
    endYear: 2022,
    title: 'Inflation & Guerre Ukraine',
    shortDescription: 'Choc énergétique et retour de l\'inflation après l\'invasion russe',
    fullDescription: 'L\'invasion de l\'Ukraine par la Russie en février 2022 a provoqué une flambée des prix de l\'énergie et des matières premières. L\'inflation a atteint des niveaux jamais vus depuis 40 ans dans les pays occidentaux, forçant les banques centrales à remonter brutalement leurs taux directeurs.',
    severity: 'major',
    impacts: [
      { index: 'NASDAQ', change: '-33%', positive: false },
      { index: 'CAC 40', change: '-18%', positive: false },
      { index: 'OAT 10 ans', change: '+2.5 pts', positive: false },
      { index: 'Gaz naturel', change: '+200%', positive: false },
    ],
    keyFacts: [
      'Inflation à 10% en zone euro (octobre 2022)',
      'Hausse des taux la plus rapide de la BCE',
      'Crise énergétique en Europe',
    ]
  },
  {
    id: 'banking-2023',
    period: '2023',
    startYear: 2023,
    endYear: 2023,
    title: 'Crise Bancaire 2023',
    shortDescription: 'Faillites de SVB et Credit Suisse',
    fullDescription: 'En mars 2023, Silicon Valley Bank (SVB) a fait faillite en quelques jours, provoquant la panique dans le secteur bancaire. Credit Suisse, déjà fragilisé, a été racheté en urgence par UBS. Ces événements ont rappelé la fragilité du système bancaire face à la hausse rapide des taux d\'intérêt.',
    severity: 'moderate',
    impacts: [
      { index: 'Banques EU', change: '-25%', positive: false },
      { index: 'Or', change: '+10%', positive: true },
      { index: 'Bitcoin', change: '+70%', positive: true },
      { index: 'OAT 10 ans', change: '-0.5 pts', positive: true },
    ],
    keyFacts: [
      'SVB : 2ème plus grosse faillite bancaire US',
      'Credit Suisse racheté par UBS pour 3 milliards CHF',
      'La Fed a créé un programme de prêt d\'urgence',
    ]
  }
];

const severityConfig = {
  critical: {
    color: 'bg-red-500',
    textColor: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-900',
    label: 'Critique',
  },
  major: {
    color: 'bg-orange-500',
    textColor: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-900',
    label: 'Majeur',
  },
  moderate: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-900',
    label: 'Modéré',
  },
};

export function TimelineCrises() {
  const [expandedCrisis, setExpandedCrisis] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl border border-border">
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-foreground mb-1">
            Comprendre les crises financières
          </h3>
          <p className="text-sm text-muted-foreground">
            Cette timeline présente les principales crises économiques et financières des 25 dernières années. 
            Cliquez sur chaque crise pour voir les détails et comprendre son impact sur les différents indices.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Gravité :</span>
        </div>
        {Object.entries(severityConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={cn('w-3 h-3 rounded-full', config.color)} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

        {/* Crisis items */}
        <div className="space-y-4">
          {CRISES_DATA.map((crisis, index) => {
            const severity = severityConfig[crisis.severity];
            const isExpanded = expandedCrisis === crisis.id;

            return (
              <Collapsible
                key={crisis.id}
                open={isExpanded}
                onOpenChange={() => setExpandedCrisis(isExpanded ? null : crisis.id)}
              >
                <div className={cn(
                  'relative pl-0 md:pl-16 transition-all duration-200',
                  isExpanded && 'mb-2'
                )}>
                  {/* Timeline dot */}
                  <div className={cn(
                    'hidden md:flex absolute left-4 top-4 w-5 h-5 rounded-full items-center justify-center ring-4 ring-background',
                    severity.color
                  )}>
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>

                  {/* Card */}
                  <CollapsibleTrigger asChild>
                    <div className={cn(
                      'cursor-pointer rounded-xl border transition-all duration-200',
                      severity.borderColor,
                      isExpanded ? severity.bgColor : 'bg-card hover:bg-muted/50'
                    )}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Period & badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {crisis.period}
                              </Badge>
                              <Badge className={cn(
                                'text-xs',
                                crisis.severity === 'critical' && 'bg-red-500 hover:bg-red-600',
                                crisis.severity === 'major' && 'bg-orange-500 hover:bg-orange-600',
                                crisis.severity === 'moderate' && 'bg-yellow-500 hover:bg-yellow-600',
                              )}>
                                {severity.label}
                              </Badge>
                            </div>

                            {/* Title */}
                            <h3 className={cn(
                              'font-bold text-lg mb-1',
                              severity.textColor
                            )}>
                              {crisis.title}
                            </h3>

                            {/* Short description */}
                            <p className="text-sm text-muted-foreground">
                              {crisis.shortDescription}
                            </p>

                            {/* Quick impacts */}
                            {!isExpanded && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {crisis.impacts.slice(0, 3).map((impact, i) => (
                                  <span
                                    key={i}
                                    className={cn(
                                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                      impact.positive 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                    )}
                                  >
                                    {impact.positive ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3" />
                                    )}
                                    {impact.index}: {impact.change}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Expand icon */}
                          <div className="flex-shrink-0 p-2">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Expanded content */}
                  <CollapsibleContent>
                    <div className={cn(
                      'mt-2 rounded-xl border p-5 space-y-5',
                      severity.borderColor,
                      severity.bgColor
                    )}>
                      {/* Full description */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">
                          Contexte et explications
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {crisis.fullDescription}
                        </p>
                      </div>

                      {/* Impacts grid */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-3">
                          Impact sur les indices
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {crisis.impacts.map((impact, i) => (
                            <div
                              key={i}
                              className={cn(
                                'rounded-lg p-3 text-center border',
                                impact.positive 
                                  ? 'bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900'
                                  : 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900'
                              )}
                            >
                              <div className="text-xs text-muted-foreground mb-1">
                                {impact.index}
                              </div>
                              <div className={cn(
                                'text-lg font-bold flex items-center justify-center gap-1',
                                impact.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              )}>
                                {impact.positive ? (
                                  <TrendingUp className="w-4 h-4" />
                                ) : (
                                  <TrendingDown className="w-4 h-4" />
                                )}
                                {impact.change}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key facts */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">
                          Faits marquants
                        </h4>
                        <ul className="space-y-2">
                          {crisis.keyFacts.map((fact, i) => (
                            <li 
                              key={i}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', severity.color)} />
                              {fact}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
        Les impacts indiqués sont des approximations basées sur les variations maximales durant chaque crise.
        Les performances passées ne préjugent pas des performances futures.
      </div>
    </div>
  );
}
