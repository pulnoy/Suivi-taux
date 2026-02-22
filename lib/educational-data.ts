// Educational content for financial indices

export interface IndexEducation {
  title: string;
  shortDescription: string;
  fullDescription: string;
  importance: string;
  factors: string[];
  insights: string[];
  color: string;
  bgColor: string;
  darkBgColor: string;
  category: 'rates' | 'stocks' | 'forex' | 'commodities' | 'crypto' | 'real_estate';
  categoryLabel: string;
  source: string;
  sourceUrl?: string;
}

export const INDEX_EDUCATION: Record<string, IndexEducation> = {
  oat: {
    title: 'OAT 10 ans',
    shortDescription: 'Obligation Assimilable du Trésor français à 10 ans. Taux de référence pour les emprunts d\'État français.',
    fullDescription: `L'OAT (Obligation Assimilable du Trésor) à 10 ans est le taux auquel l'État français emprunte sur les marchés pour une durée de 10 ans. C'est la référence principale pour le coût de la dette française et influence directement les taux des crédits immobiliers et des obligations d'entreprises.`,
    importance: `C'est un indicateur clé de la confiance des investisseurs envers la France et de la santé économique du pays. Un taux bas signifie que les investisseurs considèrent la France comme un emprunteur sûr.`,
    factors: [
      'Politique monétaire de la BCE (taux directeurs)',
      'Inflation anticipée en zone euro',
      'Notation de crédit de la France',
      'Contexte géopolitique et économique global',
      'Déficit budgétaire et niveau de dette publique'
    ],
    insights: [
      'Référence pour les taux de crédit immobilier',
      'Indicateur de confiance des marchés envers la France',
      'Impact direct sur le coût de la dette publique'
    ],
    color: '#16a34a',
    bgColor: '#e9f9ef',
    darkBgColor: '#052e16',
    category: 'rates',
    categoryLabel: 'Taux État',
    source: 'Banque de France (via FRED)',
    sourceUrl: 'https://fred.stlouisfed.org/series/IRLTLT01FRM156N'
  },
  
  inflation: {
    title: 'Inflation France',
    shortDescription: 'Indice des Prix à la Consommation (IPC) en France. Mesure l\'évolution des prix sur 1 an glissant (source: INSEE/OECD).',
    fullDescription: `L'Indice des Prix à la Consommation (IPC) mesure l'évolution moyenne des prix des biens et services consommés par les ménages en France. Il est calculé par l'INSEE et permet de suivre l'inflation sur 1 an glissant.`,
    importance: `L'inflation érode le pouvoir d'achat et la valeur de l'épargne. La BCE vise une inflation de 2% pour maintenir la stabilité des prix tout en permettant une croissance économique saine.`,
    factors: [
      'Prix de l\'énergie et des matières premières',
      'Tensions sur les chaînes d\'approvisionnement',
      'Politique monétaire (taux d\'intérêt)',
      'Évolution des salaires',
      'Demande des consommateurs'
    ],
    insights: [
      'Objectif BCE : 2% par an',
      'Impacte directement le rendement réel de l\'épargne',
      'Guide les décisions de politique monétaire'
    ],
    color: '#ef4444',
    bgColor: '#fef2f2',
    darkBgColor: '#450a0a',
    category: 'rates',
    categoryLabel: 'Prix Conso',
    source: 'INSEE / Eurostat (HICP)',
    sourceUrl: 'https://fred.stlouisfed.org/series/CP0000FRM086NEST'
  },
  
  estr: {
    title: '€STR',
    shortDescription: 'Euro Short-Term Rate. Taux de référence à court terme de la zone euro, remplaçant l\'EONIA.',
    fullDescription: `L'€STR (Euro Short-Term Rate) est le taux d'intérêt auquel les banques de la zone euro se prêtent de l'argent sans garantie pour une durée d'un jour. Il a remplacé l'EONIA en 2019 et sert de référence pour de nombreux produits financiers.`,
    importance: `C'est le taux "plancher" du système financier européen. Il reflète directement la politique monétaire de la BCE et influence tous les autres taux d'intérêt, du Livret A aux crédits aux entreprises.`,
    factors: [
      'Décisions de politique monétaire de la BCE',
      'Liquidité du système bancaire',
      'Conditions économiques générales',
      'Opérations de refinancement de la BCE'
    ],
    insights: [
      'Taux plancher du système financier européen',
      'Référence pour le calcul du Livret A',
      'Reflète directement la politique de la BCE'
    ],
    color: '#2563eb',
    bgColor: '#e8f0ff',
    darkBgColor: '#172554',
    category: 'rates',
    categoryLabel: 'Monétaire',
    source: 'BCE (via FRED)',
    sourceUrl: 'https://fred.stlouisfed.org/series/ECBESTRVOLWGTTRMDMNRT'
  },
  
  cac40: {
    title: 'CAC 40',
    shortDescription: 'Indice boursier des 40 plus grandes entreprises françaises cotées à Paris.',
    fullDescription: `Le CAC 40 (Cotation Assistée en Continu) regroupe les 40 entreprises françaises les plus importantes cotées à la Bourse de Paris, sélectionnées selon leur capitalisation boursière. Il représente environ 80% de la capitalisation totale de la place de Paris.`,
    importance: `Baromètre de l'économie française et de la santé des grandes entreprises nationales. Il influence la confiance des investisseurs et reflète les perspectives économiques du pays.`,
    factors: [
      'Résultats des entreprises du CAC 40',
      'Contexte économique français et européen',
      'Politique monétaire de la BCE',
      'Cours de l\'euro',
      'Sentiment des investisseurs mondiaux'
    ],
    insights: [
      'Indice phare de la Bourse de Paris',
      'Comprend L\'Oréal, LVMH, TotalEnergies, etc.',
      'Rendement dividendes moyen : ~3% par an'
    ],
    color: '#003A7A',
    bgColor: '#e6f0ff',
    darkBgColor: '#0c1929',
    category: 'stocks',
    categoryLabel: 'Large Caps',
    source: 'Euronext Paris',
    sourceUrl: 'https://finance.yahoo.com/quote/%5EFCHI'
  },
  
  cacmid: {
    title: 'CAC Mid 60',
    shortDescription: 'Indice des 60 valeurs moyennes françaises, juste après le CAC 40.',
    fullDescription: `Le CAC Mid 60 regroupe les 60 plus grandes valeurs françaises après celles du CAC 40. Ces entreprises de taille intermédiaire (ETI) offrent souvent un potentiel de croissance supérieur aux grandes capitalisations, avec une exposition principalement domestique.`,
    importance: `Cet indice capture la dynamique des ETI françaises, souvent plus réactives aux conditions économiques locales et offrant des opportunités de diversification par rapport au CAC 40.`,
    factors: [
      'Conjoncture économique française',
      'Consommation des ménages',
      'Politique industrielle française',
      'Liquidité du marché',
      'Flux d\'investissement vers les mid-caps'
    ],
    insights: [
      'Exposition plus domestique que le CAC 40',
      'Potentiel de croissance souvent supérieur',
      'Plus sensible à l\'économie française'
    ],
    color: '#4f46e5',
    bgColor: '#eef2ff',
    darkBgColor: '#1e1b4b',
    category: 'stocks',
    categoryLabel: 'Mid Caps',
    source: 'Euronext Paris',
    sourceUrl: 'https://finance.yahoo.com/quote/C6E.PA'
  },
  
  stoxx50: {
    title: 'Euro Stoxx 50',
    shortDescription: 'Indice des 50 plus grandes entreprises de la zone euro.',
    fullDescription: `L'Euro Stoxx 50 regroupe les 50 plus grandes entreprises de la zone euro, tous secteurs confondus. Il est utilisé comme référence pour l'économie de la zone euro et comme sous-jacent pour de nombreux produits dérivés.`,
    importance: `Meilleur indicateur de la performance globale des marchés actions de la zone euro, il permet de comparer la performance européenne aux autres régions du monde.`,
    factors: [
      'Politique monétaire de la BCE',
      'Croissance économique en zone euro',
      'Cours de l\'euro',
      'Résultats des entreprises européennes',
      'Contexte géopolitique européen'
    ],
    insights: [
      'Inclut des entreprises de France, Allemagne, Pays-Bas, etc.',
      'Plus diversifié géographiquement que le CAC 40',
      'Référence pour les ETF zone euro'
    ],
    color: '#0d9488',
    bgColor: '#f0fdfa',
    darkBgColor: '#042f2e',
    category: 'stocks',
    categoryLabel: 'Europe',
    source: 'STOXX Ltd.',
    sourceUrl: 'https://finance.yahoo.com/quote/%5ESTOXX50E'
  },
  
  sp500: {
    title: 'S&P 500',
    shortDescription: 'Indice des 500 plus grandes entreprises américaines.',
    fullDescription: `Le S&P 500 (Standard & Poor's 500) est l'indice de référence du marché américain. Il regroupe les 500 plus grandes entreprises cotées aux États-Unis et représente environ 80% de la capitalisation boursière américaine.`,
    importance: `C'est l'indice le plus suivi au monde. Il donne le tempo des marchés mondiaux et reflète la santé de l'économie américaine, première puissance mondiale.`,
    factors: [
      'Politique monétaire de la Fed',
      'Résultats des entreprises américaines',
      'Données économiques américaines (emploi, PIB)',
      'Cours du dollar',
      'Innovation technologique'
    ],
    insights: [
      'Indice le plus suivi au monde',
      'Dominé par les techs (Apple, Microsoft, etc.)',
      'Rendement historique moyen : ~10% par an'
    ],
    color: '#1e40af',
    bgColor: '#dbeafe',
    darkBgColor: '#1e3a5f',
    category: 'stocks',
    categoryLabel: 'USA Large',
    source: 'S&P Dow Jones Indices',
    sourceUrl: 'https://finance.yahoo.com/quote/%5EGSPC'
  },
  
  nasdaq: {
    title: 'Nasdaq 100',
    shortDescription: 'Indice des 100 plus grandes entreprises technologiques américaines.',
    fullDescription: `Le Nasdaq 100 regroupe les 100 plus grandes entreprises non-financières cotées au Nasdaq, avec une forte pondération vers le secteur technologique. Il inclut Apple, Microsoft, Amazon, Google, Meta, Tesla, Nvidia, etc.`,
    importance: `Baromètre du secteur technologique mondial, il anticipe souvent les tendances futures de l'économie numérique et de l'innovation.`,
    factors: [
      'Innovation technologique',
      'Politique monétaire (sensibilité aux taux)',
      'Régulation du secteur tech',
      'Intelligence artificielle et cloud',
      'Dépenses tech des entreprises'
    ],
    insights: [
      'Très exposé à la tech et à l\'IA',
      'Plus volatil que le S&P 500',
      'Moteur de la performance des marchés depuis 2010'
    ],
    color: '#7c3aed',
    bgColor: '#f3e8ff',
    darkBgColor: '#2e1065',
    category: 'stocks',
    categoryLabel: 'USA Tech',
    source: 'Nasdaq Inc.',
    sourceUrl: 'https://finance.yahoo.com/quote/%5ENDX'
  },
  
  world: {
    title: 'MSCI World',
    shortDescription: 'Indice mondial couvrant 23 pays développés.',
    fullDescription: `Le MSCI World couvre environ 1 600 entreprises de 23 pays développés (États-Unis, Europe, Japon, etc.). C'est la référence pour l'investissement actions mondial diversifié.`,
    importance: `Représente l'économie mondiale développée. Un seul investissement dans un ETF MSCI World offre une diversification géographique et sectorielle optimale.`,
    factors: [
      'Croissance économique mondiale',
      'Politiques monétaires des grandes banques centrales',
      'Commerce international',
      'Cours des devises',
      'Géopolitique mondiale'
    ],
    insights: [
      'USA ~70%, Europe ~15%, Japon ~6%',
      'Idéal pour la diversification de long terme',
      'Base de nombreuses stratégies d\'investissement'
    ],
    color: '#3b82f6',
    bgColor: '#eff6ff',
    darkBgColor: '#1e3a5f',
    category: 'stocks',
    categoryLabel: 'Monde',
    source: 'MSCI Inc.',
    sourceUrl: 'https://finance.yahoo.com/quote/URTH'
  },
  
  emerging: {
    title: 'Marchés Émergents',
    shortDescription: 'Indice MSCI des marchés émergents (Chine, Inde, Brésil, etc.).',
    fullDescription: `L'indice MSCI Emerging Markets couvre environ 1 400 entreprises dans 27 pays émergents (Chine, Inde, Brésil, Corée du Sud, Taiwan, etc.). Il offre une exposition à la croissance des économies en développement.`,
    importance: `Les marchés émergents représentent ~40% du PIB mondial et une grande partie de la croissance future. Ils offrent diversification et potentiel de rendement supérieur, mais avec plus de volatilité.`,
    factors: [
      'Croissance économique des pays émergents',
      'Politique de la Fed (flux de capitaux)',
      'Cours du dollar (dette en USD)',
      'Prix des matières premières',
      'Stabilité politique locale'
    ],
    insights: [
      'Chine ~30%, Taiwan ~15%, Inde ~15%',
      'Plus volatil mais potentiel de croissance supérieur',
      'Sensible aux flux de capitaux internationaux'
    ],
    color: '#d97706',
    bgColor: '#fffbeb',
    darkBgColor: '#451a03',
    category: 'stocks',
    categoryLabel: 'Émergents',
    source: 'MSCI Inc.',
    sourceUrl: 'https://finance.yahoo.com/quote/EEM'
  },
  
  eurusd: {
    title: 'EUR/USD',
    shortDescription: 'Taux de change Euro/Dollar. Combien de dollars pour 1 euro.',
    fullDescription: `La paire EUR/USD est le taux de change le plus échangé au monde. Elle indique combien de dollars sont nécessaires pour acheter un euro. Un EUR/USD à 1.10 signifie qu'1€ = 1.10$.`,
    importance: `Impacte directement le pouvoir d'achat des Européens pour les biens importés (pétrole, tech) et la compétitivité des exportations européennes. Crucial pour les voyages et investissements internationaux.`,
    factors: [
      'Différentiel de taux d\'intérêt BCE/Fed',
      'Croissance économique relative',
      'Flux commerciaux entre zones',
      'Politique monétaire des deux banques centrales',
      'Géopolitique et stabilité'
    ],
    insights: [
      'Paire de devises la plus échangée au monde',
      'Moyenne historique : ~1.15-1.20',
      'Euro fort = importations moins chères'
    ],
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    darkBgColor: '#082f49',
    category: 'forex',
    categoryLabel: 'Change',
    source: 'Marchés des changes',
    sourceUrl: 'https://finance.yahoo.com/quote/EURUSD=X'
  },
  
  scpi: {
    title: 'SCPI (Moyenne)',
    shortDescription: 'Sociétés Civiles de Placement Immobilier. Investissement immobilier mutualisé.',
    fullDescription: `Les SCPI (Sociétés Civiles de Placement Immobilier) permettent d'investir dans l'immobilier professionnel (bureaux, commerces, entrepôts) sans les contraintes de la gestion directe. Le taux de distribution est le rendement annuel versé aux associés.`,
    importance: `Les SCPI offrent un rendement régulier (loyers) avec une faible corrélation aux marchés boursiers. Elles constituent une alternative de diversification pour les portefeuilles patrimoniaux.`,
    factors: [
      'Taux d\'occupation des immeubles',
      'Évolution des loyers',
      'Taux d\'intérêt (concurrence des placements)',
      'Santé du marché immobilier professionnel',
      'Collecte et investissements des SCPI'
    ],
    insights: [
      'Rendement moyen : 4-5% par an',
      'Investissement à long terme (8-10 ans min)',
      'Diversification vs actions et obligations'
    ],
    color: '#7c3aed',
    bgColor: '#f3e8ff',
    darkBgColor: '#2e1065',
    category: 'real_estate',
    categoryLabel: 'Pierre Papier',
    source: 'ASPIM (Association des SCPI)',
    sourceUrl: 'https://www.aspim.fr/'
  },
  
  gold: {
    title: 'Or (Once)',
    shortDescription: 'Prix de l\'once d\'or en dollars. Valeur refuge traditionnelle.',
    fullDescription: `L'or est la valeur refuge par excellence depuis des millénaires. Le prix est coté en dollars par once troy (31.1 grammes). Il sert de couverture contre l'inflation, les crises et la dépréciation monétaire.`,
    importance: `L'or protège le patrimoine en période de crise et d'inflation. Il a une corrélation négative avec les actions et les taux réels, ce qui en fait un excellent outil de diversification.`,
    factors: [
      'Taux d\'intérêt réels (taux - inflation)',
      'Cours du dollar',
      'Incertitude géopolitique',
      'Demande des banques centrales',
      'Inflation anticipée'
    ],
    insights: [
      'Valeur refuge historique',
      'Ne génère pas de revenus (pas de dividendes)',
      'Réagit inversement aux taux réels'
    ],
    color: '#F2B301',
    bgColor: '#fffce6',
    darkBgColor: '#422006',
    category: 'commodities',
    categoryLabel: 'Valeur Refuge',
    source: 'Marché des matières premières',
    sourceUrl: 'https://finance.yahoo.com/quote/GC=F'
  },
  
  brent: {
    title: 'Pétrole (Brent)',
    shortDescription: 'Prix du baril de pétrole West Texas Intermediate.',
    fullDescription: `Le Brent est le pétrole de référence pour l'Europe et représente environ 60% des échanges mondiaux de pétrole. Son prix influence directement le coût des transports, de l'énergie et de nombreux produits manufacturés.`,
    importance: `Le pétrole reste la source d'énergie dominante. Son prix impacte l'inflation, la croissance économique et les coûts de production de nombreuses industries.`,
    factors: [
      'Production OPEP+ et quotas',
      'Demande mondiale (Chine, USA, Europe)',
      'Stocks stratégiques',
      'Géopolitique (Moyen-Orient, Russie)',
      'Transition énergétique'
    ],
    insights: [
      'Référence pour le prix de l\'essence',
      'Très volatil et sensible à la géopolitique',
      'Impact majeur sur l\'inflation'
    ],
    color: '#334155',
    bgColor: '#f1f5f9',
    darkBgColor: '#1e293b',
    category: 'commodities',
    categoryLabel: 'Énergie',
    source: 'Marché des matières premières',
    sourceUrl: 'https://finance.yahoo.com/quote/BZ=F'
  },
  
  btc: {
    title: 'Bitcoin',
    shortDescription: 'Cryptomonnaie décentralisée. Actif numérique volatile.',
    fullDescription: `Le Bitcoin (BTC) est la première et plus importante cryptomonnaie. Créé en 2009, il fonctionne sur une blockchain décentralisée avec une offre limitée à 21 millions d'unités. Il est considéré par certains comme "l'or numérique".`,
    importance: `Le Bitcoin représente une nouvelle classe d'actifs avec un potentiel de rendement élevé mais une volatilité extrême. Son adoption croissante par les institutions en fait un sujet incontournable.`,
    factors: [
      'Adoption institutionnelle (ETF, entreprises)',
      'Régulation gouvernementale',
      'Halving (division des récompenses mineurs)',
      'Sentiment du marché crypto',
      'Politique monétaire (liquidité)'
    ],
    insights: [
      'Offre limitée à 21 millions d\'unités',
      'Très volatil (+/- 50% par an possible)',
      'Corrélation variable avec les actifs traditionnels'
    ],
    color: '#f7931a',
    bgColor: '#fff7ed',
    darkBgColor: '#431407',
    category: 'crypto',
    categoryLabel: 'Crypto',
    source: 'Marchés crypto',
    sourceUrl: 'https://finance.yahoo.com/quote/BTC-USD'
  }
};

export const CATEGORY_CONFIG = {
  rates: { icon: '📊', label: 'Taux', color: '#16a34a' },
  stocks: { icon: '📈', label: 'Actions', color: '#003A7A' },
  forex: { icon: '💱', label: 'Devises', color: '#0ea5e9' },
  commodities: { icon: '🛢️', label: 'Matières premières', color: '#F2B301' },
  crypto: { icon: '₿', label: 'Crypto', color: '#f7931a' },
  real_estate: { icon: '🏢', label: 'Immobilier', color: '#7c3aed' }
};

export function getCategoryColor(category: string): string {
  return CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.color || '#64748b';
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.label || 'Autre';
}
