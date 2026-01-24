// app/api/taux/route.ts
// Mis à jour automatiquement par GitHub Actions
// Dernière mise à jour (Europe/Paris): 24/01/2026 - 2026-01-24T12:06:55

export async function GET() {
  const data = {
    "asof": "24/01/2026",
    "estr": 1.93,
    "oat10": 3.56,
    "cac5": 8.62,
    "scpi5": 4.48,
    "inflation": 2
};

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
