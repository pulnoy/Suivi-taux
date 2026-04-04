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
    title: 'EUR / USD',
    shortDescription: 'Taux de change Euro/Dollar. Combien de dollars pour 1 euro.',
    fullDescription: `La paire EUR/USD est le taux de change le plus échangé au monde. Elle indique combien de dollars sont nécessaires pour acheter un euro. Un EUR/USD à 1.10 signifie qu'1€ = 1.10$.`,
    importance: `Impacte directement le pouvoir d'achat des Européens pour les biens importés (pétrole, tech) et la compétitivité des exportations européennes. Crucial pour les voyages et investissements internationaux.`,
    factors: ['Différentiel de taux BCE/Fed', 'Croissance économique relative', 'Flux commerciaux', 'Géopolitique'],
    insights: ['Paire la plus échangée au monde', 'Moyenne historique : ~1.15-1.20', 'Euro fort = importations moins chères'],
    color: '#0ea5e9', bgColor: '#e0f2fe', darkBgColor: '#082f49',
    category: 'forex', categoryLabel: 'Change',
    source: 'Marchés des changes', sourceUrl: 'https://finance.yahoo.com/quote/EURUSD=X'
  },

  eurgbp: {
    title: 'EUR / GBP',
    shortDescription: 'Taux de change Euro/Livre sterling. Combien de livres pour 1 euro.',
    fullDescription: `La paire EUR/GBP mesure la valeur relative de l'euro face à la livre britannique. Depuis le Brexit (2020), cette paire est particulièrement sensible aux négociations commerciales UE/Royaume-Uni et aux divergences de politique monétaire entre la BCE et la Banque d'Angleterre.`,
    importance: `Essentiel pour les clients ayant des actifs ou des transactions au Royaume-Uni. La livre est souvent vue comme un indicateur de confiance dans l'économie britannique post-Brexit.`,
    factors: ['Politique monétaire BCE vs BoE', 'Relations commerciales UE/UK post-Brexit', 'Inflation au Royaume-Uni', 'Stabilité politique britannique'],
    insights: ['Fortement impacté par le Brexit depuis 2016', 'BoE souvent plus hawkish que BCE', 'Livre = devise refuge traditionnelle'],
    color: '#7c3aed', bgColor: '#f5f3ff', darkBgColor: '#2e1065',
    category: 'forex', categoryLabel: 'Change',
    source: 'Marchés des changes', sourceUrl: 'https://finance.yahoo.com/quote/EURGBP=X'
  },

  eurjpy: {
    title: 'EUR / JPY',
    shortDescription: 'Taux de change Euro/Yen japonais. Indicateur du sentiment de risque mondial.',
    fullDescription: `La paire EUR/JPY est un indicateur clé du sentiment de risque sur les marchés. Le yen est une devise refuge : il s'apprécie en période de crise et se déprécie quand les investisseurs prennent des risques (carry trade). La Banque du Japon maintient des taux historiquement bas.`,
    importance: `Reflète les divergences de politique monétaire entre la BCE et la Banque du Japon. Utile pour évaluer l'appétit pour le risque mondial et les flux de carry trade.`,
    factors: ['Politique de la Banque du Japon (taux ultra-bas)', 'Appétit pour le risque mondial', 'Carry trade EUR/JPY', 'Inflation japonaise'],
    insights: ['Yen = valeur refuge en période de stress', 'Carry trade massif avant 2024', 'BOJ commence à normaliser sa politique'],
    color: '#dc2626', bgColor: '#fef2f2', darkBgColor: '#450a0a',
    category: 'forex', categoryLabel: 'Change',
    source: 'Marchés des changes', sourceUrl: 'https://finance.yahoo.com/quote/EURJPY=X'
  },

  eurchf: {
    title: 'EUR / CHF',
    shortDescription: 'Taux de change Euro/Franc suisse. Le franc suisse est la devise refuge européenne par excellence.',
    fullDescription: `La paire EUR/CHF mesure la valeur de l'euro face au franc suisse. Le franc suisse est historiquement une valeur refuge en période de turbulences en Europe. La BNS (Banque nationale suisse) intervient régulièrement pour éviter une trop forte appréciation du franc.`,
    importance: `Indicateur clé de la confiance dans l'économie européenne. Un EUR/CHF bas (franc fort) signale une aversion au risque européen. Important pour les clients exposés à la Suisse ou aux actifs libellés en CHF.`,
    factors: ['Crises de la zone euro', 'Politique de la BNS', 'Flux de capitaux vers la sécurité', 'Inflation suisse'],
    insights: ['CHF = valeur refuge européenne historique', 'BNS intervient pour éviter le franc trop fort', 'Taux BNS souvent en territoire négatif'],
    color: '#16a34a', bgColor: '#f0fdf4', darkBgColor: '#052e16',
    category: 'forex', categoryLabel: 'Change',
    source: 'Marchés des changes', sourceUrl: 'https://finance.yahoo.com/quote/EURCHF=X'
  },

  eurcny: {
    title: 'EUR / CNY',
    shortDescription: 'Taux de change Euro/Yuan chinois. Indicateur des relations économiques Europe-Chine.',
    fullDescription: `La paire EUR/CNY mesure la valeur de l'euro face au yuan renminbi chinois. Le yuan est partiellement contrôlé par la Banque populaire de Chine (PBOC), ce qui le rend moins volatil que les autres devises. La Chine est le premier partenaire commercial de l'UE.`,
    importance: `Pertinent pour suivre la compétitivité des exportations européennes vers la Chine et l'évolution des relations commerciales sino-européennes. Le yuan s'internationalise progressivement dans les paiements mondiaux.`,
    factors: ['Politique de la PBOC', 'Balance commerciale Chine/UE', 'Tensions géopolitiques', 'Internationalisation du yuan'],
    insights: ['Yuan partiellement contrôlé par la PBOC', 'Chine = 1er partenaire commercial de l\'UE', 'Progression du yuan dans les réserves mondiales'],
    color: '#f59e0b', bgColor: '#fffbeb', darkBgColor: '#451a03',
    category: 'forex', categoryLabel: 'Change',
    source: 'Marchés des changes', sourceUrl: 'https://finance.yahoo.com/quote/EURCNY=X'
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
    shortDescription: 'Prix du baril de pétrole Brent (référence européenne, USD/baril).',
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
    source: 'OilPriceAPI (BRENT_CRUDE_USD)',
    sourceUrl: 'https://oilpriceapi.com'
  },
  
  tec10: {
    title: 'TEC 10 ans',
    shortDescription: 'Taux de l\'Échéance Constante à 10 ans. Taux journalier officiel de la Banque de France, plus réactif que l\'OAT.',
    fullDescription: `Le TEC 10 (Taux de l'Échéance Constante à 10 ans) est calculé quotidiennement par la Banque de France par interpolation sur la courbe des OAT du marché secondaire. Il représente le rendement d'une obligation fictive de maturité exactement 10 ans. Contrairement à l'OAT publiée avec retard par FRED, le TEC 10 est disponible le lendemain.`,
    importance: `C'est la référence la plus précise et la plus à jour du coût de l'emprunt souverain français à 10 ans. Utilisé comme taux de référence dans de nombreux contrats financiers, notamment les crédits à taux révisable indexés sur le TEC.`,
    factors: [
      'Politique monétaire de la BCE',
      'Anticipations d\'inflation',
      'Appétit pour le risque des investisseurs',
      'Déficit et dette publique française',
      'Contexte géopolitique et économique'
    ],
    insights: [
      'Données journalières — plus réactif que l\'OAT mensuelle FRED',
      'Référence pour les crédits immobiliers à taux variable',
      'Très proche de l\'OAT 10 ans mais calculé différemment'
    ],
    color: '#059669',
    bgColor: '#ecfdf5',
    darkBgColor: '#022c22',
    category: 'rates',
    categoryLabel: 'Taux État',
    source: 'Banque de France (Webstat)',
    sourceUrl: 'https://webstat.banque-france.fr/fr/catalogue/fm/FM.D.FR.EUR.FR2.BB.FRMOYTEC10.HSTA'
  },

  tauxDepotBCE: {
    title: 'Taux dépôt BCE',
    shortDescription: 'Facilité de dépôt de la BCE. Taux plancher du système financier européen, principal levier de politique monétaire.',
    fullDescription: `La facilité de dépôt est le taux auquel les banques commerciales peuvent déposer leurs excédents de liquidités auprès de la BCE pour une nuit. C'est le principal taux directeur de la BCE depuis 2022, devenu négatif entre 2014 et 2022 pour stimuler l'économie, puis fortement relevé pour lutter contre l'inflation.`,
    importance: `Ce taux est le moteur de toute la politique monétaire européenne. Son évolution influence directement l'€STR, le Livret A, les taux de crédit et les marchés obligataires. Indispensable pour comprendre le contexte macro-financier en clientèle.`,
    factors: [
      'Décisions du Conseil des gouverneurs de la BCE',
      'Inflation dans la zone euro (objectif 2%)',
      'Croissance économique de la zone euro',
      'Stabilité financière',
      'Taux des autres grandes banques centrales'
    ],
    insights: [
      'Taux négatif de -0.5% entre 2019 et 2022',
      'Monté à 4% en 2023 — pic historique',
      'En baisse depuis juin 2024 (désinflation)'
    ],
    color: '#dc2626',
    bgColor: '#fef2f2',
    darkBgColor: '#450a0a',
    category: 'rates',
    categoryLabel: 'Banque Centrale',
    source: 'Banque de France (Webstat)',
    sourceUrl: 'https://webstat.banque-france.fr/fr/catalogue/fm/FM.D.U2.EUR.4F.KR.DFR.LEV'
  },

  pel: {
    title: 'PEL',
    shortDescription: 'Plan d\'Épargne Logement. Taux de rémunération des nouveaux PEL, fixé par arrêté ministériel.',
    fullDescription: `Le Plan d'Épargne Logement (PEL) est un produit d'épargne réglementé permettant de constituer une épargne en vue d'un prêt immobilier. Son taux est fixé à l'ouverture et garanti pendant toute la durée du plan (4 à 10 ans). Les intérêts sont soumis aux prélèvements sociaux et à l'impôt depuis 2018.`,
    importance: `Le PEL est un indicateur clé de la rémunération de l'épargne réglementée à moyen terme. Depuis le 1er janvier 2026, le taux est passé à 2%. Les anciens PEL à 2.5% ou 3.5% restent très avantageux.`,
    factors: [
      'Décisions ministérielles (fixé par arrêté)',
      'Niveau des taux d\'intérêt du marché',
      'Politique de logement du gouvernement',
      'Concurrence avec autres produits d\'épargne',
      'Taux du Livret A'
    ],
    insights: [
      'Taux garanti à l\'ouverture pendant toute la durée',
      'Passé à 2% le 1er janvier 2026 (vs 1.75% avant)',
      'Plafond : 61 200 € de versements'
    ],
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    darkBgColor: '#2e1065',
    category: 'rates',
    categoryLabel: 'Épargne',
    source: 'Banque de France (Webstat)',
    sourceUrl: 'https://webstat.banque-france.fr/fr/catalogue/mir1/MIR1.M.FR.B.L22FRSP.H.R.A.2250U6.EUR.N'
  },

  fondsEuros: {
    title: 'Fonds euros (moy.)',
    shortDescription: 'Taux moyen annuel des fonds euros en assurance-vie. Source : France Assureurs / ACPR. Capital garanti, effet cliquet.',
    fullDescription: `Les fonds euros sont le support garanti de l'assurance-vie. Composés principalement d'obligations d'État (80-90%), ils offrent une garantie du capital et un effet cliquet (les gains sont définitivement acquis chaque année). Le taux moyen est publié annuellement par France Assureurs et l'ACPR (Autorité de Contrôle Prudentiel et de Résolution). Il cache de fortes disparités : certains fonds servent 1.5% quand d'autres dépassent 4%.`,
    importance: `Référence incontournable en conseil patrimonial. Les fonds euros représentent 70% des 2 000 milliards d'€ d'encours d'assurance-vie en France. Après des années de baisse (1.28% en 2021), la remontée des taux obligataires a permis une revalorisation notable depuis 2022. À comparer systématiquement avec le Livret A, le PEL et l'OAT pour argumenter l'allocation d'épargne.`,
    factors: [
      'Taux obligataires (OAT) — 80-90% du fonds investi en oblig.',
      'Provision pour Participation aux Bénéfices (PPB)',
      'Concurrence avec le Livret A',
      'Stratégie de distribution de chaque assureur',
      'Politique monétaire BCE'
    ],
    insights: [
      'Taux 2024 : 2.60% (France Assureurs / ACPR)',
      'Taux 2025 : ~2.50% estimé (en cours d\'annonce)',
      'Capital garanti + effet cliquet = aucune perte possible',
      'Publié avec 1 an de décalage (annonce en janvier-mars)'
    ],
    color: '#d97706',
    bgColor: '#fffbeb',
    darkBgColor: '#451a03',
    category: 'rates',
    categoryLabel: 'Épargne',
    source: 'France Assureurs / ACPR',
    sourceUrl: 'https://www.franceassureurs.fr/nos-publications/chiffres-marche-assurance-vie'
  },

  tauxImmo: {
    title: 'Taux crédit immo',
    shortDescription: 'Taux moyen des nouveaux crédits immobiliers à plus d\'un an en France. Source officielle Banque de France.',
    fullDescription: `Ce taux représente le taux d'intérêt annuel moyen des nouveaux crédits accordés aux particuliers pour l'habitat, d'une durée initiale supérieure à 1 an. Il est calculé par la Banque de France à partir des remontées mensuelles des établissements de crédit.`,
    importance: `C'est l'indicateur de référence pour mesurer l'accessibilité au crédit immobilier. Son écart avec l'OAT ou le TEC 10 (spread bancaire) reflète la marge des banques et leur appétit pour le risque. Essentiel pour conseiller les clients sur le timing de leur emprunt.`,
    factors: [
      'TEC 10 ans / OAT (coût de refinancement)',
      'Politique de crédit des banques',
      'Normes HCSF (taux d\'endettement 35%)',
      'Concurrence interbancaire',
      'Politique monétaire BCE'
    ],
    insights: [
      'Spread historique vs OAT : +1% à +1.5%',
      'Pic à ~4.2% fin 2023 — en baisse depuis',
      'Fortement corrélé au TEC 10 avec 3-6 mois de décalage'
    ],
    color: '#0891b2',
    bgColor: '#ecfeff',
    darkBgColor: '#082f49',
    category: 'real_estate',
    categoryLabel: 'Immobilier',
    source: 'Banque de France (Webstat)',
    sourceUrl: 'https://webstat.banque-france.fr/fr/catalogue/mir1/MIR1.M.FR.B.A22.K.R.A.2254U6.EUR.N'
  },

  livreta: {
    title: 'Livret A',
    shortDescription: 'Produit d\'épargne réglementé, garanti par l\'État. Taux fixé par arrêté ministériel deux fois par an.',
    fullDescription: `Le Livret A est le produit d'épargne le plus répandu en France, avec plus de 55 millions de détenteurs. Son taux est fixé par le gouvernement sur proposition de la Banque de France, selon une formule tenant compte de l'inflation et de l'€STR. Les intérêts sont exonérés d'impôt et de prélèvements sociaux. Le plafond est de 22 950 € pour un particulier.`,
    importance: `C'est le taux plancher de référence pour l'épargne sans risque en France. Il influence directement les arbitrages entre épargne liquide et placements financiers. Un Livret A à 1.7% face à une inflation à 1% donne un rendement réel positif, ce qui est rare historiquement.`,
    factors: [
      'Inflation française (IPC)',
      'Taux €STR de la BCE',
      'Décision politique du gouvernement (arrondi)',
      'Rôle de financement du logement social (CDC)',
      'Concurrence avec autres produits d\'épargne réglementée'
    ],
    insights: [
      'Taux révisé le 1er février et le 1er août',
      'Plafond : 22 950 € (particulier), 76 500 € (associations)',
      'Référence pour comparer tout placement sans risque'
    ],
    color: '#0ea5e9',
    bgColor: '#e0f2fe',
    darkBgColor: '#0c4a6e',
    category: 'rates',
    categoryLabel: 'Épargne',
    source: 'Banque de France / Ministère des Finances',
    sourceUrl: 'https://www.banque-france.fr/fr/statistiques/taux-et-cours/taux-livret-a'
  },

  prixImmo: {
    title: 'Prix immo (var. annuelle)',
    shortDescription: 'Variation annuelle des prix des logements anciens en France métropolitaine. Source officielle : Banque de France / INSEE.',
    fullDescription: `L'indice des prix des logements anciens est calculé conjointement par l'INSEE et les notaires de France à partir des actes de vente. Il couvre l'ensemble des logements anciens (appartements et maisons) en France métropolitaine, avec une base 100 en 2015. La variation annuelle mesure l'évolution sur 4 trimestres glissants.`,
    importance: `C'est l'indicateur de référence pour suivre le marché immobilier résidentiel. Il est directement lié aux taux de crédit immobilier, à l'inflation et aux politiques monétaires. Essentiel pour évaluer la performance des SCPI et l'immobilier en portefeuille.`,
    factors: [
      'Taux des crédits immobiliers',
      'Politique monétaire BCE',
      'Démographie et demande de logements',
      'Normes HCSF (taux d\'endettement)',
      'Offre de logements neufs'
    ],
    insights: [
      'Donnée trimestrielle — délai de publication ~3 mois',
      'Fortement corrélé (avec décalage) aux taux de crédit',
      'Base 100 = moyenne annuelle 2015'
    ],
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    darkBgColor: '#2e1065',
    category: 'real_estate',
    categoryLabel: 'Immobilier',
    source: 'Banque de France / INSEE-Notaires',
    sourceUrl: 'https://webstat.banque-france.fr/fr/catalogue/rpp/RPP.Q.FR.N.ED.00.1.00'
  },

  btc: {
    title: 'Bitcoin',
    shortDescription: 'Cryptomonnaie décentralisée. Actif numérique volatile.',
    fullDescription: `Le Bitcoin (BTC) est la première et plus importante cryptomonnaie. Créé en 2009, il fonctionne sur une blockchain décentralisée avec une offre limitée à 21 millions d'unités. Il est considéré par certains comme "l'or numérique".`,
    importance: `Le Bitcoin représente une nouvelle classe d'actifs avec un potentiel de rendement élevé mais une volatilité extrême. Son adoption croissante par les institutions en fait un sujet incontournable.`,
    factors: ['Adoption institutionnelle (ETF, entreprises)', 'Régulation gouvernementale', 'Halving (division des récompenses mineurs)', 'Sentiment du marché crypto', 'Politique monétaire (liquidité)'],
    insights: ['Offre limitée à 21 millions d\'unités', 'Très volatil (+/- 50% par an possible)', 'Corrélation variable avec les actifs traditionnels'],
    color: '#f7931a', bgColor: '#fff7ed', darkBgColor: '#431407',
    category: 'crypto', categoryLabel: 'Crypto',
    source: 'Marchés crypto', sourceUrl: 'https://finance.yahoo.com/quote/BTC-USD'
  },

  eth: {
    title: 'Ethereum',
    shortDescription: 'Deuxième cryptomonnaie mondiale. Plateforme de smart contracts et DeFi.',
    fullDescription: `Ethereum (ETH) est la deuxième cryptomonnaie par capitalisation. Contrairement au Bitcoin, Ethereum est une plateforme programmable permettant les smart contracts, la DeFi (finance décentralisée) et les NFT. Depuis 2022, Ethereum utilise un mécanisme de preuve d'enjeu (Proof of Stake) beaucoup moins énergivore.`,
    importance: `Ethereum est l'infrastructure de la majorité des applications décentralisées (DApps). Son cours est lié à l'activité sur sa blockchain et à l'adoption de la DeFi. Souvent corrélé au Bitcoin mais avec une volatilité plus élevée.`,
    factors: ['Activité DeFi et NFT', 'Mises à jour du protocole', 'Corrélation avec Bitcoin', 'Adoption institutionnelle', 'Rendement du staking'],
    insights: ['Passage au Proof of Stake en 2022 (The Merge)', 'Base de la finance décentralisée (DeFi)', 'Corrélé à BTC mais avec une beta plus élevée'],
    color: '#627eea', bgColor: '#eef0ff', darkBgColor: '#1e1b4b',
    category: 'crypto', categoryLabel: 'Crypto',
    source: 'Marchés crypto', sourceUrl: 'https://finance.yahoo.com/quote/ETH-USD'
  },

  sol: {
    title: 'Solana',
    shortDescription: 'Blockchain haute performance. Concurrent rapide et peu coûteux d\'Ethereum.',
    fullDescription: `Solana (SOL) est une blockchain de haute performance capable de traiter des milliers de transactions par seconde à des frais très faibles. Lancée en 2020, elle est devenue l'une des blockchains les plus utilisées pour les NFT et la DeFi grâce à sa rapidité.`,
    importance: `Solana représente la nouvelle génération de blockchains scalables. Son cours reflète l'adoption de son écosystème et la concurrence avec Ethereum. Actif très volatil, considéré comme un actif à haut risque/rendement dans la crypto.`,
    factors: ['Adoption de l\'écosystème Solana', 'Concurrence avec Ethereum', 'Incidents techniques (pannes réseau)', 'Sentiment crypto global', 'Memecoins et NFT sur Solana'],
    insights: ['Transactions très rapides (~400ms) et peu coûteuses', 'A connu plusieurs pannes réseau', 'Forte croissance de l\'écosystème memecoins'],
    color: '#9945ff', bgColor: '#f5f0ff', darkBgColor: '#2e1065',
    category: 'crypto', categoryLabel: 'Crypto',
    source: 'Marchés crypto', sourceUrl: 'https://finance.yahoo.com/quote/SOL-USD'
  },

  xrp: {
    title: 'XRP',
    shortDescription: 'Cryptomonnaie de Ripple. Conçue pour les paiements et transferts internationaux rapides.',
    fullDescription: `XRP est la cryptomonnaie native du réseau Ripple, conçue pour faciliter les paiements et transferts internationaux rapides et peu coûteux entre institutions financières. Contrairement aux autres cryptos, XRP n'est pas minée et sa distribution est contrôlée par Ripple Labs.`,
    importance: `XRP est particulièrement suivie dans le secteur financier en raison de ses partenariats avec des banques et institutions. Son cours a été très impacté par le procès SEC (2020-2023) qui s'est terminé en sa faveur partielle.`,
    factors: ['Partenariats bancaires et institutionnels', 'Régulation (procès SEC)', 'Adoption des paiements transfrontaliers', 'Distribution contrôlée par Ripple', 'Sentiment crypto global'],
    insights: ['Conçu pour remplacer SWIFT dans les paiements interbancaires', 'Procès SEC résolu partiellement en 2023', 'Pas de minage — distribution par Ripple Labs'],
    color: '#00aae4', bgColor: '#e0f7fe', darkBgColor: '#082f49',
    category: 'crypto', categoryLabel: 'Crypto',
    source: 'Marchés crypto', sourceUrl: 'https://finance.yahoo.com/quote/XRP-USD'
  },

  dax: {
    title: 'DAX',
    shortDescription: 'Indice boursier des 40 plus grandes entreprises allemandes cotées à Francfort. Baromètre de l\'économie européenne.',
    fullDescription: `Le DAX (Deutscher Aktienindex) regroupe les 40 plus grandes capitalisations boursières allemandes cotées à la Bourse de Francfort. Il est fortement exposé à l'industrie, l'automobile (Volkswagen, BMW, Mercedes), la chimie (BASF), l'assurance (Allianz) et les technologies. Sa performance reflète étroitement la santé de l'économie réelle européenne et allemande.`,
    importance: `Le DAX est le principal indicateur boursier de la zone euro avec le CAC 40. Très corrélé au cycle industriel mondial, il est sensible aux exportations allemandes (forte dépendance à la Chine), au prix de l'énergie et au cours de l'euro. À comparer systématiquement avec le CAC 40 et l'Euro Stoxx 50 pour une lecture européenne complète.`,
    factors: ['Santé de l\'industrie automobile allemande', 'Exportations vers la Chine', 'Prix de l\'énergie (gaz)', 'Taux BCE et euro', 'Commandes industrielles en zone euro'],
    insights: ['40 valeurs depuis 2021 (était 30)', 'Indice de performance (dividendes réinvestis)', 'SAP, Siemens, Allianz = top 3 pondérations', 'Très sensible aux tensions géopolitiques Russia/Ukraine'],
    color: '#f59e0b', bgColor: '#fffbeb', darkBgColor: '#451a03',
    category: 'stocks', categoryLabel: 'Actions',
    source: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/quote/%5EGDAXI'
  },

  ftse: {
    title: 'FTSE 100',
    shortDescription: 'Indice des 100 plus grandes entreprises du London Stock Exchange. Très exposé aux matières premières et à la finance.',
    fullDescription: `Le FTSE 100 (Financial Times Stock Exchange 100) regroupe les 100 plus grandes capitalisations cotées à Londres. Il est dominé par les secteurs pétrolier et gazier (Shell, BP), financier (HSBC, Barclays), pharmaceutique (AstraZeneca, GSK) et minier (Rio Tinto, Anglo American). La majorité des revenus des entreprises du FTSE 100 sont réalisés hors du Royaume-Uni.`,
    importance: `Le FTSE 100 est libellé en livres sterling, ce qui implique un effet de change pour les investisseurs européens. Sa forte exposition aux matières premières en fait un indicateur utile du cycle mondial des ressources. À comparer avec le DAX et le CAC 40 pour évaluer les divergences de dynamique entre économies européennes post-Brexit.`,
    factors: ['Cours du pétrole et des matières premières', 'Livre sterling (GBP/EUR)', 'Politique monétaire Bank of England', 'Brexit et accords commerciaux UK', 'Croissance des marchés émergents (expositions globales)'],
    insights: ['~75% des revenus réalisés à l\'international', 'Très sensible au prix du pétrole (Shell, BP = ~15%)', 'Impact fort du GBP/EUR pour un investisseur euro', 'Dividendes élevés historiquement (>3.5% de rendement)'],
    color: '#1d4ed8', bgColor: '#eff6ff', darkBgColor: '#1e3a5f',
    category: 'stocks', categoryLabel: 'Actions',
    source: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/quote/%5EFTSE'
  },

  nikkei: {
    title: 'Nikkei 225',
    shortDescription: 'Principal indice boursier japonais. Regroupe 225 grandes entreprises cotées à Tokyo, dont Toyota, Sony, SoftBank.',
    fullDescription: `Le Nikkei 225 est l'indice boursier de référence du Japon, calculé depuis 1950. Il regroupe 225 valeurs sélectionnées parmi les plus liquides de la Bourse de Tokyo (TSE). Il est fortement exposé aux secteurs industriel, technologique et automobile. Son évolution est très influencée par le yen (JPY) : un yen faible favorise les exportateurs japonais.`,
    importance: `Le Nikkei est l'indicateur clé pour suivre la troisième économie mondiale. Sa forte corrélation inverse avec le yen en fait un outil de lecture macro unique. La politique ultra-accommodante de la Banque du Japon (taux négatifs jusqu'en 2024) a longtemps maintenu des dynamiques atypiques. À suivre pour l'exposition Asie d'un portefeuille international.`,
    factors: ['Cours du yen (JPY/EUR)', 'Politique monétaire Banque du Japon (BoJ)', 'Exportations automobiles et électroniques', 'Demande chinoise', 'Interventions du gouvernement japonais (fonds de pension)'],
    insights: ['Indice pondéré par les prix (comme le Dow Jones)', 'Record historique dépassé en 2024 pour la 1ère fois depuis 1989', 'Toyota, Sony, SoftBank = top pondérations', 'Yen faible = Nikkei fort (corrélation forte)'],
    color: '#dc2626', bgColor: '#fef2f2', darkBgColor: '#450a0a',
    category: 'stocks', categoryLabel: 'Actions',
    source: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/quote/%5EN225'
  },

  gaz: {
    title: 'Gaz naturel',
    shortDescription: 'Prix du gaz naturel TTF (Title Transfer Facility, EUR/MWh). Référence européenne du gaz naturel.',
    fullDescription: `Le TTF (Title Transfer Facility) est la bourse de référence pour le gaz naturel en Europe, basée aux Pays-Bas. Son prix en EUR/MWh reflète les conditions d'offre et de demande du marché européen du gaz. Depuis la crise énergétique de 2022, il est devenu un indicateur macro-économique majeur en zone euro.`,
    importance: `Le prix du TTF influence directement l'inflation européenne, la compétitivité industrielle et les décisions de la BCE. Il est bien plus représentatif pour l'économie européenne que le Henry Hub américain.`,
    factors: ['Températures hivernales (demande de chauffage)', 'Niveaux de stockage en Europe', 'Importations de GNL', 'Géopolitique (Russie/Ukraine)', 'Transition énergétique et renouvelables'],
    insights: ['Prix en EUR/MWh (référence européenne TTF)', 'Pic historique en 2022 : >300 EUR/MWh (crise énergie)', 'Corrélation forte avec inflation européenne'],
    color: '#06b6d4', bgColor: '#ecfeff', darkBgColor: '#082f49',
    category: 'commodities', categoryLabel: 'Matières premières',
    source: 'OilPriceAPI (DUTCH_TTF_EUR)',
    sourceUrl: 'https://oilpriceapi.com'
  },
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
