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
  severity: 'critical' | 'major' | 'moderate' | 'positive';
  impacts: CrisisImpact[];
  keyFacts: string[];
}

const CRISES_DATA: Crisis[] = [
  {
    id: 'ltcm',
    period: '1998',
    startYear: 1998,
    endYear: 1998,
    title: 'Crise LTCM & Russie',
    shortDescription: 'Faillite du hedge fund LTCM et défaut de paiement russe — première crise systémique moderne',
    fullDescription: 'En août 1998, la Russie suspend le remboursement de sa dette et dévalue le rouble. Ce choc déclenche la quasi-faillite de Long-Term Capital Management (LTCM), un hedge fund gérant 125 milliards $ avec un levier colossal. La Fed organise un sauvetage privé d\'urgence pour éviter un effondrement systémique du système financier mondial. Cet épisode préfigure les crises futures liées au levier excessif.',
    severity: 'major',
    impacts: [
      { index: 'S&P 500', change: '-19%', positive: false },
      { index: 'Obligations émergentes', change: '-40%', positive: false },
      { index: 'OAT 10 ans', change: '-0.8 pt', positive: true },
      { index: 'Or', change: '+5%', positive: true },
    ],
    keyFacts: [
      'LTCM gérait 125 Mds$ avec un levier de 25x',
      'Sauvetage orchestré par la Fed de New York',
      'Précurseur des crises systémiques liées au levier',
    ]
  },
  {
    id: 'bullmarket-2003-2007',
    period: '2003-2007',
    startYear: 2003,
    endYear: 2007,
    title: 'Grande Expansion 2003-2007',
    shortDescription: 'Bull market mondial porté par la mondialisation, le crédit facile et la croissance émergente',
    fullDescription: 'Après le creux de la bulle Internet en 2003, les marchés entament l\'un des plus longs bull markets de l\'histoire. La mondialisation, la montée en puissance des pays émergents (BRIC), les taux d\'intérêt bas et la financiarisation de l\'économie alimentent une hausse continue. Le CAC 40 double entre 2003 et 2007. Cette période d\'euphorie masque cependant l\'accumulation de risques liés aux subprimes et à la titrisation.',
    severity: 'positive',
    impacts: [
      { index: 'CAC 40', change: '+130%', positive: true },
      { index: 'S&P 500', change: '+100%', positive: true },
      { index: 'Émergents', change: '+300%', positive: true },
      { index: 'Immobilier France', change: '+70%', positive: true },
    ],
    keyFacts: [
      'CAC 40 : de 2 400 pts (mars 2003) à 6 168 pts (juin 2007)',
      'Croissance mondiale de +5%/an portée par la Chine',
      'Les subprimes et la titrisation accumulent les risques en silence',
    ]
  },
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
    id: 'bullmarket-2012-2021',
    period: '2012-2021',
    startYear: 2012,
    endYear: 2021,
    title: 'Décennie dorée des marchés',
    shortDescription: 'Le plus long bull market de l\'histoire, porté par les politiques monétaires accommodantes (QE, taux zéro)',
    fullDescription: 'Après la crise de la dette européenne, la promesse de Draghi ("Whatever it takes") et les politiques d\'assouplissement quantitatif (QE) des grandes banques centrales déclenchent un bull market historique. Taux zéro (puis négatifs), rachats massifs d\'actifs par les banques centrales, et émergence des GAFAM alimentent une hausse quasi-ininterrompue. Le CAC 40 passe de 2 800 pts en 2012 à plus de 7 000 pts fin 2021. Les obligataires et l\'immobilier en profitent également massivement.',
    severity: 'positive',
    impacts: [
      { index: 'CAC 40', change: '+150%', positive: true },
      { index: 'S&P 500', change: '+400%', positive: true },
      { index: 'NASDAQ', change: '+700%', positive: true },
      { index: 'Immobilier France', change: '+30%', positive: true },
    ],
    keyFacts: [
      'QE BCE : 2 600 milliards € d\'actifs rachetés entre 2015 et 2018',
      'Taux directeurs négatifs en zone euro de 2014 à 2022',
      'Les GAFAM représentent 25% du S&P 500 à leur pic',
    ]
  },
  {
    id: 'taper-tantrum',
    period: '2013',
    startYear: 2013,
    endYear: 2013,
    title: 'Taper Tantrum',
    shortDescription: 'Panique obligataire après l\'annonce de la réduction du QE par la Fed',
    fullDescription: 'En mai 2013, le président de la Fed Ben Bernanke annonce que la banque centrale pourrait réduire progressivement ses rachats d\'actifs (tapering). Cette seule annonce provoque une violente remontée des taux obligataires mondiaux (+100 points de base en quelques semaines) et une forte correction des marchés émergents. Cet épisode illustre la dépendance des marchés aux politiques monétaires accommodantes.',
    severity: 'moderate',
    impacts: [
      { index: 'OAT 10 ans', change: '+1 pt', positive: false },
      { index: 'Émergents', change: '-15%', positive: false },
      { index: 'EUR/USD', change: '+4%', positive: true },
      { index: 'Or', change: '-25%', positive: false },
    ],
    keyFacts: [
      'Bernanke évoque le tapering le 22 mai 2013',
      'Taux US à 10 ans : de 1.6% à 3% en quelques mois',
      'Précurseur des crises liées à la normalisation monétaire',
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
    id: 'brexit',
    period: '2016',
    startYear: 2016,
    endYear: 2016,
    title: 'Brexit',
    shortDescription: 'Le vote britannique pour quitter l\'UE provoque un choc sur les marchés européens et la livre sterling',
    fullDescription: 'Le 23 juin 2016, le Royaume-Uni vote à 52% pour quitter l\'Union Européenne, surprenant les marchés qui anticipaient un vote Remain. La livre sterling s\'effondre de 10% en une nuit, son plus fort recul depuis la Seconde Guerre mondiale. Les marchés européens chutent brutalement avant de se reprendre rapidement. Le Brexit entraîne 4 ans d\'incertitude politique et économique jusqu\'à l\'accord de janvier 2021.',
    severity: 'moderate',
    impacts: [
      { index: 'EUR/GBP', change: '+8%', positive: false },
      { index: 'CAC 40', change: '-8%', positive: false },
      { index: 'FTSE 100', change: '-3%', positive: false },
      { index: 'Or', change: '+5%', positive: true },
    ],
    keyFacts: [
      'Livre sterling : -10% en une nuit (23 juin 2016)',
      'David Cameron démissionne le lendemain du vote',
      'Accord commercial UE/UK finalement signé en janvier 2021',
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
    id: 'rebond-covid',
    period: '2020-2021',
    startYear: 2020,
    endYear: 2021,
    title: 'Rebond Post-COVID',
    shortDescription: 'Reprise historique des marchés portée par les vaccins, les plans de relance et les taux zéro',
    fullDescription: 'Après le choc initial du COVID, les marchés connaissent l\'un des rebonds les plus rapides et les plus puissants de l\'histoire. Les annonces de vaccins (novembre 2020), les plans de relance massifs (notamment le plan Biden de 1 900 milliards $) et le maintien de taux zéro propulsent les indices à des niveaux records. Le CAC 40 dépasse pour la première fois les 7 000 points en 2021. L\'immobilier et les cryptomonnaies connaissent également des hausses spectaculaires.',
    severity: 'positive',
    impacts: [
      { index: 'CAC 40', change: '+65%', positive: true },
      { index: 'NASDAQ', change: '+100%', positive: true },
      { index: 'Bitcoin', change: '+1 200%', positive: true },
      { index: 'Immobilier France', change: '+10%', positive: true },
    ],
    keyFacts: [
      'CAC 40 dépasse 7 000 pts pour la première fois en novembre 2021',
      'Plan Biden : 1 900 milliards $ de stimulus',
      'Bitcoin atteint 69 000$ en novembre 2021',
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
  },
  {
    id: 'desinflation-pivot',
    period: '2023-2024',
    startYear: 2023,
    endYear: 2024,
    title: 'Désinflation & Pivot des Banques Centrales',
    shortDescription: 'Retour progressif de l\'inflation vers 2% et début des baisses de taux — rebond des marchés',
    fullDescription: 'À partir de mi-2023, l\'inflation reflue progressivement en zone euro et aux États-Unis. La BCE commence à baisser ses taux en juin 2024 (première baisse depuis 2019), suivie par la Fed en septembre 2024. Ce "pivot" monétaire relance les marchés actions et obligataires, avec un CAC 40 qui atteint un nouveau record au-dessus de 8 200 pts. L\'immobilier repart légèrement à la hausse après deux années de correction.',
    severity: 'positive',
    impacts: [
      { index: 'CAC 40', change: '+20%', positive: true },
      { index: 'OAT 10 ans', change: '-1 pt', positive: true },
      { index: 'Obligations', change: '+8%', positive: true },
      { index: 'Or', change: '+35%', positive: true },
    ],
    keyFacts: [
      'Première baisse de taux BCE en juin 2024 (-0.25%)',
      'Inflation zone euro redescendue à ~2% fin 2024',
      'Or atteint un record historique à 2 790$/once en octobre 2024',
    ]
  },
  {
    id: 'turbulences-2025',
    period: '2025',
    startYear: 2025,
    endYear: 2025,
    title: 'Guerre Commerciale & Turbulences 2025',
    shortDescription: 'Tarifs douaniers Trump, incertitudes géopolitiques et correction des marchés tech',
    fullDescription: 'Le retour de Donald Trump à la présidence américaine en janvier 2025 relance les craintes de guerre commerciale mondiale. L\'annonce de tarifs douaniers massifs (10 à 145% selon les pays) provoque des chocs sur les marchés et des inquiétudes sur la croissance mondiale. L\'Europe lance un plan de réarmement massif (800 milliards €), soutenant les valeurs de défense. Les marchés alternent entre corrections et rebonds au gré des annonces, dans un contexte d\'incertitude élevée.',
    severity: 'major',
    impacts: [
      { index: 'S&P 500', change: '-15%', positive: false },
      { index: 'EUR/USD', change: '+5%', positive: true },
      { index: 'Défense européenne', change: '+40%', positive: true },
      { index: 'Or', change: '+15%', positive: true },
    ],
    keyFacts: [
      'Tarifs douaniers US jusqu\'à 145% sur les produits chinois',
      'Plan de réarmement européen de 800 milliards €',
      'Or atteint 3 100$/once (record historique, mars 2025)',
    ]
  },
];
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
  positive: {
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-900',
    label: 'Opportunité',
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
            Crises & opportunités financières depuis 1998
          </h3>
          <p className="text-sm text-muted-foreground">
            Cette timeline présente les principales crises et périodes d'expansion des marchés depuis 1998.
            Cliquez sur chaque événement pour voir les détails et son impact sur les différents indices.
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
