import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Données historiques simulées pour les 30 derniers jours
function generateHistoricalData(
  type: string,
  baseValue: number,
  volatility: number,
  days: number = 30
): { value: number; date: Date }[] {
  const data: { value: number; date: Date }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Générer une variation aléatoire autour de la valeur de base
    const variation = (Math.random() - 0.5) * 2 * volatility;
    const value = Math.round((baseValue + variation) * 100) / 100;

    data.push({ value: Math.max(0, value), date });
  }

  return data;
}

async function main() {
  console.log('🌱 Début du seeding de la base de données...');

  // Supprimer les données existantes
  await prisma.financialRate.deleteMany({});
  await prisma.rateMetadata.deleteMany({});

  // Générer les données historiques pour chaque type de taux
  const rateConfigs = [
    { type: 'ESTR', baseValue: 1.93, volatility: 0.05, description: 'Euro Short-Term Rate', source: 'API BCE' },
    { type: 'OAT10', baseValue: 3.52, volatility: 0.15, description: 'OAT 10 ans France', source: 'FRED API' },
    { type: 'CAC40', baseValue: 8.00, volatility: 0.30, description: 'CAC40 5 ans annualisé', source: 'Alpha Vantage' },
    { type: 'SCPI', baseValue: 4.58, volatility: 0.10, description: 'SCPI taux distribution moyen', source: 'ASPIM-IEIF' },
    { type: 'INFLATION', baseValue: 2.00, volatility: 0.20, description: 'Inflation France IPC', source: 'FRED API' },
  ];

  for (const config of rateConfigs) {
    console.log(`📊 Création des données pour ${config.type}...`);

    const historicalData = generateHistoricalData(
      config.type,
      config.baseValue,
      config.volatility
    );

    // Insérer les données historiques
    for (const data of historicalData) {
      await prisma.financialRate.create({
        data: {
          type: config.type,
          value: data.value,
          date: data.date,
        },
      });
    }

    // Créer les métadonnées
    await prisma.rateMetadata.create({
      data: {
        type: config.type,
        lastUpdate: new Date(),
        description: config.description,
        source: config.source,
      },
    });

    console.log(`✅ ${config.type}: ${historicalData.length} enregistrements créés`);
  }

  console.log('\n🎉 Seeding terminé avec succès!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
