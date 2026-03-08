# Changelog - Suivi-Taux

## [2.3.0] - 2026-03-08

### 🎨 Interface Plus Compacte

#### Header Repensé
- **Onglets intégrés au header** : "Tableau de bord" et "Timeline" déplacés à droite du titre "Suivi-Taux"
- **Layout optimisé** : Toggle élégant avec états visuels clairs (actif/inactif)
- **Responsive amélioré** : Labels masqués sur mobile, icônes toujours visibles

#### Espacements Réduits
- **Padding header** : Réduit de `py-4` à `py-2`
- **Marges contenu** : Réduites de `py-6` à `py-3`
- **Titre redondant supprimé** : "Tableau de bord - Comparez jusqu'à 5 indices" retiré car déjà présent dans la section sélection
- **Footer compact** : Informations condensées sur une seule ligne

#### Gains d'Espace
- **~100-150px gagnés** en hauteur pour le graphique
- Interface plus aérée et professionnelle

### 📊 Format des Dates Adaptatif (Axe X)

#### Problème Résolu
- Les dates étaient répétitives et peu lisibles : "janv. 26, janv. 26, janv. 26..."

#### Nouveau Format Intelligent
- **Court terme (1M, 3M)** : Format `jj/mm` (ex: 15/02, 22/02, 01/03)
- **Moyen terme (6M, 1A, YTD)** : Format `mm/aa` (ex: 02/26, 03/26, 04/26)
- **Long terme (5A, MAX)** : Format année uniquement (ex: 2020, 2021, 2022)

#### Espacement Optimisé
- **Intervalle automatique** : Calcul dynamique du nombre de labels (~8 max)
- **MinTickGap** : Espacement minimum de 30px entre labels
- **Brush aligné** : Même format de dates dans la zone de zoom

### 📈 Performances Annualisées Corrigées

#### Problème Identifié
- Certains consommateurs du fichier `taux.json` calculaient mal les performances
- Ex: CAC 40 affiché à 7993% au lieu de ~5-8% annualisé

#### Solution
- **Nouvelles propriétés** ajoutées dans `taux.json` pour les indices non-taux :
  ```json
  "performances": {
    "annualisee_1an": 8.5,
    "annualisee_3ans": 6.2,
    "annualisee_5ans": 5.7
  }
  ```
- **Formule correcte** : `(Vfinal/Vinitial)^(1/n) - 1`
- **Indices concernés** : CAC 40, S&P 500, Nasdaq, Euro Stoxx 50, MSCI World, Émergents, Or, Pétrole, Bitcoin, EUR/USD

#### Gestion des Données Insuffisantes
- Retourne `null` si moins de 50% de la période demandée est disponible
- Adapte automatiquement la période au données disponibles

### 🔧 Technique

#### Fichiers Modifiés
- `app/page.tsx` : Refonte du layout et header
- `components/enhanced-chart.tsx` : Format dates et intervalles
- `scripts/update-taux.mjs` : Calcul des performances annualisées

---

## [2.2.2] - 2026-02-22

### 🐛 Correction Bug Critique - Moyennes Mobiles

#### Problème
- **Erreur "Invariant failed"** : L'application plantait au clic sur "MM 50j" ou "MM 200j"
- **Cause identifiée** : 
  - Les lignes de moyennes mobiles n'avaient pas de `yAxisId` en mode dual-axis
  - Pas de vérification si assez de données pour calculer les MM
  - Valeurs `undefined` passées à Recharts causant le crash

#### Solution
- **yAxisId ajouté** : Les lignes MM utilisent maintenant le même axe que leur indice parent
- **Vérifications de sécurité** : 
  - Contrôle du nombre minimum de points de données (50 ou 200)
  - Filtrage des valeurs `undefined`/`null`/`NaN` avant calcul
  - Calcul de moyenne même avec données partielles (min 50% des valeurs requises)
- **Désactivation intelligente** : Options MM grisées si pas assez de données

### ✨ Nouvelles Fonctionnalités - Tooltips Explicatifs

#### Tooltips pour Moyennes Mobiles
- **Icône ℹ️ cliquable** à côté de chaque option MM 50j et MM 200j
- **MM 50j** : "Moyenne Mobile 50 jours : Lisse les variations à court terme et identifie la tendance récente. Utile pour détecter les changements de direction à moyen terme."
- **MM 200j** : "Moyenne Mobile 200 jours : Lisse les variations à long terme et identifie la tendance de fond. Souvent utilisée comme support/résistance majeur. Un indice au-dessus de sa MM 200j est considéré en tendance haussière."
- **Avertissement contextuel** : Si pas assez de données, le tooltip l'indique

#### Message Contextuel
- **Bandeau explicatif** quand les MM sont activées : "Les moyennes mobiles lissent les variations et aident à identifier les tendances."
- **Texte adaptatif** selon les MM activées (50j seule, 200j seule, ou les deux)

### 🎨 Améliorations UX

#### Légende Améliorée
- **Distinction visuelle claire** entre :
  - Ligne continue = Valeur réelle
  - Pointillés courts = MM 50 jours
  - Pointillés longs = MM 200 jours
- **Opacité différenciée** : MM 50j à 70%, MM 200j à 50% pour ne pas surcharger

#### Tooltip du Graphique
- **Valeurs MM incluses** dans le tooltip au survol
- **Format hiérarchique** : Valeur principale puis MM indentées dessous

#### États Désactivés
- **Options grisées** si pas assez de données
- **Message explicite** : "⚠️ Pas assez de données (X points, Y requis)"

### 📁 Fichiers Modifiés

```
components/enhanced-chart.tsx   # Correction bug + tooltips + UX
CHANGELOG.md                    # Documentation v2.2.2
```

---

## [2.2.1] - 2026-02-22

### 🔧 Corrections

#### 1. Tooltip pour le mode "Absolu"
- **Ajout d'un tooltip explicatif** sur le bouton "Absolu" (pour les taux uniquement)
- **Texte** : "Affiche les valeurs réelles des indices (ex: CAC 40 = 7500 points). Utile pour comparer des indices de même nature."
- **Style cohérent** avec les tooltips existants de "Valeurs" et "Base 100"

#### 2. Aucune présélection au lancement
- **Suppression de la présélection** automatique des indices OAT et CAC 40 au démarrage
- **Tableau vide au chargement** : L'utilisateur doit manuellement sélectionner les indices
- **Message d'invite** : "Sélectionnez au moins 2 indices pour commencer la comparaison"

#### 3. Retrait des projections en pointillés
- **Suppression complète** de la fonctionnalité de projection en pointillés
- **Comportement simplifié** : Les lignes commencent/s'arrêtent aux dates où les données sont disponibles
- **Suppression de la note** : "Les lignes pointillées représentent des projections..."
- **Code allégé** : Retrait de toute la logique de détection et d'affichage des projections

#### 4. Inflation France au lieu de Zone Euro
- **Nouvelle source** : `FRACPIALLMINMEI` (OECD Consumer Price Index France) au lieu de `CP0000FRM086NEST` (IPCH Zone Euro)
- **Transformation automatique** : Variation sur 1 an glissant via le paramètre `units=pc1`
- **Titre mis à jour** : "Inflation France" au lieu de "Inflation (1 an)"
- **Description corrigée** : "Indice des Prix à la Consommation (IPC) en France. Mesure l'évolution des prix sur 1 an glissant (source: INSEE/OECD)."

### 📁 Fichiers Modifiés

```
components/comparator.tsx        # Tooltip Absolu + présélection vide
components/enhanced-chart.tsx    # Retrait projections + message d'invite
app/page.tsx                     # Présélection vide []
scripts/update-taux.mjs          # Inflation France (FRACPIALLMINMEI)
lib/educational-data.ts          # Description Inflation France
CHANGELOG.md                     # Documentation v2.2.1
```

---

## [2.2.0] - 2026-02-22

### 🆕 Nouvelles Fonctionnalités

#### Simplification de l'Interface
- **Suppression de l'onglet "Tableau de bord"** : L'ancienne vue avec les tuiles d'indices a été retirée
- **Renommage** : L'onglet "Comparateur" devient "Tableau de bord"
- **Interface épurée** : Seuls 2 onglets restent (Tableau de bord + Timeline Crises)
- **Texte simplifié** : "Comparez jusqu'à 5 indices"

#### Tooltips Explicatifs
- **Pour chaque indice** : Descriptions détaillées au survol dans le sélecteur
  - OAT 10 ans, Inflation (HICP), €STR, CAC 40, CAC Mid 60, Euro Stoxx 50
  - S&P 500, Nasdaq 100, MSCI World, Marchés Émergents
  - EUR/USD, SCPI, Or, Pétrole (WTI), Bitcoin
- **Pour les indicateurs statistiques** (avec soulignement pointillé) :
  - Rendement Total : "Performance totale sur la période sélectionnée"
  - Rendement Annualisé : "Performance moyenne par an, permet de comparer des périodes différentes"
  - Volatilité : "Écart-type des rendements, mesure le risque"
  - Maximum Drawdown : "Plus forte baisse depuis un sommet"
  - Ratio de Sharpe : "Rendement ajusté du risque"

#### Projection en Pointillés pour Données Manquantes
- **Détection automatique** : Quand les indices n'ont pas le même historique disponible
- **Lignes pointillées** : Projection horizontale des valeurs manquantes
- **Note explicative** : "Les lignes pointillées représentent des projections et ne sont pas incluses dans les statistiques"
- **Clarté visuelle** : Distinction entre données réelles (ligne continue) et projections (pointillés)

### 🔧 Améliorations

#### Fraîcheur des Données
- **Mise à jour quotidienne améliorée** : Ajout de données quotidiennes récentes en complément des données hebdomadaires
- **Yahoo Finance** : Récupération des 30 derniers jours en données quotidiennes pour avoir les dernières valeurs
- **SCPI** : Ajout de l'estimation 2026 (4.58%)

### 📁 Fichiers Modifiés

```
app/page.tsx                     # Interface simplifiée (1 onglet supprimé)
components/comparator.tsx        # Tooltips indices + statistiques
components/enhanced-chart.tsx    # Projections en pointillés
lib/educational-data.ts          # Descriptions des indices enrichies
scripts/update-taux.mjs          # Données quotidiennes récentes + SCPI 2026
CHANGELOG.md                     # Documentation v2.2.0
```

---

## [2.1.1] - 2026-02-21

### 🐛 Correction Critique - Historique Limité

#### Problème
- Le bouton "Max" dans le graphique n'affichait que 2 ans d'historique au lieu de 20+ ans
- Les données Yahoo Finance étaient récupérées avec `range=max` mais Yahoo renvoyait des données mensuelles limitées

#### Solution
- **Yahoo Finance** : Utilisation de `period1` et `period2` avec timestamps Unix explicites
  - `period1=946684800` (2000-01-01)
  - `interval=1wk` pour des données hebdomadaires sur 20+ ans
- **Fallback intelligent** : Pour les ETF récents (URTH, EEM), fallback sur données quotidiennes échantillonnées
- **Données FRED** : Fallback sur données existantes si `FRED_API_KEY` non disponible

#### Résultat
| Indice | Avant | Après |
|--------|-------|-------|
| CAC 40 | 2 ans | **27 ans** (depuis 1999) |
| S&P 500 | 2 ans | **26 ans** (depuis 2000) |
| Nasdaq | 2 ans | **26 ans** (depuis 2000) |
| Or | 2 ans | **26 ans** (depuis 2000) |
| EUR/USD | 2 ans | **23 ans** (depuis 2003) |
| Bitcoin | 2 ans | **12 ans** (depuis 2014) |

#### Note
Pour actualiser les données FRED (OAT, Inflation, €STR), configurez la variable d'environnement `FRED_API_KEY`.
Clé gratuite disponible sur https://fred.stlouisfed.org/docs/api/api_key.html

---

## [2.1.0] - 2026-02-21

### 🆕 Nouvelles Fonctionnalités

#### Timeline des Crises Financières
- **Nouvelle section** remplaçant l'analyse de corrélation
- **7 crises majeures documentées** : Bulle Internet (2000), Subprimes (2008), Dette européenne (2010-2012), Marchés émergents (2015), COVID-19 (2020), Inflation/Ukraine (2022), Crise bancaire 2023
- **Interface interactive** : Points cliquables avec détails dépliables
- **Impacts chiffrés** : Variations des principaux indices pour chaque crise
- **Code couleur** : Gravité (Critique, Majeur, Modéré)
- **Design responsive** : Timeline verticale avec points de repère

#### Aide au Choix Valeur Absolue vs Base 100
- **Présélection automatique intelligente** :
  - Base 100 automatique si catégories différentes
  - Base 100 obligatoire si échelles incompatibles (ex: Bitcoin + Inflation)
  - Valeur absolue si indices de même type
- **Messages contextuels** :
  - ✓ Vert : Indices compatibles, valeur absolue recommandée
  - 💡 Jaune : Catégories différentes, Base 100 conseillée
  - ⚠️ Rouge : Échelles incompatibles, Base 100 obligatoire
- **Tooltips d'aide** : Explication des modes au survol
- **Icône "?"** avec aide complète

#### Historiques Maximisés
- **FRED API** : Données depuis 2000 (vs 2020 avant)
- **Yahoo Finance** : Range "max" pour 10-25 ans d'historique
- **SCPI** : Historique étendu depuis 2000
- **Objectif** : Comparaisons long terme pertinentes

### 🔧 Corrections

#### Tooltips du Graphique
- **Affichage systématique** de TOUS les indices visibles
- **"N/A" affiché** pour les valeurs manquantes
- **Plus de valeurs invisibles** au survol

### 🗑️ Suppressions

- **Section Corrélation** : Retirée (scatter plot et heatmap)
- **Composant correlation-view.tsx** : Supprimé
- **Onglet "Corrélations"** : Remplacé par "Timeline Crises"

### 🎨 Modifications UI

- **Footer** : Texte simplifié "Gillian Noësen"
- **Navigation** : Nouvel onglet "Timeline Crises" avec icône horloge

---

## [2.0.0] - 2026-02-21

### 🎨 Refonte Visuelle Complète

#### Nouveau Design
- **Mode Sombre/Clair** : Toggle intégré avec support du système
- **Design System Cohérent** : Variables CSS pour les couleurs, espacements et animations
- **Typographie Professionnelle** : Police Inter optimisée pour la lisibilité financière
- **Animations Fluides** : Transitions douces et micro-interactions
- **Header Sticky** : Navigation toujours accessible avec effet glassmorphism

#### Tuiles d'Indices Améliorées
- **Mini-graphiques Sparkline** : Évolution sur 30 jours en un coup d'œil
- **Variations en %** : Affichage jour (1J) et mois (1M) avec code couleur
- **Badges de Catégorie** : Identification visuelle par type (Taux, Actions, Devises, etc.)
- **Icônes de Tendance** : Flèches haut/bas/stable
- **Hover Effects** : Élévation et ombres au survol
- **États de Sélection** : Feedback visuel clair

---

### 📊 Comparateur d'Indices Avancé

#### Sélection de Période
- **Boutons Rapides** : 1M, 3M, 6M, 1A, 5A, YTD, Max
- **Sélecteur de Dates Personnalisé** : Calendrier avec sélection de plage

#### Sélection Multiple
- **Jusqu'à 5 indices** simultanément
- **Badges colorés** pour identification rapide
- **Désélection facile** en cliquant sur les badges

#### Tableau de Statistiques Comparatives
| Métrique | Description |
|----------|-------------|
| Rendement Total | Performance sur la période |
| Rendement Annualisé | Performance ramenée à l'année |
| Volatilité | Écart-type annualisé |
| Max Drawdown | Perte maximale depuis un pic |
| Sharpe Ratio | Rendement ajusté du risque |

#### Matrice de Corrélation
- **Heatmap colorée** : Rouge (négatif) → Vert (positif)
- **Valeurs numériques** : Coefficients de -1 à +1
- **Période ajustable** : Corrélation dynamique selon la période sélectionnée

---

### 🔗 Visualisation de Corrélation

#### Matrice de Corrélation Globale
- **Tous les indices** : Vue d'ensemble des relations
- **Code couleur intuitif** : Intensité proportionnelle à la corrélation
- **Tooltips** : Détails au survol

#### Scatter Plot Interactif
- **Sélection d'axes** : Choisir les 2 indices à comparer
- **Nuage de points** : Visualisation des rendements
- **Régression linéaire** : Ligne de tendance calculée
- **Statistiques** :
  - Coefficient de corrélation
  - R² (coefficient de détermination)

---

### 📈 Améliorations des Graphiques

#### Nouvelles Fonctionnalités
- **Zoom & Pan** : Brush intégré pour navigation dans l'historique
- **Export PNG** : Capture du graphique en image haute résolution
- **Export CSV** : Téléchargement des données brutes
- **Moyennes Mobiles** : MM 50 jours et MM 200 jours optionnelles

#### Modes d'Affichage
- **Valeurs Réelles** : Échelles propres par courbe
- **Comparaison Absolue** : Échelle commune (taux uniquement)
- **Base 100** : Évolution normalisée pour comparaison

#### Améliorations UX
- **Tooltips enrichis** : Date + valeur + variation
- **Légende interactive** : Cliquer pour retirer une courbe
- **Axes dynamiques** : Dual-axis pour 2 indices de natures différentes

---

### 📚 Fonctionnalités Éducatives

#### Modal d'Information par Indice
- **Description complète** : Qu'est-ce que cet indice ?
- **Importance** : Pourquoi le suivre ?
- **Facteurs d'influence** : Quelles variables l'impactent ?
- **Points clés** : À retenir pour les clients
- **Source** : Lien vers la source officielle

#### Contenu Pédagogique Intégré
- 15 indices documentés avec explications détaillées
- Catégorisation claire (Taux, Actions, Devises, Matières premières, Crypto, Immobilier)
- Contexte pour chaque métrique affichée

---

### 🔧 Améliorations Techniques

#### Performance
- **Skeleton Loading** : États de chargement élégants
- **Lazy Loading** : Chargement différé des composants
- **Memoization** : Optimisation des re-rendus React
- **Compression** : Support Gzip/Brotli natif Vercel

#### Accessibilité
- **Dark Mode** : Respect des préférences système
- **Contraste** : Ratios WCAG AA respectés
- **Navigation Clavier** : Tous les éléments accessibles
- **ARIA Labels** : Attributs pour lecteurs d'écran

#### SEO
- **Métadonnées enrichies** : Title, description, keywords
- **Open Graph** : Aperçus sociaux optimisés
- **Twitter Cards** : Support intégré
- **Sitemap** : robots.txt configuré

---

### 📁 Fichiers Modifiés

#### Nouveaux Fichiers
```
components/
├── sparkline.tsx           # Mini-graphiques pour tuiles
├── index-card.tsx          # Tuile d'indice améliorée
├── enhanced-chart.tsx      # Graphique avancé avec export
├── comparator.tsx          # Comparateur d'indices complet
├── correlation-view.tsx    # Heatmap + Scatter plot
├── index-info-modal.tsx    # Modal éducatif
└── theme-toggle.tsx        # Bouton mode sombre/clair

lib/
├── financial-utils.ts      # Calculs financiers (stats, corrélation)
└── educational-data.ts     # Contenu pédagogique des indices
```

#### Fichiers Modifiés
```
app/
├── page.tsx                # Page principale refaite
├── layout.tsx              # Support dark mode
└── globals.css             # Variables CSS + animations

tailwind.config.ts          # Nouvelles animations
package.json                # html2canvas ajouté
```

#### Fichiers Préservés (⚠️ Non modifiés)
```
app/api/taux/route.ts       # ✅ ENDPOINT CRITIQUE INCHANGÉ
public/taux.json            # ✅ DONNÉES INCHANGÉES
scripts/update-taux.mjs     # ✅ SCRIPT MISE À JOUR INCHANGÉ
.github/workflows/          # ✅ GITHUB ACTIONS INCHANGÉES
```

---

### 🚀 Prochaines Étapes Suggérées

1. **Alertes Personnalisées** : Notifications si un indice dépasse un seuil
2. **PWA** : Installation sur mobile comme application native
3. **Widget Embedable** : Pour intégration sur autres sites
4. **Rapports PDF** : Génération automatique de synthèses mensuelles
5. **API Documentée** : OpenAPI/Swagger pour développeurs

---

### 📝 Notes de Migration

- **Aucune modification de l'API** : L'endpoint `/api/taux` reste compatible
- **Aucune modification des données** : Le fichier `taux.json` est inchangé
- **Rétro-compatible** : Les favoris existants sont préservés (LocalStorage)

---

**Rapport de refonte généré le 21 février 2026**
