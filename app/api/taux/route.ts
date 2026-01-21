
// app/api/taux/route.ts

export async function GET() {
  // TODO: remplace ces valeurs par tes vraies données si besoin
  const data = {
    asof: "21/01/2026",
    estr: 1.93,
    oat10: 3.54,
    cac5: 11.41,
    scpi5: 4.48
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Autorise l'accès depuis un fichier HTML ouvert en local (Origin: null)
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// (facultatif, mais propre) : répond au préflight CORS si le navigateur en envoie un
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
