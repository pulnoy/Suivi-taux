# Modifications v2.1.0 - Suivi-Taux

**Date :** 21 février 2026  
**Branche :** feature/refonte-complete-v2  
**PR :** #1

---

## 📋 Résumé des Modifications

Ce document détaille les 6 modifications majeures effectuées sur la branche `feature/refonte-complete-v2`.

---

## 1. ✅ Modification du Footer

**Fichier modifié :** `app/page.tsx`

**Avant :**
```
© {new Date().getFullYear()} Suivi-Taux — Outil pédagogique pour conseillers financiers
```

**Après :**
```
Gillian Noësen
```

---

## 2. ✅ Suppression de la Section Corrélation

**Fichiers modifiés :**
- `app/page.tsx` - Retrait des imports et du TabsContent
- `components/correlation-view.tsx` - **SUPPRIMÉ**

**Actions effectuées :**
- Retrait de l'import `CorrelationView`
- Suppression de l'onglet "Corrélations" dans la navigation
- Remplacement par "Timeline Crises"
- Suppression du fichier `correlation-view.tsx`

**Note :** La matrice de corrélation du Comparateur reste disponible.

---

## 3. ✅ Historiques des Taux Maximisés (10-20 ans)

**Fichier modifié :** `scripts/update-taux.mjs`

### Modifications FRED API
- Ajout de `HISTORY_START_DATE = '2000-01-01'`
- URL modifiée : `observation_start=${HISTORY_START_DATE}`
- **Résultat :** ~25 ans de données au lieu de 4-5 ans

### Modifications Yahoo Finance
- Paramètre `range=2y` → `range=max`
- Filtrage des données depuis 2000
- **Résultat :** 10-25 ans d'historique selon les indices

### Enrichissement SCPI
- Ajout de données historiques depuis 2000
- 26 points de données annuels (vs 5 avant)

---

## 4. ✅ Correction des Tooltips du Graphique

**Fichier modifié :** `components/enhanced-chart.tsx`

### Problème identifié
Les tooltips n'affichaient que les indices présents dans le `payload` Recharts, excluant les indices sans données à l'instant T.

### Solution implémentée
- Parcours de TOUS les `datasets` au lieu du `payload`
- Recherche de la valeur dans `chartData` pour chaque indice
- Affichage "N/A" si valeur manquante

**Code clé :**
```tsx
{datasets.map((ds) => {
  const value = dataPoint?.[ds.key];
  const hasValue = value !== undefined && value !== null;
  return (
    <div key={ds.key}>
      {hasValue ? formatNumber(value, 2) : <span className="italic">N/A</span>}
    </div>
  );
})}
```

---

## 5. ✅ Timeline des Crises Financières

**Nouveau fichier :** `components/timeline-crises.tsx`

### Crises documentées (7)

| Période | Titre | Gravité |
|---------|-------|---------|
| 2000-2002 | Bulle Internet (Dot-com) | Critique |
| 2007-2009 | Crise des Subprimes | Critique |
| 2010-2012 | Crise de la Dette Européenne | Majeur |
| 2015-2016 | Crise des Marchés Émergents | Modéré |
| 2020 | Krach COVID-19 | Critique |
| 2022 | Inflation & Guerre Ukraine | Majeur |
| 2023 | Crise Bancaire (SVB, Credit Suisse) | Modéré |

### Fonctionnalités
- Timeline verticale interactive
- Collapsibles pour détails
- Impacts chiffrés par indice (avec code couleur vert/rouge)
- Faits marquants par crise
- Légende de gravité colorée
- Design responsive

---

## 6. ✅ Aide au Choix Valeur Absolue vs Base 100

**Fichier modifié :** `components/comparator.tsx`

### A. Présélection Automatique Intelligente

**Logique implémentée :**
```
Si tous les indices sont de même catégorie → Valeur absolue
Si catégories différentes → Base 100
Si échelles très différentes (ratio > 100) → Base 100 OBLIGATOIRE
Si Bitcoin + indices faibles valeurs → Base 100 OBLIGATOIRE
```

**Code clé :** Fonction `analyzeModeCompatibility()`

### B. Messages d'Aide Contextuels

| Situation | Message | Couleur |
|-----------|---------|---------|
| Même catégorie | "✓ Tous les indices sont des [type]. Valeur absolue OK." | Vert |
| Catégories mixtes | "💡 Catégories différentes. Base 100 conseillée." | Jaune |
| Incompatible | "⚠️ Échelles très différentes. Base 100 obligatoire." | Rouge |

### C. Filtrage Intelligent
- Bouton "Valeurs" désactivé si échelles incompatibles
- Flag `forceBase100` bloque le mode valeur absolue

### D. Tooltip d'Aide
- Icône "?" à côté des boutons de mode
- Explications détaillées au survol de chaque bouton
- Contenu :
  - **Valeur absolue :** "Affiche les valeurs réelles (ex: CAC 40 = 7500 pts)"
  - **Base 100 :** "Normalise à 100 pour comparer les performances relatives"

---

## 📁 Récapitulatif des Fichiers

### Fichiers Modifiés
| Fichier | Type de modification |
|---------|---------------------|
| `app/page.tsx` | Footer + imports + tabs |
| `components/comparator.tsx` | Aide au choix mode |
| `components/enhanced-chart.tsx` | Tooltip fix |
| `scripts/update-taux.mjs` | Historiques étendus |
| `CHANGELOG.md` | Ajout v2.1.0 |

### Nouveaux Fichiers
| Fichier | Description |
|---------|-------------|
| `components/timeline-crises.tsx` | Timeline des crises |
| `MODIFICATIONS_V2.md` | Ce document |

### Fichiers Supprimés
| Fichier | Raison |
|---------|--------|
| `components/correlation-view.tsx` | Remplacé par Timeline |

### Fichiers Préservés (⚠️ NON MODIFIÉS)
| Fichier | Statut |
|---------|--------|
| `app/api/taux/route.ts` | ✅ INTACT |
| `app/api/rates/route.ts` | ✅ INTACT |
| `app/api/refresh/route.ts` | ✅ INTACT |

---

## 🧪 Tests Recommandés

1. **Footer** : Vérifier l'affichage "Gillian Noësen"
2. **Timeline** : Cliquer sur chaque crise, vérifier les détails
3. **Tooltips** : Sélectionner 3+ indices, survoler le graphique
4. **Aide mode** : 
   - Sélectionner CAC 40 + S&P 500 → Message vert
   - Sélectionner CAC 40 + Bitcoin → Message rouge + bouton désactivé
5. **Historiques** : Exécuter le script et vérifier les dates

---

## 🚀 Commandes de Test

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Tester le script de mise à jour (nécessite FRED_API_KEY)
FRED_API_KEY=xxx node scripts/update-taux.mjs

# Vérifier le résultat
cat public/taux.json | head -50
```

---

**Document généré le 21 février 2026**
