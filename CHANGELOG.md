# Changelog - Suivi-Taux

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
