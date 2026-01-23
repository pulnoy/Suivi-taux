
// app/api/taux/route.ts
// -------------------------------------------------------------
// Récupération des taux (API route Next.js / Vercel)
//
// - €STR : API officielle BCE (ECB Data Portal, SDMX-JSON)
//          Série: EST.B.EU000A2X2A25.WT (ISIN officiel €STR, composante WT)
//          Dernière observation : lastNObservations=1
//          Doc API SDMX : https://data.ecb.europa.eu/help/api/data
//          Détail €STR + horaire de publication (08:00 CET, jours TARGET2) :
//          https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/euro_short-term_rate/html/index.en.html
//
// - Fallback €STR (non institutionnel, à n'utiliser qu'en secours) : https://api.estr.dev/latest
//
// - OAT 10 ans : scraping simple de TradingEconomics (fragile par nature). À remplacer
//                par une source institutionnelle si disponible.
// -------------------------------------------------------------

import { NextResponse } from 'next/server'

// Désactive le cache ISR côté Vercel/Next pour avoir la valeur la plus fraîche.
export const revalidate = 0
export const dynamic = 'force-dynamic'

// -------- €STR : API BCE (officielle) ----------
async function fetchEstrFromECB(): Promise<{ value: number; date: string } | null> {
  const url =
    'https://data-api.ecb.europa.eu/service/data/EST/EST.B.EU000A2X2A25.WT?lastNObservations=1&format=sdmx-json'
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null

  const data = await res.json()

  // SDMX-JSON : data.dataSets[0].series[seriesKey].observations
  const dataSets = data?.dataSets
  const structure = data?.structure
  if (!Array.isArray(dataSets) || !structure) return null

  const seriesMap = dataSets[0]?.series
  const seriesKey = seriesMap ? Object.keys(seriesMap)[0] : undefined
  if (!seriesKey) return null

  const observations = seriesMap[seriesKey]?.observations
  if (!observations) return null

  const firstObsKey = Object.keys(observations)[0] // ex: "0"
  if (typeof firstObsKey === 'undefined') return null

  const val = observations[firstObsKey]?.[0] // valeur numérique
  const timeDim = structure?.dimensions?.observation?.find((d: any) => d.id === 'TIME_PERIOD')
  const dateIndex = Number(firstObsKey)
  const dateValue = timeDim?.values?.[dateIndex]?.id // "YYYY-MM-DD"

  if (typeof val === 'number' && typeof dateValue === 'string') {
    return { value: val, date: dateValue }
  }
  return null
}

// -------- €STR : Fallback communautaire (non officiel) ----------
async function fetchEstrFallback(): Promise<{ value: number; date: string } | null> {
  const res = await fetch('https://api.estr.dev/latest', { cache: 'no-store' })
  if (!res.ok) return null
  const j = await res.json()
  if (typeof j?.value === 'number' && typeof j?.date === 'string') {
    // { date: "YYYY-MM-DD", value: number }
    return { value: j.value, date: j.date }
  }
  return null
}

export async function GET() {
  try {
    // 1) €STR (BCE, puis fallback si nécessaire)
    let estr: number | null = null
    let asofEstr: string | null = null

    try {
      const bce = await fetchEstrFromECB()
      if (bce) {
        estr = Math.round(bce.value * 100) / 100 // 1.933 -> 1.93
        asofEstr = bce.date.split('-').reverse().join('/') // YYYY-MM-DD -> DD/MM/YYYY
      }
    } catch {
      // ignore
    }

    if (estr === null) {
      try {
        const fb = await fetchEstrFallback()
        if (fb) {
          estr = Math.round(fb.value * 100) / 100
          asofEstr = fb.date.split('-').reverse().join('/')
        }
      } catch {
        // ignore
      }
    }

    // 2) OAT 10 ans (scraping simple ; fragile par nature)
    const oat10 = await fetch(
      'https://fr.tradingeconomics.com/france/government-bond-yield',
      {
        cache: 'no-store',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; taux-fetch/1.0)' },
      }
    )
      .then(res => res.text())
      .then(html => {
        // Capture une forme "3,52 %" ; ajuste la regex si le site change
        const match = html.match(/(\d{1,2},\d{2})\s*%/)
        return match ? parseFloat(match[1].replace(',', '.')) : null
      })
      .catch(() => null)

    // 3) Autres valeurs (conservées telles quelles)
    const cac5 = 11.41
    const scpi5 = 4.48

    // 4) Date d'actualisation
    const asof = asofEstr ?? new Date().toLocaleDateString('fr-FR')

    return NextResponse.json({ estr, oat10, cac5, scpi5, asof })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des taux' },
      { status: 500 }
    )
  }
}
