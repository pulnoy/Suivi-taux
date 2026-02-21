# Instructions de Déploiement - Suivi-Taux v2.0

## 📋 Prérequis

- Node.js 18+ (recommandé: 20.x LTS)
- npm ou yarn
- Compte Vercel (pour déploiement production)
- Compte GitHub (pour CI/CD)

---

## 🚀 Déploiement Local

### 1. Installation des dépendances

```bash
cd Suivi-taux
npm install --legacy-peer-deps
```

> **Note**: L'option `--legacy-peer-deps` est nécessaire pour résoudre certains conflits de versions ESLint.

### 2. Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
# URL du site (pour métadonnées)
NEXTAUTH_URL=http://localhost:3000

# Clés API (si vous modifiez le script de mise à jour)
FRED_API_KEY=votre_cle_fred
```

### 3. Lancement en développement

```bash
npm run dev
```

Le site sera accessible sur `http://localhost:3000`

### 4. Build de production local

```bash
npm run build
npm run start
```

---

## ☁️ Déploiement sur Vercel

### Option A : Déploiement Automatique (Recommandé)

1. **Connecter le repository GitHub à Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - Importer le projet depuis GitHub
   - Sélectionner le repository `pulnoy/Suivi-taux`

2. **Configuration Vercel**
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install --legacy-peer-deps`

3. **Variables d'environnement**
   - `NEXTAUTH_URL` : `https://suivi-taux.vercel.app`

4. **Déployer**
   - Vercel déploiera automatiquement à chaque push sur `main`

### Option B : Déploiement Manuel

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

---

## 🔄 Système de Mise à Jour Automatique

### GitHub Actions (déjà configuré)

Le workflow `.github/workflows/update-taux.yml` s'exécute :
- **Quotidiennement** à 09h00 (heure de Paris)
- **Manuellement** via l'interface GitHub

### Secrets GitHub requis

Dans Settings → Secrets → Actions :

| Secret | Description |
|--------|-------------|
| `FRED_API_KEY` | Clé API FRED (Federal Reserve) |

### Vérifier l'exécution

1. Aller dans Actions → update-taux
2. Vérifier le statut du dernier run
3. En cas d'erreur, consulter les logs

---

## 📁 Structure des Fichiers Critiques

### ⚠️ NE PAS MODIFIER

| Fichier | Raison |
|---------|--------|
| `app/api/taux/route.ts` | Endpoint utilisé par site externe |
| `public/taux.json` | Source de données unique |
| `scripts/update-taux.mjs` | Script de mise à jour automatique |
| `.github/workflows/update-taux.yml` | Automatisation quotidienne |

### ✅ Peut être modifié

| Fichier | Usage |
|---------|-------|
| `app/page.tsx` | Page principale |
| `components/*` | Composants UI |
| `lib/*` | Utilitaires et données |
| `app/globals.css` | Styles globaux |
| `tailwind.config.ts` | Configuration Tailwind |

---

## 🧪 Tests de Validation

### Avant déploiement, vérifier :

1. **Build sans erreur**
   ```bash
   npm run build
   ```

2. **Lint sans erreur critique**
   ```bash
   npm run lint
   ```

3. **API fonctionnelle**
   ```bash
   curl http://localhost:3000/api/taux | jq '.date_mise_a_jour'
   ```

4. **Données chargées**
   - Ouvrir `http://localhost:3000`
   - Vérifier que les tuiles s'affichent
   - Vérifier que les graphiques fonctionnent

5. **Mode sombre**
   - Cliquer sur le toggle de thème
   - Vérifier que tout reste lisible

6. **Responsive**
   - Tester sur mobile (DevTools)
   - Vérifier le menu et les tuiles

---

## 🔧 Résolution des Problèmes

### Erreur : "ERESOLVE unable to resolve dependency tree"

```bash
npm install --legacy-peer-deps
```

### Erreur : "Module not found: html2canvas"

```bash
npm install html2canvas@1.4.1 --legacy-peer-deps
```

### Build échoue sur Vercel

1. Vérifier les logs Vercel
2. Ajouter dans `vercel.json` :
   ```json
   {
     "installCommand": "npm install --legacy-peer-deps"
   }
   ```

### Données non mises à jour

1. Vérifier le workflow GitHub Actions
2. Vérifier la clé `FRED_API_KEY` dans les secrets
3. Lancer manuellement : Actions → update-taux → Run workflow

---

## 📊 Monitoring

### Vercel Analytics (optionnel)

1. Activer dans Vercel Dashboard → Analytics
2. Installer le package :
   ```bash
   npm install @vercel/analytics
   ```
3. Ajouter dans `layout.tsx` :
   ```tsx
   import { Analytics } from '@vercel/analytics/react';
   // ...
   <Analytics />
   ```

### Logs

- **Vercel** : Dashboard → Deployments → Logs
- **GitHub Actions** : Actions → Workflow runs → Logs

---

## 📝 Checklist de Déploiement

- [ ] Build local réussi
- [ ] Tests manuels passés
- [ ] Variables d'environnement configurées
- [ ] Secrets GitHub configurés
- [ ] Déploiement Vercel réussi
- [ ] API `/api/taux` répond correctement
- [ ] Mise à jour automatique fonctionne
- [ ] Mode sombre fonctionne
- [ ] Export PNG/CSV fonctionne

---

## 📞 Support

En cas de problème :

1. Consulter les logs Vercel/GitHub Actions
2. Vérifier le CHANGELOG.md pour les changements récents
3. Ouvrir une issue sur GitHub si nécessaire

---

**Document mis à jour le 21 février 2026**
